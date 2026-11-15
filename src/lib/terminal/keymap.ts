/**
 * The keyboard's contested chords: the ones xterm would otherwise turn into a control
 * byte or a plain Backspace. Ctrl/Cmd+C is two keys in one: the visitor's copy while a
 * selection is live, the shell's interrupt when it is not. Backspace under a modifier
 * edits by word, the way the platform's own line editors do, and Tab is a cycle once a
 * menu is open. The view reads the DOM event and the live session and hands both here;
 * this map decides, the view only executes. Nothing in this file touches the terminal,
 * the clipboard or the DOM.
 */

import type { ShellMode } from "./types";

/** What one chord means to the shell. */
export type KeyAction =
	/** Write the live selection; the line and the cursor stay exactly as they are. */
	| "copy"
	/** Drop the line and print the interrupt: the shell's own Ctrl+C. */
	| "cancel"
	/** Delete back to the previous word boundary, trailing whitespace included. */
	| "delete-word"
	/** Empty the draft, leaving history and the browse position alone. */
	| "clear-line"
	/** Open the completion menu, complete a lone candidate, or advance an open menu. */
	| "complete"
	/** Walk an open menu backwards. */
	| "complete-back"
	/** Close the completion menu and leave the line untouched. */
	| "dismiss"
	/** Not a chord the shell claims: the line editor sees the key. */
	| "none";

export interface KeyChord {
	/** `KeyboardEvent.key`, in any case. */
	readonly key: string;
	readonly ctrl: boolean;
	readonly meta: boolean;
	readonly alt: boolean;
	readonly shift: boolean;
	/** A selection is live, so the copy chord has something to copy. */
	readonly hasSelection: boolean;
	/** The completion menu is open, so Tab cycles it and Escape has something to close. */
	readonly menuOpen: boolean;
	/** What the shell is doing. A playback listens to no chord at all. */
	readonly mode: ShellMode;
}

const COPY_KEY = "c";
const BACKSPACE_KEY = "backspace";
const TAB_KEY = "tab";
const ESCAPE_KEY = "escape";

/**
 * Ctrl/Cmd+C copies while a selection is live and cancels when there is none, and it is
 * decided first: no other chord may shadow the interrupt. Shift and Alt belong to other
 * combinations — Ctrl+Shift+C keeps opening devtools, and nothing here claims a chord
 * the browser already owns.
 *
 * Backspace with a modifier is the line editor's, not xterm's: it would otherwise reach
 * the shell as one `\x7f` and delete a single character. Cmd empties the line; Ctrl and
 * Option delete the word behind the cursor.
 *
 * Tab opens the menu and, once one is open, walks it forwards — the line editor reads the
 * session to know which of the two it is. Shift+Tab walks it back and means nothing until
 * there is a menu to walk back through. Escape closes a menu and only a menu.
 *
 * A playing script resolves every key to `null`: inert, not consumed-and-cancelled, so no
 * chord is applied and xterm may do whatever it likes with the key — the session neither
 * listens nor prints.
 */
export function resolveKey(chord: KeyChord): KeyAction | null {
	if (chord.mode === "script") return null;

	const key = chord.key.toLowerCase();

	if (key === COPY_KEY) {
		const withModifier = chord.ctrl || chord.meta;
		if (!withModifier || chord.alt || chord.shift) return "none";

		return chord.hasSelection ? "copy" : "cancel";
	}

	if (key === TAB_KEY) {
		if (chord.ctrl || chord.meta || chord.alt) return "none";
		if (!chord.shift) return "complete";

		return chord.menuOpen ? "complete-back" : "none";
	}

	if (key === ESCAPE_KEY) return chord.menuOpen ? "dismiss" : "none";

	if (key !== BACKSPACE_KEY || chord.shift) return "none";
	if (chord.meta) return "clear-line";
	if (chord.ctrl || chord.alt) return "delete-word";

	return "none";
}
