/**
 * Shared Flash AI output sanitizers (safe for client + server).
 * Strips model chain-of-thought tags so drafts never leak thinking markup.
 */

const THINK_OPEN = String.raw`<\s*(?:think|thinking|redacted_reasoning|reasoning)\s*>`;
const THINK_CLOSE = String.raw`<\s*/\s*(?:think|thinking|redacted_reasoning|reasoning)\s*>`;
const THINK_BLOCK_RE = new RegExp(
    `${THINK_OPEN}[\\s\\S]*?(?:${THINK_CLOSE}|$)`,
    "gi"
);
const THINK_TAG_RE = new RegExp(
    `</?\\s*(?:think|thinking|redacted_reasoning|reasoning)\\s*>`,
    "gi"
);
/** Some hosts emit think spans with atypical brackets. */
const ALT_THINK_BLOCK_RE =
    /(?:^|\n)\s*(?:thinking|reasoning)\s*:\s*[\s\S]*?(?=\n\s*(?:#{1,3}\s|[A-Z][a-z].{20,}|\*\*|$))/gi;

/** Remove think/thinking blocks and leftover tags from model output. */
export function stripThinkingArtifacts(text: string): string {
    if (!text) return "";
    let out = text;
    // Complete or trailing unclosed think blocks (greedy to end if no close)
    out = out.replace(THINK_BLOCK_RE, "");
    // Orphan tags
    out = out.replace(THINK_TAG_RE, "");
    // If an open-looking remnant remains mid-string, drop from there
    const remnant = out.search(/<\s*(?:think|thinking|redacted_reasoning|reasoning)\b/i);
    if (remnant >= 0) {
        out = out.slice(0, remnant);
    }
    // Drop leading "Thinking:" style dumps when they dominate the start
    if (/^\s*(?:thinking|reasoning)\s*:/i.test(out) && out.length > 400) {
        out = out.replace(ALT_THINK_BLOCK_RE, "");
    }
    return out.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Incremental sanitizer for streamed deltas.
 * Buffers across chunk boundaries so open think spans never reach the UI.
 */
export class ThinkingStreamSanitizer {
    private buffer = "";
    private inThink = false;

    push(chunk: string): string {
        if (!chunk) return "";
        this.buffer += chunk;
        return this.drain(false);
    }

    flush(): string {
        return this.drain(true);
    }

    private drain(force: boolean): string {
        if (this.inThink) {
            const closeRe = new RegExp(THINK_CLOSE, "i");
            const closeMatch = closeRe.exec(this.buffer);
            if (!closeMatch) {
                if (force) {
                    this.buffer = "";
                    this.inThink = false;
                    return "";
                }
                // Keep holding while inside think
                if (this.buffer.length > 20000) {
                    this.buffer = this.buffer.slice(-500);
                }
                return "";
            }
            this.buffer = this.buffer.slice(closeMatch.index + closeMatch[0].length);
            this.inThink = false;
        }

        this.buffer = this.buffer.replace(
            new RegExp(`${THINK_OPEN}[\\s\\S]*?${THINK_CLOSE}`, "gi"),
            ""
        );

        const openRe = new RegExp(THINK_OPEN, "i");
        const openMatch = openRe.exec(this.buffer);
        if (openMatch && openMatch.index !== undefined) {
            const safe = this.buffer.slice(0, openMatch.index);
            this.buffer = this.buffer.slice(openMatch.index + openMatch[0].length);
            this.inThink = true;
            if (force) {
                // Discard remaining think buffer
                this.buffer = "";
                this.inThink = false;
                return stripThinkingArtifacts(safe);
            }
            // Recurse to continue draining after the open tag
            const more = this.drain(false);
            return stripThinkingArtifacts(safe + more);
        }

        if (force) {
            const out = stripThinkingArtifacts(this.buffer);
            this.buffer = "";
            return out;
        }

        // Hold a short tail that might be an incomplete opening tag
        const holdLen = 48;
        if (this.buffer.length <= holdLen) {
            if (/<\s*(?:t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?)?$/i.test(this.buffer)) {
                return "";
            }
            if (/<\s*(?:r(?:e(?:a(?:s(?:o(?:n(?:i(?:n(?:g)?)?)?)?)?)?)?)?)?$/i.test(this.buffer)) {
                return "";
            }
            const out = this.buffer;
            this.buffer = "";
            return stripThinkingArtifacts(out);
        }

        const emit = this.buffer.slice(0, -holdLen);
        this.buffer = this.buffer.slice(-holdLen);
        if (!/<\s*[^>]*$/i.test(this.buffer)) {
            const more = this.buffer;
            this.buffer = "";
            return stripThinkingArtifacts(emit + more);
        }
        return stripThinkingArtifacts(emit);
    }
}

/**
 * Strip fences + thinking, then parse the first JSON object.
 * Throws if no parseable object is found.
 */
export function extractJsonObject(text: string): unknown {
    const cleaned = stripThinkingArtifacts(text)
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned) as unknown;
    } catch {
        // fall through to brace scan
    }

    const start = cleaned.indexOf("{");
    if (start < 0) {
        throw new Error("No JSON object found");
    }

    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < cleaned.length; i++) {
        const ch = cleaned[i]!;
        if (inString) {
            if (escape) {
                escape = false;
            } else if (ch === "\\") {
                escape = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }
        if (ch === '"') {
            inString = true;
        } else if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) {
                return JSON.parse(cleaned.slice(start, i + 1)) as unknown;
            }
        }
    }

    throw new Error("Unbalanced JSON object");
}

/** Normalize draft text into readable paragraphs for UI insertion. */
export function formatDraftReadable(text: string): string {
    const cleaned = stripThinkingArtifacts(text);
    if (!cleaned) return "";
    return cleaned
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
