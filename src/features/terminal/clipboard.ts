/**
 * The clipboard, as the shell sees it. One write per copy, a label the terminal can
 * print for it, and no failure that can reach the grid: a browser without a clipboard
 * (an insecure origin, a refused permission, no user gesture) gets silence.
 */

/** Separates the verb from the amount: `copied · 3 lines`. */
export const COPIED_SEPARATOR = " · ";

const COPIED = "copied";
const LINE_UNIT = "line";
const CHAR_UNIT = "char";
const PLURAL = "s";
/** A selection dragged to the line end arrives with one newline per row; the last is not a line. */
const TRAILING_NEWLINES = /\n+$/;

/**
 * What the toast prints: the verb alone, and what it counted. Kept as parts so the
 * view can paint the amount in the muted tone without splitting a string back apart.
 */
export interface CopiedLabel {
	readonly verb: string;
	readonly amount: string;
}

/** Entries the selection covers. xterm already joins a soft-wrapped row, so only newlines count. */
function lineCount(body: string): number {
	return body === "" ? 0 : body.split("\n").length;
}

function amountOf(body: string, lines: number): string {
	if (lines > 1) return `${lines} ${LINE_UNIT}${PLURAL}`;

	const chars = Array.from(body).length;
	return chars === 1 ? `${chars} ${CHAR_UNIT}` : `${chars} ${CHAR_UNIT}${PLURAL}`;
}

/**
 * `copied · 3 lines` when the selection spans rows, `copied · 128 chars` when it does
 * not. A trailing newline is what a row ends with, not another row.
 */
export function copiedLabel(text: string): CopiedLabel {
	const body = text.replace(TRAILING_NEWLINES, "");
	return { verb: COPIED, amount: amountOf(body, lineCount(body)) };
}

/** Anything but a clipboard API: an insecure context has no `navigator.clipboard` at all. */
function clipboardApi(): Clipboard | undefined {
	return globalThis.navigator?.clipboard;
}

/**
 * Writes the selection and forgets it. Fire and forget on purpose: the key that asked
 * is answered in the same tick, and a write that lands late or never changes nothing
 * on screen. An empty selection is not a copy, so it leaves the clipboard alone.
 */
export function copySelection(text: string): void {
	if (text === "") return;

	const clipboard = clipboardApi();
	if (clipboard === undefined || typeof clipboard.writeText !== "function") return;

	try {
		void clipboard.writeText(text).catch(() => {
			// A refused write leaves the previous clipboard intact; the grid says nothing.
		});
	} catch {
		// Some engines throw instead of rejecting when the gesture has already expired.
	}
}
