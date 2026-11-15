import { HOME_PATH } from "./constants";
import { span } from "./lines";
import type { Span, Tone } from "./types";

/**
 * The mark a line opens with: oh-my-zsh's `robbyrussell` arrow. 0xProto has no glyph for
 * U+279C, so the browser draws it from the stack behind the family — a real arrow at a
 * slightly narrower advance, not a tofu box. Nothing here measures it: the grid decides.
 */
export const PROMPT_ARROW = "➜";

/** Between the arrow and the path, and between the path and the line: robbyrussell's own air. */
const ARROW_GAP = "  ";
const LINE_GAP = " ";

const TILDE = "~";
const SEPARATOR = "/";
/** What a leaf wider than its row wears: the tail of a name is what tells two apart. */
const TRUNCATION = "…";
/** Columns the row keeps free for the draft, so the chrome alone can never fill it. */
const TYPING_ROOM = 2;
/** The first token ends where the line does, at the first whitespace either way. */
const WHITESPACE = /\s/u;

/** The arrow after a line that ran, and after one that did not: the old `✗`, as a colour. */
const SUCCESS_TONE: Tone = "success";
const FAILURE_TONE: Tone = "error";
/** Where the visitor is: the palette's cyan, shared by both themes. */
const PATH_TONE: Tone = "info";
/** Everything the shell does not claim: arguments, gaps, and the air before a command. */
const MUTED_TONE: Tone = "dim";

/** The prompt and the draft typed on it, as the one row the screen paints and measures. */
export type PromptRow = readonly Span[];

/** What the prompt needs to know that is not the line being edited. */
export interface PromptState {
	/** The shell's working directory: always absolute inside the tree. */
	readonly cwd: string;
	/** Whether the line before this prompt failed: the arrow wears it until the next success. */
	readonly failed: boolean;
}

/**
 * `~` at home, the last segment below it: robbyrussell's `%c`, and the shortest honest
 * answer to where the visitor is. The parents are never printed, so they are never cut.
 */
export function displayPath(cwd: string): string {
	if (cwd === HOME_PATH) return TILDE;

	const leaf = cwd
		.split(SEPARATOR)
		.filter(part => part.length > 0)
		.at(-1);
	return leaf === undefined ? TILDE : leaf;
}

/**
 * The leaf as the row has room for it: only the tail survives, behind one `…`. The prompt
 * is one row and never wraps, so a name that outgrows its budget is shortened, not pushed.
 */
function fitPath(leaf: string, budget: number): string {
	const room = Math.max(TRUNCATION.length, budget);
	if (leaf.length <= room) return leaf;
	return `${TRUNCATION}${leaf.slice(leaf.length - (room - TRUNCATION.length))}`;
}

/** The chrome before the draft: arrow in success or error, path in the accent, one space. */
function chromeSpans(state: PromptState, columns: number): readonly Span[] {
	const fixed = PROMPT_ARROW.length + ARROW_GAP.length + LINE_GAP.length;
	const path = fitPath(displayPath(state.cwd), columns - fixed - TYPING_ROOM);

	return [
		span(`${PROMPT_ARROW}${ARROW_GAP}`, state.failed ? FAILURE_TONE : SUCCESS_TONE),
		span(path, PATH_TONE),
		span(LINE_GAP, MUTED_TONE)
	];
}

/**
 * The draft split at its first token: the command wears the arrow's green, its arguments
 * the muted grey. The command is green before and after Enter — nothing here asks whether
 * it exists, because a word is only a command once it has been submitted.
 */
function draftSpans(draft: string): readonly Span[] {
	if (draft === "") return [];

	const boundary = draft.search(WHITESPACE);
	const command = boundary === -1 ? draft : draft.slice(0, boundary);
	const rest = boundary === -1 ? "" : draft.slice(boundary);

	// A line that opens with a space has no command yet: the space is grey like the rest.
	if (command === "") return [span(draft, MUTED_TONE)];

	const tail = rest === "" ? [] : [span(rest, MUTED_TONE)];
	return [span(command, SUCCESS_TONE), ...tail];
}

/**
 * The prompt as the one row it is: `➜  career ` and the draft on it, chrome and line
 * together. There is no second row and no narrow-terminal collapse — the path is a single
 * segment, so a 45-column grid lays out the same prompt a 120-column one does.
 */
export function promptRow(state: PromptState, columns: number, draft: string): PromptRow {
	return [...chromeSpans(state, columns), ...draftSpans(draft)];
}

/** How many cells the row occupies: what a reflow measures, never what it assumes. */
export function rowWidth(row: PromptRow): number {
	return row.reduce((width, run) => width + run.text.length, 0);
}
