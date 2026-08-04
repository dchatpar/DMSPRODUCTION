import { NextRequest, NextResponse } from "next/server";
import {
    chatCompletion,
    streamChatCompletion,
    parseSseContentStream,
    type MiniMaxMessage,
    MiniMaxNotConfiguredError,
} from "@/src/lib/ai/minimax";
import { DESK_SYSTEM, requireAiCaller, aiNotConfiguredResponse } from "@/src/lib/ai/guard";
import { COPILOT_TOOL_DEFS, runCopilotTool } from "@/src/lib/ai/tools";

const MAX_TOOL_ROUNDS = 4;

/**
 * POST /api/ai/copilot
 * Body: { messages: {role, content}[], stream?: boolean }
 * Streaming: text/plain content deltas after tool loop resolves.
 */
export async function POST(req: NextRequest) {
    try {
        const gate = await requireAiCaller(req);
        if (!gate.ok) return gate.response;

        const body = await req.json().catch(() => ({}));
        const incoming = Array.isArray(body.messages) ? body.messages : [];
        const wantStream = body.stream !== false;

        const userMessages: MiniMaxMessage[] = incoming
            .filter(
                (m: { role?: string; content?: unknown }) =>
                    m &&
                    (m.role === "user" || m.role === "assistant") &&
                    typeof m.content === "string"
            )
            .slice(-12)
            .map((m: { role: "user" | "assistant"; content: string }) => ({
                role: m.role,
                content: m.content.slice(0, 8000),
            }));

        if (userMessages.length === 0) {
            return NextResponse.json(
                { error: "messages required" },
                { status: 400 }
            );
        }

        const messages: MiniMaxMessage[] = [
            { role: "system", content: DESK_SYSTEM },
            ...userMessages,
        ];

        // Tool-calling loop (non-stream), then optional final stream for answer.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
            const result = await chatCompletion({
                messages,
                tools: COPILOT_TOOL_DEFS,
                temperature: 0.3,
                max_completion_tokens: 2048,
            });

            if (!result.tool_calls.length) {
                if (!wantStream) {
                    return NextResponse.json({
                        data: { content: result.content, model: "MiniMax-M2.7" },
                    });
                }

                // Stream a short final pass for UX (or echo content if empty tools path)
                if (result.content) {
                    const encoder = new TextEncoder();
                    const stream = new ReadableStream({
                        start(controller) {
                            controller.enqueue(encoder.encode(result.content));
                            controller.close();
                        },
                    });
                    return new NextResponse(stream, {
                        headers: {
                            "Content-Type": "text/plain; charset=utf-8",
                            "Cache-Control": "no-store",
                            "X-Flash-AI-Mode": "buffered",
                        },
                    });
                }

                const upstream = await streamChatCompletion({
                    messages,
                    temperature: 0.3,
                });
                if (!upstream.body) {
                    return NextResponse.json(
                        { error: "Empty stream from MiniMax" },
                        { status: 502 }
                    );
                }
                return new NextResponse(parseSseContentStream(upstream.body), {
                    headers: {
                        "Content-Type": "text/plain; charset=utf-8",
                        "Cache-Control": "no-store",
                        "X-Flash-AI-Mode": "stream",
                    },
                });
            }

            messages.push({
                role: "assistant",
                content: result.content || null,
                tool_calls: result.tool_calls,
            });

            for (const call of result.tool_calls) {
                const toolResult = await runCopilotTool(
                    gate.profile,
                    call.function.name,
                    call.function.arguments || "{}"
                );
                messages.push({
                    role: "tool",
                    tool_call_id: call.id,
                    name: call.function.name,
                    content: JSON.stringify(toolResult),
                });
            }
        }

        return NextResponse.json(
            { error: "Tool loop exceeded — try a narrower question." },
            { status: 504 }
        );
    } catch (err) {
        if (err instanceof MiniMaxNotConfiguredError) {
            return aiNotConfiguredResponse();
        }
        console.error("[ai/copilot]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Copilot failed" },
            { status: 500 }
        );
    }
}
