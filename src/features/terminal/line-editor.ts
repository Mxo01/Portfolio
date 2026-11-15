import { complete, execute } from "@/lib/terminal";
import { tokenize } from "@/lib/terminal/tokenize";
import type {
	CompletionMenu,
	ContentDir,
	ShellContext,
	ShellResult,
	ShellSession
} from "@/lib/terminal/types";

/**
 * The line editor: everything the shell can do to the line being typed, as
 * transitions over the domain's `ShellSession`. No DOM, no terminal, no clock —
 * the screen feeds it one keystroke at a time and repaints from the result.
 */

/** Where a fresh shell starts. The tree's own root, so `cd` can never escape it. */
const ROOT_CWD = "/";
/** A draft that ends in whitespace has no token under the cursor yet. */
const TRAILING_SPACE = /\s$/;
/** Word boundaries for deletion: anything the shell would split a line on. */
const WHITESPACE = /\s/u;

/** Which way a cycle walks the open menu. */
export type CycleDirection = "next" | "previous";

const STEP: Readonly<Record<CycleDirection, number>> = { next: 1, previous: -1 };

export interface EditorState {
	readonly session: ShellSession;
	/** The line the visitor was typing before they started browsing history. */
	readonly stashedDraft: string;
}

export interface Submission {
	readonly editor: EditorState;
	readonly result: ShellResult;
}

export interface CompletionStep {
	readonly editor: EditorState;
	/**
	 * The candidates to print under the prompt, and only on the keystroke that opened the
	 * menu: a cycle replaces the line and prints nothing.
	 */
	readonly listed: readonly string[];
}

export function emptyEditor(): EditorState {
	return {
		session: { cwd: ROOT_CWD, history: [], historyIndex: null, draft: "" },
		stashedDraft: ""
	};
}

/** The token the cursor sits on: nothing at all after a space. */
function tokenAtCursor(draft: string): string {
	if (TRAILING_SPACE.test(draft)) return "";

	const tokens = tokenize(draft);
	return tokens[tokens.length - 1] ?? "";
}

/** Swaps the token under the cursor for its replacement, keeping the rest of the line. */
function withToken(draft: string, token: string, replacement: string): string {
	if (token.length === 0 || !draft.endsWith(token)) return `${draft}${replacement}`;
	return `${draft.slice(0, draft.length - token.length)}${replacement}`;
}

/** No menu: every edit and every completed line leaves the session without one. */
function withoutMenu(session: ShellSession): ShellSession {
	return { ...session, completion: undefined };
}

/** The menu open on `candidates`, showing the first of them. */
function menuOn(session: ShellSession, candidates: readonly string[]): CompletionMenu {
	return { candidates, index: 0, head: tokenAtCursor(session.draft) };
}

/** Typing abandons the browse position and the menu: the text is the new line. */
export function typeText(editor: EditorState, text: string): EditorState {
	if (text === "") return editor;

	const { session } = editor;
	return {
		...editor,
		session: { ...withoutMenu(session), draft: session.draft + text, historyIndex: null }
	};
}

export function backspace(editor: EditorState): EditorState {
	if (editor.session.draft === "") return editor;

	const { session } = editor;
	return {
		...editor,
		session: { ...withoutMenu(session), draft: session.draft.slice(0, -1) }
	};
}

/**
 * The character at `index`, read as a one-character slice so a bounded walk never has to
 * test for the end: `""` past either edge, which is not whitespace.
 */
function characterAt(characters: readonly string[], index: number): string {
	return characters.slice(index, index + 1).join("");
}

/**
 * Ctrl+W / Option+Backspace: drop the whitespace behind the cursor, then the word behind
 * that. `Array.from` walks code points, so an accented letter or an emoji is one character
 * and a word is never cut in half. Width is irrelevant: this is the draft, not the screen.
 */
export function deleteWord(editor: EditorState): EditorState {
	const { session } = editor;
	const characters = Array.from(session.draft);

	let end = characters.length;
	while (end > 0 && WHITESPACE.test(characterAt(characters, end - 1))) end -= 1;

	let start = end;
	while (start > 0 && !WHITESPACE.test(characterAt(characters, start - 1))) start -= 1;

	if (start === end && end === characters.length) return editor;

	return {
		...editor,
		session: { ...withoutMenu(session), draft: characters.slice(0, start).join("") }
	};
}

/** Cmd+Backspace: the draft only. History, the browse position and the scrollback stay. */
export function clearLine(editor: EditorState): EditorState {
	const { session } = editor;
	if (session.draft === "" && session.completion === undefined) return editor;

	return { ...editor, session: { ...withoutMenu(session), draft: "" } };
}

/** Escape: the menu goes, the line stays exactly as it is. */
export function closeMenu(editor: EditorState): EditorState {
	if (editor.session.completion === undefined) return editor;

	return { ...editor, session: withoutMenu(editor.session) };
}

/** Ctrl+C: drop the line, keep the history. */
export function cancel(editor: EditorState): EditorState {
	return {
		stashedDraft: "",
		session: { ...withoutMenu(editor.session), draft: "", historyIndex: null }
	};
}

export function historyUp(editor: EditorState): EditorState {
	const { history, historyIndex } = editor.session;
	if (history.length === 0) return editor;

	const nextIndex = historyIndex === null ? history.length - 1 : Math.max(historyIndex - 1, 0);
	const stashedDraft = historyIndex === null ? editor.session.draft : editor.stashedDraft;
	const [entry = ""] = history.slice(nextIndex);

	return {
		stashedDraft,
		session: {
			...withoutMenu(editor.session),
			draft: entry,
			historyIndex: nextIndex
		}
	};
}

export function historyDown(editor: EditorState): EditorState {
	const { history, historyIndex } = editor.session;
	if (historyIndex === null) return editor;

	const nextIndex = historyIndex + 1;
	if (nextIndex >= history.length) {
		return {
			stashedDraft: "",
			session: {
				...withoutMenu(editor.session),
				draft: editor.stashedDraft,
				historyIndex: null
			}
		};
	}

	const [entry = ""] = history.slice(nextIndex);

	return {
		...editor,
		session: {
			...withoutMenu(editor.session),
			draft: entry,
			historyIndex: nextIndex
		}
	};
}

/** Enter: the domain reads the line and hands back the next session and the output. */
export function submit(editor: EditorState, ctx: ShellContext): Submission {
	const result = execute(editor.session.draft, editor.session, ctx);
	return {
		result,
		editor: { session: withoutMenu(result.session), stashedDraft: "" }
	};
}

/**
 * Tab with no menu open: one candidate is inserted whole, with the slash that opens its
 * level; several open the menu on the first of them and are listed once. Nothing matching
 * leaves the line as typed and lists nothing, so Tab never eats what the visitor wrote.
 */
export function completeDraft(editor: EditorState, root: ContentDir | null): CompletionStep {
	const { session } = editor;
	const { candidates } = complete(session, root);

	if (candidates.length === 0) return { editor: closeMenu(editor), listed: [] };

	const token = tokenAtCursor(session.draft);
	const [first = ""] = candidates;
	const completed = withToken(session.draft, token, first);

	if (candidates.length === 1) {
		return {
			editor: { ...editor, session: { ...withoutMenu(session), draft: completed } },
			listed: []
		};
	}

	return {
		editor: {
			...editor,
			session: {
				...withoutMenu(session),
				draft: completed,
				completion: menuOn(session, candidates)
			}
		},
		listed: candidates
	};
}

/**
 * Tab with the menu open: the next candidate, wrapping at either end, on the same span and
 * with the list left alone. A token the visitor has since edited past the point where the
 * menu was opened drops the menu instead of cycling something the menu cannot replace.
 */
export function cycleDraft(editor: EditorState, direction: CycleDirection): CompletionStep {
	const { session } = editor;
	const menu = session.completion;
	if (menu === undefined) return { editor, listed: [] };

	const token = tokenAtCursor(session.draft);
	if (token.length === 0 || !token.startsWith(menu.head)) {
		return { editor: closeMenu(editor), listed: [] };
	}

	const count = menu.candidates.length;
	const index = (((menu.index + STEP[direction]) % count) + count) % count;
	const [candidate = ""] = menu.candidates.slice(index);

	return {
		editor: {
			...editor,
			session: {
				...withoutMenu(session),
				draft: withToken(session.draft, token, candidate),
				completion: { ...menu, index }
			}
		},
		listed: []
	};
}
