/**
 * The terminal contract. This file is types only: no functions, no ANSI codes, no
 * colour values, and one type-only import — the script an executable returns, so the
 * contract can name the shape without restating it. The other slices code against
 * these names.
 *
 * Invariants:
 * - Every shape here is pure data, so the domain layer stays free of React, the
 *   DOM, the clock and randomness. Whatever is ambient arrives as an argument.
 * - Content is plain text. A `Tone` is a semantic register, not a colour: the
 *   renderer owns the tone → colour map and is the only place ANSI exists.
 * - Nothing in the data carries escape sequences. A `Line` is what should be
 *   shown; how it is painted is the view's decision.
 */

import type { Script } from "./script-data";

/**
 * Visual register of a span. The renderer maps each to an ANSI style. `success` and `info`
 * are the prompt's own: the first carries what a shell says went right (its arrow after a
 * command that ran, the command word while it is typed), the second where it is (the path).
 */
export type Tone = "plain" | "heading" | "dim" | "accent" | "error" | "success" | "info";

/** The two palettes the shell can wear. The domain only ever sees this name. */
export type ShellTheme = "dark" | "light";

/** A run of text sharing one tone. Missing tone means `plain`. */
export interface Span {
	readonly text: string;
	readonly tone?: Tone;
	/**
	 * Where the run points when the terminal turns it into a link: an absolute URL, or a
	 * `mailto:` target. Still data, not an escape sequence — the renderer writes OSC 8.
	 */
	readonly href?: string;
}

/**
 * One output line: either a bare string (the common case, painted `plain`) or a
 * sequence of spans when a line mixes registers.
 */
export type Line = readonly Span[] | string;

/** A named block of a content file: the title is a heading, the body is lines. */
export interface ContentSection {
	readonly title: string;
	readonly body: readonly string[];
}

/** A file of the virtual filesystem: addressable by `path`, readable as sections. */
export interface ContentFile {
	readonly kind: "file";
	readonly name: string;
	readonly path: string;
	readonly sections: readonly ContentSection[];
	/**
	 * Whether the visitor may print this file; absent means yes. A node that declares `false`
	 * refuses to be read and says so, and the reader asks the node — never the file name.
	 */
	readonly readable?: boolean;
}

/** A directory of the virtual filesystem. Its children are files or directories. */
export interface ContentDir {
	readonly kind: "dir";
	readonly name: string;
	readonly path: string;
	readonly children: readonly TreeNode[];
}

export type TreeNode = ContentFile | ContentDir;

/**
 * The menu Tab opens when the token under the cursor has more than one candidate.
 * It is session state, not view state: the line always shows the candidate at
 * `index`, and every cycle replaces exactly the span `head` occupied, so the menu
 * only has to remember where the cycling is.
 */
export interface CompletionMenu {
	/** Full replacement texts for the token, sorted, directories keeping their slash. */
	readonly candidates: readonly string[];
	/** Which candidate the line currently shows. */
	readonly index: number;
	/** The token as it was typed before the first Tab: every cycle replaces that span. */
	readonly head: string;
}

/**
 * What the shell is doing. `prompt` is the line editor; `script` is a playback the
 * visitor cannot interrupt, because there is nothing to type into and no key the
 * shell listens for.
 */
export type ShellMode = "prompt" | "script";

/**
 * The editable part of a shell: enough to repaint the prompt and restore the
 * history browse position after a command runs.
 */
export interface ShellSession {
	readonly cwd: string;
	readonly history: readonly string[];
	/** Index into `history` while browsing with the arrows, `null` on the draft. */
	readonly historyIndex: number | null;
	readonly draft: string;
	/** The completion menu while Tab is cycling it; absent means nothing to cycle. */
	readonly completion?: CompletionMenu;
	/** Absent means `prompt`: the shell is only in another mode while a script plays. */
	readonly mode?: ShellMode;
}

/**
 * What content the shell has right now: the tree once the CV has loaded, or the
 * reason it is not there yet. The two arms never mix, so a command that prints the
 * reason cannot also walk a tree that does not exist.
 */
export type ShellContent =
	{ readonly root: ContentDir } | { readonly root: null; readonly reason: string };

/**
 * The portrait as a grid of truecolour pixels: already decoded, cropped to head and
 * shoulders, and small enough to resample for any width. Pure data, so the shell can
 * be handed one without knowing that a JPEG was ever involved.
 */
export interface PortraitGrid {
	readonly width: number;
	readonly height: number;
	/** `width * height * 3` bytes: `[r, g, b]` per pixel, row-major from the top left. */
	readonly pixels: Uint8ClampedArray;
}

/**
 * One character cell as the DOM measures it, in CSS pixels. Nothing here is a
 * constant: the screen is queried because the font, the zoom and the line height all
 * move it, and character art that assumes a cell stretches the face instead.
 */
export interface CellMetrics {
	readonly width: number;
	readonly height: number;
}

/** Everything `execute` may read that is not the session itself. */
export type ShellContext = ShellContent & {
	readonly theme: ShellTheme;
	/** Columns the grid has right now: what `help` fits its table to. */
	readonly columns: number;
	/** The cell those columns are laid out in: what character art samples by. */
	readonly cell: CellMetrics;
	/** The portrait, once a command has asked for it; `null` prints the facts alone. */
	readonly portrait: PortraitGrid | null;
};

/**
 * What a command returns. The domain never touches the screen: it hands back the
 * next session plus the lines to paint, and asks for a host action with a flag.
 */
export interface ShellResult {
	readonly session: ShellSession;
	readonly lines: readonly Line[];
	/** Clear the scrollback before printing `lines`. */
	readonly clear?: boolean;
	/** Flip the host theme; the renderer owns both palettes. */
	readonly toggleTheme?: boolean;
	/**
	 * A playback the view schedules and cannot be talked out of: an executable's copy,
	 * its pace and the one thing it does to the outside world. Still data — no timer, no
	 * DOM, no URL lives in the domain.
	 */
	readonly script?: Script;
}
