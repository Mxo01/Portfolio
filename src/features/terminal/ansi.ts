import type { Line, Span, Tone } from "@/lib/terminal/types";

const RESET = "\x1b[0m";
const BULLET = "• ";
/** OSC 8: the target the cell links to, then the text, then an empty target to close it. */
const LINK_OPEN = "\x1b]8;;";
const LINK_STOP = "\x1b\\";
const LINK_CLOSE = "\x1b]8;;\x1b\\";

/** Erase the prompt row before repainting it. */
export const CLEAR_LINE = "\r\x1b[2K";
/** Wipe the viewport and home the cursor: what Ctrl+L means. */
export const CLEAR_SCREEN = "\x1b[2J\x1b[H";
export const NEWLINE = "\r\n";

/**
 * Tone → SGR. The palettes map 33 to gold, 90 to the muted grey and 31 to red,
 * so the semantic tone survives a theme flip without changing a single code.
 * `success` and `info` are the prompt's two registers and the palette's two warm hues:
 * 32 is orange (the arrow, and the command it opens), 36 is brown (the path). Neither is
 * bold: bold takes the bright slot, and the bright pair is tuned for glow on black, so the
 * arrow reaches for the plain one — the shape already carries the emphasis.
 */
const TONE_CODES: Readonly<Record<Tone, string>> = {
	plain: "",
	heading: "\x1b[1;33m",
	dim: "\x1b[90m",
	accent: "\x1b[33m",
	error: "\x1b[31m",
	success: "\x1b[32m",
	info: "\x1b[36m"
};

/**
 * A run that carries a target becomes a real hyperlink: xterm reads the OSC 8 and hands it
 * to the same `linkHandler` that serves the addresses found in prose.
 */
function hyperlink(href: string, text: string): string {
	return `${LINK_OPEN}${href}${LINK_STOP}${text}${LINK_CLOSE}`;
}

function paintSpan(span: Span): string {
	const code = TONE_CODES[span.tone ?? "plain"];
	const text = span.href === undefined ? span.text : hyperlink(span.href, span.text);
	return code === "" ? text : `${code}${text}${RESET}`;
}

/** One line, no line ending: the caller decides where the row ends. */
export function paintLine(line: Line): string {
	return typeof line === "string" ? line : line.map(paintSpan).join("");
}

/** A run of text in one tone, e.g. the prompt. */
export function paintText(tone: Tone, text: string): string {
	return paintSpan({ text, tone });
}

/** Lines ready for `term.write`: every row ends with the carriage return xterm needs. */
export function paintLines(lines: readonly Line[]): string {
	return lines.map(line => `${paintLine(line)}${NEWLINE}`).join("");
}

/** Content strings arrive bare; the shell owns the bullet glyph. */
export function bullets(lines: readonly string[]): readonly string[] {
	return lines.map(line => `${BULLET}${line}`);
}
