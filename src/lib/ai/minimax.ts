/**
 * MiniMax OpenAI-compatible client (server-only).
 * Model: MiniMax-M2.7 via https://api.minimax.io/v1
 * Key: MINIMAX_API_KEY (Wrangler secret / process.env) — never ship to browser.
 */

export const MINIMAX_BASE_URL = "https://api.minimax.io/v1";
export const MINIMAX_MODEL = "MiniMax-M2.7";

export type MiniMaxRole = "system" | "user" | "assistant" | "tool";

export type MiniMaxMessage = {
    role: MiniMaxRole;
    content: string | null;
    tool_calls?: MiniMaxToolCall[];
    tool_call_id?: string;
    name?: string;
};

export type MiniMaxToolCall = {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
};

export type MiniMaxToolDef = {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
};

export type ChatCompletionResult = {
    content: string;
    tool_calls: MiniMaxToolCall[];
    finish_reason: string | null;
    raw: unknown;
};

export function isMiniMaxConfigured(): boolean {
    return Boolean(process.env.MINIMAX_API_KEY?.trim());
}

export function getMiniMaxApiKey(): string | null {
    const key = process.env.MINIMAX_API_KEY?.trim();
    return key || null;
}

export class MiniMaxNotConfiguredError extends Error {
    constructor() {
        super("Not configured — add MINIMAX_API_KEY via wrangler secret put.");
        this.name = "MiniMaxNotConfiguredError";
    }
}

function requireKey(): string {
    const key = getMiniMaxApiKey();
    if (!key) throw new MiniMaxNotConfiguredError();
    return key;
}

export async function chatCompletion(opts: {
    messages: MiniMaxMessage[];
    tools?: MiniMaxToolDef[];
    temperature?: number;
    max_completion_tokens?: number;
}): Promise<ChatCompletionResult> {
    const key = requireKey();
    const res = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MINIMAX_MODEL,
            messages: opts.messages,
            temperature: opts.temperature ?? 0.4,
            max_completion_tokens: opts.max_completion_tokens ?? 2048,
            ...(opts.tools?.length ? { tools: opts.tools } : {}),
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[minimax] chat error", res.status, text.slice(0, 400));
        throw new Error(`MiniMax request failed (${res.status})`);
    }

    const json = (await res.json()) as {
        choices?: Array<{
            finish_reason?: string | null;
            message?: {
                content?: string | null;
                tool_calls?: MiniMaxToolCall[];
            };
        }>;
    };

    const choice = json.choices?.[0];
    const message = choice?.message;
    return {
        content: (message?.content ?? "").trim(),
        tool_calls: message?.tool_calls ?? [],
        finish_reason: choice?.finish_reason ?? null,
        raw: json,
    };
}

/**
 * Stream chat completions as an SSE-compatible ReadableStream of text deltas.
 * Yields plain UTF-8 chunks of assistant content (not tool payloads).
 */
export async function streamChatCompletion(opts: {
    messages: MiniMaxMessage[];
    tools?: MiniMaxToolDef[];
    temperature?: number;
    max_completion_tokens?: number;
}): Promise<Response> {
    const key = requireKey();
    const res = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: MINIMAX_MODEL,
            messages: opts.messages,
            temperature: opts.temperature ?? 0.4,
            max_completion_tokens: opts.max_completion_tokens ?? 2048,
            stream: true,
            ...(opts.tools?.length ? { tools: opts.tools } : {}),
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[minimax] stream error", res.status, text.slice(0, 400));
        throw new Error(`MiniMax stream failed (${res.status})`);
    }

    return res;
}

/** Parse OpenAI-style SSE stream into text content deltas. */
export function parseSseContentStream(
    upstream: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    return new ReadableStream({
        async start(controller) {
            const reader = upstream.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed.startsWith("data:")) continue;
                        const data = trimmed.slice(5).trim();
                        if (!data || data === "[DONE]") continue;
                        try {
                            const parsed = JSON.parse(data) as {
                                choices?: Array<{
                                    delta?: { content?: string | null };
                                }>;
                            };
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) controller.enqueue(encoder.encode(delta));
                        } catch {
                            // skip malformed chunks
                        }
                    }
                }
            } catch (err) {
                controller.error(err);
                return;
            }
            controller.close();
        },
    });
}
