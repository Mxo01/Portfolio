import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal } from "@xterm/xterm";
import type { ILinkHandler, ITerminalOptions } from "@xterm/xterm";

import { buildContent } from "@/lib/content";
import { loadCv } from "@/lib/cv";
import { loadPortrait } from "@/lib/portrait";
import { promptRow, rowWidth } from "@/lib/terminal";
import type { PromptRow, PromptState } from "@/lib/terminal";
import { portraitLine } from "@/lib/terminal/commands";
import { LOADING_REASON, failureLines, welcomeLines } from "@/lib/terminal/content";
import { dim } from "@/lib/terminal/lines";
import { resolveKey } from "@/lib/terminal/keymap";
import { scheduleBeats } from "@/lib/terminal/script-data";
import type { Script } from "@/lib/terminal/script-data";
import type {
	CellMetrics,
	ContentDir,
	Line,
	PortraitGrid,
	ShellContext
} from "@/lib/terminal/types";

import { CLEAR_LINE, CLEAR_SCREEN, NEWLINE, bullets, paintLine, paintLines } from "./ansi";
import { COPIED_SEPARATOR, copiedLabel, copySelection } from "./clipboard";
import {
	backspace,
	cancel,
	clearLine,
	closeMenu,
	completeDraft,
	cycleDraft,
	deleteWord,
	emptyEditor,
	historyDown,
	historyUp,
	submit,
	typeText
} from "./line-editor";
import type { EditorState } from "./line-editor";
import { TERMINAL_OPTIONS } from "./options";
import { THEMES, applyBodyBackground, persistTheme, readTheme } from "./theme";
import type { Theme } from "./theme";

const ENTER = "\r";
const BACKSPACE = "\x7f";
const BACKSPACE_ALT = "\b";
const TAB = "\t";
const ARROW_UP = "\x1b[A";
const ARROW_DOWN = "\x1b[B";
const CTRL_L = "\x0c";
const CTRL_C = "\x03";
/** Any key the editor does not model (Left, Home, Delete…) begins with ESC. */
const ESCAPE = "\x1b";
const INTERRUPT = "^C";
/** Walk the cursor back up the rows the prompt itself wrote: only erasing needs it. */
const CURSOR_UP = "\x1b[A";
/** The cursor the prompt wears: a block is the cell the next character lands in, as zsh draws it. */
const PROMPT_CURSOR_STYLE: ITerminalOptions["cursorStyle"] = "block";

/** The viewport, not a panel: nothing around the canvas to show a seam against. */
const VIEWPORT: CSSProperties = { position: "fixed", inset: 0, overflow: "hidden" };
/** The grid's own layer: the notice sits above it, never inside the measured box. */
const CANVAS: CSSProperties = { position: "absolute", inset: 0 };

/**
 * The portrait, under the same published prefix as the CV: the app passes the document's
 * URL, but this asset belongs to the view and never travels through the domain.
 */
const PORTRAIT_URL = `${import.meta.env.BASE_URL}portrait.jpg`;
/** What a cell is before the grid has been measured: no cell, no character art. */
const UNMEASURED: CellMetrics = { width: 0, height: 0 };

/** The one scheme that leaves the browser instead of opening a tab. */
const MAILTO_SCHEME = "mailto:";
/**
 * The only schemes that earn a tab. Everything else — `javascript:`, `data:`, a scheme no
 * browser should follow from a document — is dropped without a word.
 */
const WEB_SCHEMES: readonly string[] = ["http:", "https:"];
/** The name the easter egg's download lands under: the file the CV actually is. */
const DOWNLOAD_NAME = "mario-dimodica-cv.pdf";
/**
 * How long the punchline holds before the file lands. The last beat is painted on the frame
 * after it is queued, so a download fired on the same tick could start before `just kidding`
 * is on screen; this is the beat that puts the joke first.
 */
const PUNCHLINE_HOLD_MS = 700;

/**
 * A link activates on a held modifier and on nothing else: Ctrl elsewhere, Cmd on a Mac.
 * A plain click stays inert, so dragging a selection across a link copies instead of
 * navigating, and no click ever raises a dialog. The scheme decides the destination: http(s)
 * opens in a new tab without an opener, `mailto:` goes to the OS handler because that is
 * where mail belongs, and anything else is dropped — a document never hands the browser a
 * scheme it does not own.
 */
function activateLink(event: MouseEvent, text: string): void {
	if (!event.ctrlKey && !event.metaKey) return;

	const scheme = text.toLowerCase();

	if (scheme.startsWith(MAILTO_SCHEME)) {
		window.location.href = text;
		return;
	}

	if (!WEB_SCHEMES.some(known => scheme.startsWith(known))) return;

	window.open(text, "_blank", "noopener");
}

/**
 * One handler for every link on the grid: the OSC 8 targets the shell writes and the
 * addresses the addon finds in prose. `allowNonHttpProtocols` is what lets the email reach
 * this handler at all — xterm drops any non-http target without it.
 */
const LINK_HANDLER: ILinkHandler = {
	allowNonHttpProtocols: true,
	activate: activateLink
};

/** How long the copy notice holds before it goes, and how long it takes to go. */
const NOTICE_HOLD_MS = 1200;
const NOTICE_FADE_MS = 150;
/** Clear of the last row and the scrollbar, without measuring the grid to place it. */
const NOTICE_INSET_PX = 16;
/** Only reached if the grid's own type is ever left unset: the notice must still print. */
const FALLBACK_FONT_SIZE_PX = 16;
const FALLBACK_FONT_FAMILY = "monospace";

/** What the copy notice says: the verb, and the count it reports. */
interface Notice {
	readonly verb: string;
	readonly amount: string;
}

/** The OS setting, read when it matters: no fade at all is part of the motion preference. */
function prefersReducedMotion(): boolean {
	return (
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/**
 * The notice prints in the grid's own typeface, on the terminal background and in its
 * colours, so it reads as a line the shell wrote rather than app chrome: no border, no
 * shadow, no card, no icon, and no pointer target underneath it.
 */
function noticeStyle(theme: Theme, fading: boolean): CSSProperties {
	const palette = THEMES[theme];

	return {
		position: "absolute",
		right: NOTICE_INSET_PX,
		bottom: NOTICE_INSET_PX,
		margin: 0,
		padding: "2px 8px",
		pointerEvents: "none",
		fontFamily: TERMINAL_OPTIONS.fontFamily ?? FALLBACK_FONT_FAMILY,
		fontSize: `${TERMINAL_OPTIONS.fontSize ?? FALLBACK_FONT_SIZE_PX}px`,
		lineHeight: 1.4,
		whiteSpace: "nowrap",
		background: palette.background,
		color: palette.foreground,
		opacity: fading ? 0 : 1,
		transition: prefersReducedMotion() ? "none" : `opacity ${NOTICE_FADE_MS}ms ease-out`
	};
}

/** The notice's second tone: the palette's muted grey, the one `dim` prints in. */
function mutedStyle(theme: Theme): CSSProperties {
	const palette = THEMES[theme];
	return { color: palette.brightBlack ?? palette.foreground };
}

export interface TerminalScreenProps {
	/** The CV to read: the published asset, base prefix included. */
	readonly cvUrl: string;
}

/** Keeps letters, spaces and every non-ASCII printable; drops keys and pasted control bytes. */
function printable(text: string): string {
	// The control range is the point here, not an accident: pasted escape sequences
	// must never reach the grid as terminal state.
	// eslint-disable-next-line no-control-regex -- dropping control bytes is the job
	return text.replace(/[\u0000-\u001f\u007f]/gu, "");
}

/** The reason a projection failure shows: the shell never paints a stack. */
function reasonOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * A line failed when it says so in the error register. The shell keeps no exit codes,
 * so the tone of what it printed is the only account of a failure there is.
 */
function failed(lines: readonly Line[]): boolean {
	return lines.some(line => typeof line !== "string" && line.some(part => part.tone === "error"));
}

/**
 * The whole site: one xterm filling the viewport, one session behind it. The
 * terminal owns the screen and the keyboard; the line editor owns the draft and
 * the domain owns what a line means.
 *
 * The CV is content, not code: the grid opens empty, the document is fetched and
 * parsed, and the welcome block and the prompt appear together once it has. Nothing
 * says "loading" and nothing says "ready" — a line typed meanwhile simply waits.
 */
export function TerminalScreen({ cvUrl }: TerminalScreenProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [theme, setTheme] = useState<Theme>(readTheme);
	const [notice, setNotice] = useState<Notice | null>(null);
	/** Whether the notice on screen is on its way out: the opacity flip lives on its own. */
	const [fading, setFading] = useState(false);
	const holdTimer = useRef<number | null>(null);
	const fadeTimer = useRef<number | null>(null);

	/**
	 * One notice at a time: a new copy takes the place of the last one and restarts the
	 * hold, so a burst of selections never stacks two or leaves one stranded. Nothing is
	 * written to the grid — the notice is DOM, so the scrollback stays exactly the line
	 * the shell printed.
	 */
	const showNotice = useCallback((text: string) => {
		if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
		if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);

		const { verb, amount } = copiedLabel(text);
		setNotice({ verb, amount });
		setFading(false);

		holdTimer.current = window.setTimeout(() => {
			holdTimer.current = null;

			// Reduced motion is a preference for arrival and departure, not a shorter fade.
			if (prefersReducedMotion()) {
				setNotice(null);
				return;
			}

			setFading(true);
			fadeTimer.current = window.setTimeout(() => {
				fadeTimer.current = null;
				setNotice(null);
				setFading(false);
			}, NOTICE_FADE_MS);
		}, NOTICE_HOLD_MS);
	}, []);

	useEffect(
		() => () => {
			if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
			if (fadeTimer.current !== null) window.clearTimeout(fadeTimer.current);
		},
		[]
	);

	useEffect(() => {
		const container = containerRef.current;
		/* v8 ignore next -- ref is attached before effects run */
		if (container === null) return;

		// `scrollOnUserInput` is xterm's default and the one thing this view opts out of: a
		// keystroke must not pull a visitor who is reading scrollback back down to the prompt.
		const terminal = new Terminal({
			...TERMINAL_OPTIONS,
			linkHandler: LINK_HANDLER,
			scrollOnUserInput: false,
			cursorStyle: PROMPT_CURSOR_STYLE
		});
		const fit = new FitAddon();
		terminal.loadAddon(fit);
		terminal.loadAddon(new WebLinksAddon(activateLink));
		terminal.open(container);

		const editor: { current: EditorState } = { current: emptyEditor() };
		/** Every timer the playback schedules: one array, cleared only when the screen goes. */
		const timers: number[] = [];
		let currentTheme = readTheme();
		/** The tree the commands walk, `null` until the CV has loaded. */
		let root: ContentDir | null = null;
		let reason = LOADING_REASON;
		/** False until the welcome block is on screen: no prompt before it. */
		let booted = false;
		let disposed = false;
		/** Decoded on the first line that needs it, never at boot. */
		let portrait: PortraitGrid | null = null;
		/** The columns the prompt row was laid out for: only another width reflows it. */
		let promptColumns = 0;
		/** Cells the whole row occupied, chrome and draft together: what a reflow must erase. */
		let promptWidth = 0;
		/** Whether a prompt row is on screen, with the cursor at the end of the draft. */
		let promptShown = false;
		/** Whether the line before this prompt failed: the arrow wears it until the next success. */
		let lastFailed = false;

		/**
		 * The cell the grid is actually laid out in: the screen element's own rect over the
		 * columns and rows xterm says it holds. Measured, never assumed — the font's advance,
		 * the zoom and the line height all move it, and art that assumes a cell is a smear.
		 */
		const cellMetrics = (): CellMetrics => {
			const screen = container.querySelector<HTMLElement>(".xterm-screen");
			if (screen === null) return UNMEASURED;

			const rect = screen.getBoundingClientRect();
			return {
				width: rect.width / Math.max(1, terminal.cols),
				height: rect.height / Math.max(1, terminal.rows)
			};
		};

		const context = (): ShellContext => {
			const shared = {
				theme: currentTheme,
				columns: terminal.cols,
				cell: cellMetrics(),
				portrait
			};
			return root === null ? { root: null, reason, ...shared } : { root, ...shared };
		};

		const applyTheme = (next: Theme) => {
			currentTheme = next;
			terminal.options.theme = THEMES[next];
			applyBodyBackground(next);
			persistTheme(next);
			// The notice is the one thing on screen React paints itself: it needs the flip too.
			setTheme(next);
		};

		// Every key reprints the row, because the draft is the only editable state and the line
		// it sits on is the whole prompt. Before the CV lands there is no prompt to reprint:
		// the grid stays empty and only the key shows.
		const promptState = (): PromptState => ({
			cwd: editor.current.session.cwd,
			failed: lastFailed
		});

		/** The row for the draft as it stands now, in the palette the grid is wearing. */
		const currentRow = (): PromptRow =>
			promptRow(promptState(), terminal.cols, editor.current.session.draft);

		/** The rows the prompt on screen occupies: chrome and draft over the width it was painted for. */
		const promptRows = (): number =>
			Math.max(1, Math.ceil(promptWidth / Math.max(1, promptColumns)));

		/**
		 * Walks back over every row the painted prompt wrapped onto and clears each one, which
		 * lands the cursor at column zero of the first of them: a draft longer than the grid is
		 * erased whole, never left as a fragment above the row being rewritten.
		 */
		const erasePrompt = () => {
			const wrapped = promptRows() - 1;
			if (wrapped === 0) return;

			terminal.write(`${CURSOR_UP.repeat(wrapped)}${`${CLEAR_LINE}${NEWLINE}`.repeat(wrapped)}`);
		};

		/**
		 * The prompt once, as the shell owns it: one row, arrow, path and draft. Writing it and
		 * measuring it are the same act, so a reflow never guesses how far it wrapped.
		 */
		const printPrompt = () => {
			const row = currentRow();

			promptShown = true;
			promptColumns = terminal.cols;
			promptWidth = rowWidth(row);
			terminal.write(`${CLEAR_LINE}${paintLine(row)}`);
		};

		/**
		 * What a keystroke costs: the rows the prompt occupies, cleared and reprinted, and
		 * nothing else. The chrome is part of those rows, so it is rewritten with the draft —
		 * never printed a second time — and a draft that wrapped is walked back over first, so
		 * typing at any width leaves one prompt on screen instead of a stack of fragments.
		 */
		const redraw = () => {
			const { session } = editor.current;

			if (!booted) {
				terminal.write(`${CLEAR_LINE}${session.draft}`);
				return;
			}

			if (!promptShown) {
				printPrompt();
				return;
			}

			erasePrompt();

			const row = currentRow();

			promptColumns = terminal.cols;
			promptWidth = rowWidth(row);
			terminal.write(`${CLEAR_LINE}${paintLine(row)}`);
		};

		/**
		 * A new width reflows every row, so the prompt is erased and written again for it —
		 * otherwise a leaf shortened for the old grid would leave the wrapped fragment of
		 * itself behind. Nothing is rewritten while the column count stays the one it was laid
		 * out for.
		 */
		const repaintPrompt = () => {
			if (!booted || !promptShown || terminal.cols === promptColumns) return;

			// Every row the cursor sits below belongs to the prompt: a wrapped draft is erased too.
			erasePrompt();

			promptShown = false;
			redraw();
		};

		/** The buffer line the cursor sits on, counted from the first line xterm keeps. */
		const cursorLine = () => terminal.buffer.active.baseY + terminal.buffer.active.cursorY;

		/**
		 * A result is written like a pager opens a file: the line the output starts on is
		 * captured before the write, and output taller than the screen is scrolled back to it,
		 * so a long `cat` begins at its first line instead of its tail. Output that fits stays
		 * where every shell leaves it — at the bottom, with the prompt under it — and nothing
		 * here ever pulls the viewport back down: reaching the prompt means scrolling.
		 */
		const writeResult = (lines: readonly Line[]) => {
			if (lines.length === 0) return;

			const start = cursorLine();
			terminal.write(paintLines(lines), () => {
				if (disposed) return;
				if (cursorLine() - start > terminal.rows) terminal.scrollToLine(start);
			});
		};

		/** One scheduling point for the playback, so its timers can be found and cleared. */
		const later = (delayMs: number, run: () => void) => {
			timers.push(window.setTimeout(run, delayMs));
		};

		/** The one thing a script does to the outside world: hand the visitor the CV. */
		const downloadCv = () => {
			const link = document.createElement("a");
			link.href = cvUrl;
			link.download = DOWNLOAD_NAME;
			link.rel = "noopener";
			document.body.append(link);
			link.click();
			link.remove();
		};

		/**
		 * The playback: each step lands after the pace the step before it asked for, the
		 * punchline gets its own beat, then the action fires and the debrief always prints.
		 * Nothing a key, a click or a paste does can reach these timers — the prompt is gone,
		 * the line editor is closed by the session's mode, and the only way out is the end.
		 */
		const play = (script: Script) => {
			// The pace is drawn per run: the confession never keeps the same rhythm twice.
			const delays = scheduleBeats(Math.random, script.steps);
			let elapsed = 0;

			for (const [index, step] of script.steps.entries()) {
				later(elapsed, () => {
					/* v8 ignore next -- teardown clears the timers before they could observe disposal */
					if (disposed) return;
					terminal.write(paintLines([step.line]));
				});
				const [delay = 0] = delays.slice(index);
				elapsed += delay;
			}

			later(elapsed + PUNCHLINE_HOLD_MS, () => {
				/* v8 ignore next -- teardown clears the timers before they could observe disposal */
				if (disposed) return;

				downloadCv();
				terminal.write(paintLines(script.debrief));

				// The line comes back only here: the prompt returns with the debrief on screen.
				editor.current = {
					...editor.current,
					session: { ...editor.current.session, mode: "prompt" }
				};
				redraw();
				terminal.focus();
			});
		};

		const runLine = async () => {
			// A line typed while the document is on its way waits for it, silently: the command
			// then runs against the real tree, and nothing is printed in between.
			await settled;
			if (disposed) return;

			// The portrait is not fetched at boot either: the first line that draws it pays for
			// the JPEG, and every later one reads the decoded grid back from the cache.
			if (portraitLine(editor.current.session.draft)) {
				portrait = await loadPortrait(PORTRAIT_URL);
				if (disposed) return;
			}

			const { editor: next, result } = submit(editor.current, context());
			editor.current = next;

			terminal.write(NEWLINE);
			// The submitted line is closed: the prompt under it is a new block, path and all.
			promptShown = false;
			lastFailed = failed(result.lines);
			if (result.clear === true) terminal.write(CLEAR_SCREEN);
			if (result.toggleTheme === true) applyTheme(currentTheme === "dark" ? "light" : "dark");
			writeResult(result.lines);

			// A script takes the screen: no prompt until it has played out and apologised.
			if (result.script !== undefined) {
				play(result.script);
				return;
			}

			redraw();
		};

		const requestCompletion = () => {
			const open = editor.current.session.completion !== undefined;
			const { editor: next, listed } = open
				? cycleDraft(editor.current, "next")
				: completeDraft(editor.current, root);
			editor.current = next;

			// The menu prints once, when it opens; a cycle only rewrites the line it sits on.
			if (booted && listed.length > 0) {
				// The prompt below the menu is a new one, so it gets its own path row.
				promptShown = false;
				terminal.write(`${NEWLINE}${paintLines(bullets(listed).map(line => dim(line)))}`);
			}
			redraw();
		};

		const handleData = (data: string) => {
			// A playback reads no input at all: no line, no completion, no interrupt.
			if (editor.current.session.mode === "script") return;

			switch (data) {
				case ENTER:
					void runLine();
					return;
				case BACKSPACE:
				case BACKSPACE_ALT:
					editor.current = backspace(editor.current);
					break;
				case TAB:
					requestCompletion();
					return;
				case ARROW_UP:
					editor.current = historyUp(editor.current);
					break;
				case ARROW_DOWN:
					editor.current = historyDown(editor.current);
					break;
				case CTRL_L:
					terminal.write(CLEAR_SCREEN);
					promptShown = false;
					break;
				case CTRL_C:
					terminal.write(`${INTERRUPT}${NEWLINE}`);
					promptShown = false;
					editor.current = cancel(editor.current);
					break;
				default:
					// A sequence the editor has no model for (the cursor lives at the end) is dropped whole.
					if (!data.includes(ESCAPE)) {
						editor.current = typeText(editor.current, printable(data));
					}
					break;
			}

			redraw();
		};

		/**
		 * Every chord the line editor claims is decided here and nowhere else, through the
		 * keymap: Ctrl/Cmd+C copies while a selection is live, Backspace under a modifier
		 * edits by word, Tab cycles an open menu and Escape closes one. A claimed chord is
		 * prevented and returns `false`, so xterm never also emits a `\x7f`, a control byte
		 * or a second copy. Ctrl+C without a selection is not claimed: it stays the
		 * shell's own interrupt, and the `^C` prints exactly as it always has.
		 *
		 * xterm asks this handler on the way up as well, and macOS keeps sending keydowns
		 * while a key is held: a chord is decided once, on the press. Returning here for
		 * anything but a keydown is what keeps one Option+Backspace from deleting the word
		 * twice, and a held word chord is consumed without applying, so the repeat never
		 * becomes a character delete of its own.
		 */
		const handleKey = (event: KeyboardEvent): boolean => {
			const action = resolveKey({
				key: event.key,
				ctrl: event.ctrlKey,
				meta: event.metaKey,
				alt: event.altKey,
				shift: event.shiftKey,
				hasSelection: terminal.hasSelection(),
				menuOpen: editor.current.session.completion !== undefined,
				mode: editor.current.session.mode ?? "prompt"
			});

			// A playing script claims nothing: the key is inert, not consumed.
			if (action === null) return true;

			if (event.type !== "keydown") return true;

			if (event.repeat && (action === "delete-word" || action === "clear-line")) {
				event.preventDefault();
				return false;
			}

			switch (action) {
				case "none":
				case "cancel":
					return true;
				case "complete":
					// Tab opens or advances through `onData`, where every other keystroke lands.
					return true;
				case "copy": {
					const text = terminal.getSelection();
					// A selection xterm reports without text is not a copy: never clobber with nothing.
					if (text === "") return true;

					event.preventDefault();
					copySelection(text);
					showNotice(text);
					return false;
				}
				case "complete-back":
					event.preventDefault();
					editor.current = cycleDraft(editor.current, "previous").editor;
					redraw();
					return false;
				case "dismiss":
					event.preventDefault();
					editor.current = closeMenu(editor.current);
					redraw();
					return false;
				case "delete-word":
					event.preventDefault();
					editor.current = deleteWord(editor.current);
					redraw();
					return false;
				case "clear-line":
					event.preventDefault();
					editor.current = clearLine(editor.current);
					redraw();
					return false;
			}
		};

		/**
		 * The selection follows the drag, so the write is sampled once per frame instead of
		 * once per cell. Empty means cleared, and a cleared selection leaves the clipboard
		 * exactly as it was.
		 */
		let copyFrame: number | null = null;
		const handleSelection = () => {
			if (copyFrame !== null) return;

			copyFrame = requestAnimationFrame(() => {
				copyFrame = null;

				const text = terminal.getSelection();
				if (text === "") return;

				copySelection(text);
				showNotice(text);
			});
		};

		/**
		 * One fetch, one parse, then the welcome block and the prompt. Nothing is written
		 * before it: a cold visit is an empty grid and a cursor until the document is in.
		 * A line submitted meanwhile waits on this promise, so it runs against the real tree.
		 */
		const settled = (async () => {
			try {
				const result = await loadCv({ url: cvUrl });
				if (disposed) return;

				if (result.ok) {
					root = buildContent(result.sections);
					lastFailed = false;
					terminal.write(
						`${CLEAR_LINE}${paintLines(welcomeLines(result.sections, terminal.cols))}`
					);
				} else {
					reason = result.reason;
					// The one line printed unasked still fails: its prompt wears the mark.
					lastFailed = true;
					terminal.write(
						`${CLEAR_LINE}${paintLines(failureLines(result.reason, result.line))}${NEWLINE}`
					);
				}
			} catch (error) {
				// `loadCv` never throws; a projection that does still leaves the shell usable.
				reason = reasonOf(error);
				lastFailed = true;
				if (!disposed) {
					terminal.write(`${CLEAR_LINE}${paintLines(failureLines(reason))}${NEWLINE}`);
				}
			}

			if (disposed) return;
			booted = true;
			redraw();
		})();

		applyTheme(currentTheme);

		const dataListener = terminal.onData(handleData);
		const selectionListener = terminal.onSelectionChange(handleSelection);
		terminal.attachCustomKeyEventHandler(handleKey);
		const refit = () => {
			fit.fit();
			repaintPrompt();
		};

		fit.fit();
		// A cold visit measures the cell against the fallback before the webfont lands:
		// refit once it does, or every row keeps the wrong advance until the next resize.
		void document.fonts.ready.then(() => {
			if (!disposed) refit();
		});
		terminal.focus();

		window.addEventListener("resize", refit);
		// The observer catches what `resize` misses: a phone keyboard, a rotation, a zoom.
		const observer = new ResizeObserver(refit);
		observer.observe(container);

		const focusTerminal = () => {
			terminal.focus();
		};
		document.addEventListener("mousedown", focusTerminal);

		return () => {
			disposed = true;
			for (const timer of timers) window.clearTimeout(timer);
			document.removeEventListener("mousedown", focusTerminal);
			window.removeEventListener("resize", refit);
			observer.disconnect();
			if (copyFrame !== null) cancelAnimationFrame(copyFrame);
			selectionListener.dispose();
			dataListener.dispose();
			terminal.dispose();
		};
	}, [cvUrl, showNotice]);

	return (
		<div style={VIEWPORT}>
			<div
				ref={containerRef}
				style={CANVAS}
			/>
			{notice === null ? null : (
				<p
					role="status"
					aria-live="polite"
					aria-atomic="true"
					style={noticeStyle(theme, fading)}
				>
					{notice.verb}
					<span style={mutedStyle(theme)}>{`${COPIED_SEPARATOR}${notice.amount}`}</span>
				</p>
			)}
		</div>
	);
}
