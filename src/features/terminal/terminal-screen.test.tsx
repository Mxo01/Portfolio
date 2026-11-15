import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CLEAR_LINE, CLEAR_SCREEN, NEWLINE, paintLine, paintLines } from "@/features/terminal/ansi";
import { TERMINAL_OPTIONS } from "@/features/terminal/options";
import { THEMES } from "@/features/terminal/theme";
import { TerminalScreen } from "@/features/terminal/terminal-screen";
import type { CvLoadResult } from "@/lib/cv";
import type * as portraitModule from "@/lib/portrait";
import { HOME_PATH } from "@/lib/terminal/constants";
import { PROMPT_ARROW, promptRow } from "@/lib/terminal/prompt";
import { EXPORT_CV_DEBRIEF, EXPORT_CV_STEPS } from "@/lib/terminal/script-data";
import { CV_SECTIONS } from "@/test/fixtures/cv";
import { INK, solidGrid } from "@/test/fixtures/portrait";

/**
 * The screen is the one file that owns xterm, the keyboard, the clipboard and the clock. It
 * is tested through the doubles xterm itself would provide — the grid, its addons and the
 * events a browser sends it — so every case below states a keystroke, a resize or a
 * selection and reads what was written to the grid.
 *
 * The terminal is a fake, but the shell behind it is not: the welcome block, the prompt,
 * the commands and the easter egg are the real domain, so a line typed here is dispatched,
 * rendered and painted exactly as it is in the browser.
 */

/** One frame is at most 16ms: past that the copy-on-select callback has run. */
const FRAME_SETTLE_MS = 32;
/** Narrower than any wrapped draft, and narrow enough for `whoami` to drop the art. */
const NARROW_COLUMNS = 60;
/** A draft that outgrows the grid, so a reflow has wrapped rows to erase. */
const LONG_DRAFT = "x".repeat(130);
/** A grid narrow enough that a hand-typed draft runs over several rows. */
const WRAPPED_COLUMNS = 20;
/** A draft almost four times that width: the prompt it paints wraps three times. */
const WRAPPED_DRAFT = "x".repeat(70);
/** The rows the prompt wraps onto, chrome and draft over the 20-cell grid. */
const WRAPPED_ROWS = 3;

/** The notice, and the punchline's own hold, as the visitor sees them. */
const NOTICE_HOLD_MS = 1200;
const NOTICE_FADE_MS = 150;
const PUNCHLINE_HOLD_MS = 700;
/** The shortest beat `scheduleBeats` draws, with `Math.random` pinned to zero. */
const BEAT_DELAY_MS = 350;
const BEAT_COUNT = EXPORT_CV_STEPS.length;

const ENTER = "\r";
const TAB = "\t";
/** Walk the cursor back up the rows a wrapped prompt wrote: only erasing needs it. */
const CURSOR_UP = "\x1b[A";
const ARROW_UP = CURSOR_UP;
const ARROW_DOWN = "\x1b[B";
const CTRL_L = "\x0c";
const CTRL_C = "\x03";
/** The interrupt the shell prints before the prompt comes back. */
const INTERRUPT = "^C";

const CV_URL = `${import.meta.env.BASE_URL}cv/mario-dimodica-cv.pdf`;
const PORTRAIT_URL = `${import.meta.env.BASE_URL}portrait.jpg`;
const THEME_KEY = "portfolio-theme";
const DOWNLOAD_NAME = "mario-dimodica-cv.pdf";

/** xterm, its addons and the three DOM watches the screen installs, as closed fakes. */
const fakes = vi.hoisted(() => {
	interface Written {
		readonly payload: string;
		readonly callback: (() => void) | undefined;
	}

	/** The cell 0xProto at 16px lays out, as the measured screen rect reports it. */
	const CELL_WIDTH_PX = 9.92;
	const CELL_HEIGHT_PX = 24.96;
	/** A grid wide enough for the banner and tall enough for a page of output. */
	const DEFAULT_COLUMNS = 120;
	const DEFAULT_ROWS = 30;

	class FakeTerminal {
		static readonly created: FakeTerminal[] = [];
		static reset(): void {
			FakeTerminal.created.length = 0;
		}

		readonly options: Record<string, unknown>;
		cols = DEFAULT_COLUMNS;
		rows = DEFAULT_ROWS;
		readonly buffer = { active: { baseY: 0, cursorY: 0 } };
		readonly writes: Written[] = [];
		/** The writes whose completion callback the test wants to land later. */
		held = false;
		readonly heldCallbacks: (() => void)[] = [];
		selection = "";
		dataHandler: ((data: string) => void) | null = null;
		selectionHandler: (() => void) | null = null;
		keyHandler: ((event: KeyboardEvent) => boolean) | null = null;
		readonly dataListeners: { readonly dispose: ReturnType<typeof vi.fn> }[] = [];
		readonly selectionListeners: { readonly dispose: ReturnType<typeof vi.fn> }[] = [];

		/**
		 * xterm parses the payload and moves the cursor before it calls back, so the double
		 * advances the buffer by the rows written: that is what a result taller than the
		 * screen is measured against.
		 */
		readonly write = vi.fn((payload: string, callback?: () => void) => {
			this.buffer.active.cursorY += payload.split("\n").length - 1;
			this.writes.push({ payload, callback });

			if (callback === undefined) return;
			if (this.held) {
				this.heldCallbacks.push(callback);
				return;
			}
			callback();
		});
		readonly loadAddon = vi.fn();
		readonly focus = vi.fn();
		readonly dispose = vi.fn();
		readonly scrollToLine = vi.fn();
		readonly scrollToBottom = vi.fn();
		readonly hasSelection = vi.fn(() => this.selection !== "");
		readonly getSelection = vi.fn(() => this.selection);

		constructor(options: Record<string, unknown> = {}) {
			this.options = { ...options };
			FakeTerminal.created.push(this);
		}

		open = vi.fn((container: HTMLElement) => {
			// The measured cell comes off this element's own rect, so the double hands one out.
			const layer = document.createElement("div");
			layer.className = "xterm-screen";
			layer.getBoundingClientRect = () =>
				({
					width: this.cols * CELL_WIDTH_PX,
					height: this.rows * CELL_HEIGHT_PX
				}) as unknown as DOMRect;
			container.append(layer);
		});

		onData = vi.fn((handler: (data: string) => void) => {
			this.dataHandler = handler;
			const listener = { dispose: vi.fn() };
			this.dataListeners.push(listener);
			return listener;
		});

		onSelectionChange = vi.fn((handler: () => void) => {
			this.selectionHandler = handler;
			const listener = { dispose: vi.fn() };
			this.selectionListeners.push(listener);
			return listener;
		});

		attachCustomKeyEventHandler = vi.fn((handler: (event: KeyboardEvent) => boolean) => {
			this.keyHandler = handler;
		});

		releaseWrites(): void {
			const pending = this.heldCallbacks.splice(0);
			for (const callback of pending) callback();
		}
	}

	class FakeFitAddon {
		static readonly created: FakeFitAddon[] = [];
		static reset(): void {
			FakeFitAddon.created.length = 0;
		}

		readonly fit = vi.fn();

		constructor() {
			FakeFitAddon.created.push(this);
		}
	}

	class FakeWebLinksAddon {
		static readonly created: FakeWebLinksAddon[] = [];
		static reset(): void {
			FakeWebLinksAddon.created.length = 0;
		}

		constructor(readonly activate: (event: MouseEvent, text: string) => void) {
			FakeWebLinksAddon.created.push(this);
		}
	}

	return { FakeTerminal, FakeFitAddon, FakeWebLinksAddon, DEFAULT_COLUMNS };
});

vi.mock("@xterm/xterm", () => ({ Terminal: fakes.FakeTerminal }));
vi.mock("@xterm/addon-fit", () => ({ FitAddon: fakes.FakeFitAddon }));
vi.mock("@xterm/addon-web-links", () => ({ WebLinksAddon: fakes.FakeWebLinksAddon }));

/** The document, as the screen asks for it: one fetch, one answer. */
const cv = vi.hoisted(() => ({ loadCv: vi.fn() }));
vi.mock("@/lib/cv", () => ({ loadCv: cv.loadCv }));

/** The portrait only: the renderer beside it is real, so `whoami` draws what it always drew. */
const portrait = vi.hoisted(() => ({ loadPortrait: vi.fn() }));
vi.mock("@/lib/portrait", async importOriginal => {
	const actual = await importOriginal<typeof portraitModule>();
	return { ...actual, loadPortrait: portrait.loadPortrait };
});

/** The one observer the screen opens, so its callback and teardown are reachable. */
class MockResizeObserver {
	static readonly created: MockResizeObserver[] = [];

	readonly observe = vi.fn();
	readonly unobserve = vi.fn();
	readonly disconnect = vi.fn();

	constructor(private readonly callback: ResizeObserverCallback) {
		MockResizeObserver.created.push(this);
	}

	trigger(): void {
		this.callback([], this as unknown as ResizeObserver);
	}
}

/** A storage the theme can read and write without touching the browser's own. */
function storageDouble(initial: Readonly<Record<string, string>> = {}): {
	readonly storage: Storage;
	readonly entries: Map<string, string>;
} {
	const entries = new Map(Object.entries(initial));

	const storage: Storage = {
		get length() {
			return entries.size;
		},
		clear: () => entries.clear(),
		key: index => [...entries.keys()][index] ?? null,
		removeItem: key => {
			entries.delete(key);
		},
		getItem: key => entries.get(key) ?? null,
		setItem: (key, value) => {
			entries.set(key, value);
		}
	};

	return { storage, entries };
}

/** A promise the test resolves and rejects by hand: the boot, held mid-flight. */
function deferred<T>(): {
	readonly promise: Promise<T>;
	readonly resolve: (value: T) => void;
	readonly reject: (reason: unknown) => void;
} {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((onDone, onFail) => {
		resolve = onDone;
		reject = onFail;
	});

	return { promise, resolve, reject };
}

type TestTerminal = InstanceType<typeof fakes.FakeTerminal>;
type TestFitAddon = InstanceType<typeof fakes.FakeFitAddon>;

let terminal: TestTerminal;
let fit: TestFitAddon;
let storage: ReturnType<typeof storageDouble>;
let clipboard: { readonly writeText: ReturnType<typeof vi.fn> };
let view: ReturnType<typeof render>;

/** Lets every promise the screen is holding on settle, inside one act(). */
async function flush(): Promise<void> {
	for (let tick = 0; tick < 3; tick++) await Promise.resolve();
}

async function settle(): Promise<void> {
	await act(async () => {
		await flush();
	});
}

function renderScreen(): void {
	view = render(<TerminalScreen cvUrl={CV_URL} />);
	const opened = fakes.FakeTerminal.created.at(-1);
	const installed = fakes.FakeFitAddon.created.at(-1);
	if (opened === undefined || installed === undefined)
		throw new Error("the screen built no terminal");
	terminal = opened;
	fit = installed;
}

/** Mounts with the document already answered, which is what a warm visit is. */
async function mount(result: CvLoadResult = { ok: true, sections: CV_SECTIONS }): Promise<void> {
	cv.loadCv.mockResolvedValue(result);
	renderScreen();
	await settle();
}

function unmount(): void {
	view.unmount();
}

/** What xterm was handed, in order, from a mark in the write log. */
function writesSince(mark: number): readonly string[] {
	return terminal.writes.slice(mark).map(entry => entry.payload);
}

function lastPayload(): string {
	return terminal.writes.at(-1)?.payload ?? "";
}

function output(): string {
	return terminal.writes.map(entry => entry.payload).join("");
}

/** The prompt row as the shell paints it, so a case can name the state it expects. */
function promptPayload(
	draft: string,
	options: { readonly columns?: number; readonly failed?: boolean } = {}
): string {
	const state = { cwd: HOME_PATH, failed: options.failed ?? false };
	return `${CLEAR_LINE}${paintLine(promptRow(state, options.columns ?? fakes.DEFAULT_COLUMNS, draft))}`;
}

/** One beat of `export_cv.sh`, painted the way the playback paints it. */
function beatPayload(index: number): string {
	const step = EXPORT_CV_STEPS[index];
	if (step === undefined) throw new Error(`no beat at index ${index}`);
	return paintLines([step.line]);
}

/** One keystroke arrives as one blob; a paste is one blob holding a whole line. */
async function send(data: string): Promise<void> {
	await act(async () => {
		terminal.dataHandler?.(data);
		await flush();
	});
}

async function sendLine(line: string): Promise<void> {
	await send(line);
	await send(ENTER);
}

async function advance(ms: number): Promise<void> {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

async function nextFrame(): Promise<void> {
	await advance(FRAME_SETTLE_MS);
}

/** A keydown as xterm sees it, with the fake's handler deciding it. */
function pressKey(
	init: KeyboardEventInit,
	type: "keydown" | "keyup" = "keydown"
): { readonly claimed: boolean; readonly event: KeyboardEvent } {
	// A real keydown is cancelable, and that is what a claimed chord is measured by.
	const event = new KeyboardEvent(type, { cancelable: true, ...init });
	const claimed = terminal.keyHandler?.(event) ?? true;
	return { claimed, event };
}

function notice(): HTMLElement | null {
	return screen.queryByRole("status");
}

function noticeText(): string | null {
	return notice()?.textContent ?? null;
}

/** A click on a link: the modifier decides whether it travels anywhere. */
function linkClick(init: MouseEventInit = {}): MouseEvent {
	return new MouseEvent("click", init);
}

beforeEach(() => {
	vi.useFakeTimers();
	fakes.FakeTerminal.reset();
	fakes.FakeFitAddon.reset();
	fakes.FakeWebLinksAddon.reset();
	MockResizeObserver.created.length = 0;
	cv.loadCv.mockReset();
	portrait.loadPortrait.mockReset();
	portrait.loadPortrait.mockResolvedValue(solidGrid(8, 8, INK));

	storage = storageDouble();
	vi.stubGlobal("localStorage", storage.storage);
	vi.stubGlobal("ResizeObserver", MockResizeObserver);

	clipboard = { writeText: vi.fn(() => Promise.resolve()) };
	Object.defineProperty(navigator, "clipboard", { value: clipboard, configurable: true });

	// happy-dom ships no FontFaceSet; the screen waits on its `ready` before refitting.
	Object.defineProperty(document, "fonts", {
		value: { ready: Promise.resolve() },
		configurable: true
	});
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	Reflect.deleteProperty(document, "fonts");
	Reflect.deleteProperty(navigator, "clipboard");
	document.body.removeAttribute("style");
	document.documentElement.removeAttribute("style");
});

describe("TerminalScreen mount", () => {
	it("opens the grid with the shared options, the block cursor and one link handler", async () => {
		await mount();

		const testSubject = terminal.options;

		expect(testSubject).toMatchObject({
			...TERMINAL_OPTIONS,
			scrollOnUserInput: false,
			cursorStyle: "block"
		});
	});

	it("gives xterm and the prose finder the same link handler", async () => {
		await mount();

		const addon = fakes.FakeWebLinksAddon.created.at(-1);
		const handler = terminal.options.linkHandler as {
			readonly allowNonHttpProtocols: boolean;
			readonly activate: unknown;
		};

		expect(handler.allowNonHttpProtocols).toBe(true);
		expect(handler.activate).toBe(addon?.activate);
	});

	it("loads both addons, opens on the canvas and takes focus", async () => {
		await mount();

		const addons = terminal.loadAddon.mock.calls.map(call => call[0]);
		const container = terminal.open.mock.calls[0]?.[0];

		expect(addons).toEqual([fit, fakes.FakeWebLinksAddon.created.at(-1)]);
		expect(container).toHaveStyle({ position: "absolute" });
		expect(terminal.focus).toHaveBeenCalledTimes(1);
	});

	it("refits on mount, on a resize, on a click and once the webfont has landed", async () => {
		await mount();

		// Mount, then the promise `document.fonts.ready` resolved on.
		expect(fit.fit).toHaveBeenCalledTimes(2);

		window.dispatchEvent(new Event("resize"));
		expect(fit.fit).toHaveBeenCalledTimes(3);

		const observer = MockResizeObserver.created.at(-1);
		observer?.trigger();
		expect(fit.fit).toHaveBeenCalledTimes(4);

		document.dispatchEvent(new MouseEvent("mousedown"));
		expect(terminal.focus).toHaveBeenCalledTimes(2);
	});

	it("watches the canvas with a resize observer", async () => {
		await mount();

		const observer = MockResizeObserver.created.at(-1);
		const container = terminal.open.mock.calls[0]?.[0];
		const testSubject = observer?.observe.mock.calls.map(call => call[0]);

		expect(testSubject).toContain(container);
	});
});

describe("TerminalScreen teardown", () => {
	it("disposes the terminal and everything it attached to the page", async () => {
		await mount();
		const observer = MockResizeObserver.created.at(-1);

		unmount();

		expect(terminal.dispose).toHaveBeenCalledTimes(1);
		expect(terminal.dataListeners[0]?.dispose).toHaveBeenCalledTimes(1);
		expect(terminal.selectionListeners[0]?.dispose).toHaveBeenCalledTimes(1);
		expect(observer?.disconnect).toHaveBeenCalledTimes(1);
	});

	it("stops refitting and stops taking focus once the screen is gone", async () => {
		await mount();
		const fitted = fit.fit.mock.calls.length;
		const focused = terminal.focus.mock.calls.length;

		unmount();
		window.dispatchEvent(new Event("resize"));
		document.dispatchEvent(new MouseEvent("mousedown"));

		expect(fit.fit).toHaveBeenCalledTimes(fitted);
		expect(terminal.focus).toHaveBeenCalledTimes(focused);
	});

	it("clears every timer the playback scheduled", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		await mount();
		await sendLine("export_cv.sh");
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});

	it("plays nothing more once a playback is interrupted by the screen going", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		await mount();
		await sendLine("export_cv.sh");
		const written = terminal.writes.length;

		unmount();
		await advance(BEAT_DELAY_MS * BEAT_COUNT + PUNCHLINE_HOLD_MS);

		expect(terminal.writes).toHaveLength(written);
	});
});

describe("TerminalScreen boot", () => {
	it("opens empty and echoes the draft alone while the document is still coming", async () => {
		const load = deferred<CvLoadResult>();
		cv.loadCv.mockReturnValue(load.promise);
		renderScreen();
		await settle();

		expect(terminal.writes).toHaveLength(0);

		await send("c");

		expect(lastPayload()).toBe(`${CLEAR_LINE}c`);

		load.resolve({ ok: true, sections: CV_SECTIONS });
		await settle();

		// The line typed meanwhile is on the prompt the welcome block hands over to.
		expect(lastPayload()).toBe(promptPayload("c"));
	});

	it("prints the welcome block and one prompt when the document lands", async () => {
		await mount();

		expect(cv.loadCv).toHaveBeenCalledWith({ url: CV_URL });

		const painted = output();
		expect(painted).toContain("  __  __");
		expect(painted).toContain("Role");
		expect(lastPayload()).toBe(promptPayload(""));
	});

	it("prints one reason and keeps the shell usable when the document is refused", async () => {
		await mount({ ok: false, reason: "no layout" });

		const painted = output();
		expect(painted.match(/content unavailable/g)).toHaveLength(1);
		expect(painted).toContain("content unavailable: no layout");
		// The one line printed unasked still failed, so the prompt wears the mark.
		expect(lastPayload()).toBe(promptPayload("", { failed: true }));

		await sendLine("pwd");

		expect(output()).toContain(`${NEWLINE}/${NEWLINE}`);
		expect(lastPayload()).toBe(promptPayload(""));
	});

	it("names the line the document could not place", async () => {
		await mount({ ok: false, reason: "unplaceable line", line: "  ORPHAN  " });

		expect(output()).toContain('offending line: "  ORPHAN  "');
	});

	it.each([
		{ name: "an error", thrown: new Error("projection exploded"), reason: "projection exploded" },
		{
			name: "a value that is not an error",
			thrown: "projection exploded",
			reason: "projection exploded"
		}
	])("survives a projection that throws $name", async ({ thrown, reason }) => {
		cv.loadCv.mockImplementation(() => Promise.reject(thrown));

		renderScreen();
		await settle();

		expect(output()).toContain(`content unavailable: ${reason}`);
		expect(lastPayload()).toBe(promptPayload("", { failed: true }));
	});

	it("writes nothing when the document lands after the screen went", async () => {
		const load = deferred<CvLoadResult>();
		cv.loadCv.mockReturnValue(load.promise);
		renderScreen();
		await settle();
		unmount();

		load.resolve({ ok: true, sections: CV_SECTIONS });
		await settle();

		expect(terminal.writes).toHaveLength(0);
	});

	it("writes nothing when the document fails after the screen went", async () => {
		const load = deferred<CvLoadResult>();
		cv.loadCv.mockReturnValue(load.promise);
		renderScreen();
		await settle();
		unmount();

		load.reject(new Error("too late"));
		await settle();

		expect(terminal.writes).toHaveLength(0);
	});
});

describe("TerminalScreen line editor", () => {
	it("echoes every keystroke on the prompt and runs the line on Enter", async () => {
		await mount();

		await send("p");
		expect(lastPayload()).toBe(promptPayload("p"));

		await send("wd");
		expect(lastPayload()).toBe(promptPayload("pwd"));

		const mark = terminal.writes.length;
		await send(ENTER);

		expect(writesSince(mark)).toEqual([NEWLINE, paintLines(["/"]), promptPayload("")]);
	});

	it("prints nothing for an empty line and hands the prompt back", async () => {
		await mount();
		const mark = terminal.writes.length;

		await send(ENTER);

		expect(writesSince(mark)).toEqual([NEWLINE, promptPayload("")]);
	});

	it("wipes the scrollback on `clear` without printing a line", async () => {
		await mount();
		await send("clear");
		const mark = terminal.writes.length;

		await send(ENTER);

		expect(writesSince(mark)).toEqual([NEWLINE, CLEAR_SCREEN, promptPayload("")]);
	});

	it("deletes a character on Backspace, whichever byte arrives", async () => {
		await mount();
		await send("ab");

		await send("\x7f");
		expect(lastPayload()).toBe(promptPayload("a"));

		await send("\b");
		expect(lastPayload()).toBe(promptPayload(""));
	});

	it("reports an unknown command and keeps the prompt", async () => {
		await mount();

		await sendLine("nope");

		expect(output()).toContain("unknown command: nope");
		// The line failed, so the prompt under it wears the mark until a line succeeds.
		expect(lastPayload()).toBe(promptPayload("", { failed: true }));

		await sendLine("pwd");

		expect(lastPayload()).toBe(promptPayload(""));
	});

	it("drops a pasted control byte instead of printing it", async () => {
		await mount();
		await send("a");

		await send("\x01b");

		expect(lastPayload()).toBe(promptPayload("ab"));
	});

	it("drops a key sequence the editor has no model for", async () => {
		await mount();
		await send("ab");

		await send("\x1b[D");

		expect(lastPayload()).toBe(promptPayload("ab"));
	});

	it("erases every row a wrapped draft occupies before rewriting it", async () => {
		await mount();
		terminal.cols = WRAPPED_COLUMNS;
		window.dispatchEvent(new Event("resize"));
		await send(WRAPPED_DRAFT);
		const mark = terminal.writes.length;

		await send("x");

		const erased = `${CURSOR_UP.repeat(WRAPPED_ROWS)}${`${CLEAR_LINE}${NEWLINE}`.repeat(
			WRAPPED_ROWS
		)}`;
		const redrawn = writesSince(mark).join("");

		// The row the draft sits on is walked back over and cleared row by row, then written once.
		expect(redrawn).toBe(
			`${erased}${promptPayload(`${WRAPPED_DRAFT}x`, { columns: WRAPPED_COLUMNS })}`
		);
		// One prompt on the grid, never a stack of fragments left above the row being rewritten.
		expect(redrawn.split(PROMPT_ARROW)).toHaveLength(2);
	});

	it("walks back over the same rows on every keystroke of a wrapped draft", async () => {
		await mount();
		terminal.cols = WRAPPED_COLUMNS;
		window.dispatchEvent(new Event("resize"));
		await send(WRAPPED_DRAFT);
		const mark = terminal.writes.length;

		await send("x");
		await send("y");

		const erased = `${CURSOR_UP.repeat(WRAPPED_ROWS)}${`${CLEAR_LINE}${NEWLINE}`.repeat(
			WRAPPED_ROWS
		)}`;
		expect(writesSince(mark).join("")).toBe(
			`${erased}${promptPayload(`${WRAPPED_DRAFT}x`, { columns: WRAPPED_COLUMNS })}` +
				`${erased}${promptPayload(`${WRAPPED_DRAFT}xy`, { columns: WRAPPED_COLUMNS })}`
		);
	});

	it("scrolls a result taller than the screen back to its first line", async () => {
		await mount();
		await send("cat cv.pdf");
		// The newline under the command opens the first row the output is written on.
		const typedOn = terminal.buffer.active.baseY + terminal.buffer.active.cursorY;

		await send(ENTER);

		expect(terminal.scrollToLine).toHaveBeenCalledWith(typedOn + 1);
	});

	it("leaves a short result where the shell left it, at the bottom", async () => {
		await mount();

		await sendLine("pwd");

		expect(terminal.scrollToLine).not.toHaveBeenCalled();
	});

	it("does not scroll a result that landed after the screen went", async () => {
		await mount();
		terminal.held = true;

		await sendLine("cat cv.pdf");
		unmount();
		terminal.releaseWrites();

		expect(terminal.scrollToLine).not.toHaveBeenCalled();
	});
});

describe("TerminalScreen in-flight work", () => {
	it("runs nothing when the line was sent while the document was still coming and the screen went", async () => {
		const load = deferred<CvLoadResult>();
		cv.loadCv.mockReturnValue(load.promise);
		renderScreen();
		await settle();
		await send("pwd");
		await send(ENTER);
		unmount();
		const written = terminal.writes.length;

		load.resolve({ ok: true, sections: CV_SECTIONS });
		await settle();

		expect(terminal.writes).toHaveLength(written);
	});

	it("prints nothing when the portrait lands after the screen went", async () => {
		const decoded = deferred<ReturnType<typeof solidGrid>>();
		await mount();
		portrait.loadPortrait.mockReturnValue(decoded.promise);
		await send("whoami");
		await send(ENTER);
		unmount();
		const written = terminal.writes.length;

		decoded.resolve(solidGrid(8, 8, INK));
		await settle();

		expect(terminal.writes).toHaveLength(written);
	});

	it("does not refit once the webfont lands after the screen went", async () => {
		const ready = deferred<void>();
		Object.defineProperty(document, "fonts", {
			value: { ready: ready.promise },
			configurable: true
		});
		await mount();
		expect(fit.fit).toHaveBeenCalledTimes(1);

		unmount();
		ready.resolve();
		await settle();

		expect(fit.fit).toHaveBeenCalledTimes(1);
	});
});

describe("TerminalScreen completion", () => {
	it("opens the menu on Tab, lists the candidates once and cycles forwards", async () => {
		await mount();
		await send("c");
		const mark = terminal.writes.length;

		await send(TAB);

		const [menu, prompt] = writesSince(mark);
		expect(menu).toContain(NEWLINE);
		expect(menu).toContain("• cat");
		expect(menu).toContain("• cd");
		expect(menu).toContain("• clear");
		// The line shows the first candidate while the menu lists all of them.
		expect(prompt).toBe(promptPayload("cat"));

		const cycled = terminal.writes.length;
		await send(TAB);

		// A cycle rewrites the line only: the menu sits where it was opened.
		expect(writesSince(cycled)).toEqual([promptPayload("cd")]);
	});

	it("walks an open menu backwards and closes it on Escape", async () => {
		await mount();
		await send("c");
		await send(TAB);

		await send(TAB);
		await send(TAB);
		expect(lastPayload()).toBe(promptPayload("clear"));

		const backwards = pressKey({ key: "Tab", shiftKey: true });
		expect(backwards.claimed).toBe(false);
		expect(backwards.event.defaultPrevented).toBe(true);
		await settle();
		expect(lastPayload()).toBe(promptPayload("cd"));

		const closed = pressKey({ key: "Escape" });
		expect(closed.claimed).toBe(false);
		expect(closed.event.defaultPrevented).toBe(true);
		await settle();
		expect(lastPayload()).toBe(promptPayload("cd"));

		// No menu is open now, so Escape belongs to nobody.
		const idle = pressKey({ key: "Escape" });
		expect(idle.claimed).toBe(true);
	});

	it("wraps an open menu at both ends", async () => {
		await mount();
		await send("c");
		await send(TAB);
		await send(TAB);
		await send(TAB);

		await send(TAB);

		expect(lastPayload()).toBe(promptPayload("cat"));
	});

	it("inserts a lone candidate whole, without a menu", async () => {
		await mount();
		await send("wh");
		const mark = terminal.writes.length;

		await send(TAB);

		expect(writesSince(mark)).toEqual([promptPayload("whoami")]);
	});

	it("leaves the line alone when nothing matches", async () => {
		await mount();
		await send("zz");
		const mark = terminal.writes.length;

		await send(TAB);

		expect(writesSince(mark)).toEqual([promptPayload("zz")]);
	});

	it("completes a command before the document lands without printing a menu", async () => {
		const load = deferred<CvLoadResult>();
		cv.loadCv.mockReturnValue(load.promise);
		renderScreen();
		await settle();
		await send("c");
		const mark = terminal.writes.length;

		await send(TAB);

		expect(writesSince(mark)).toEqual([`${CLEAR_LINE}cat`]);
	});
});

describe("TerminalScreen history", () => {
	it("walks back through the history and returns to the draft", async () => {
		await mount();
		await sendLine("pwd");
		await send("ab");

		await send(ARROW_UP);
		expect(lastPayload()).toBe(promptPayload("pwd"));

		await send(ARROW_DOWN);
		expect(lastPayload()).toBe(promptPayload("ab"));
	});
});

describe("TerminalScreen screen keys", () => {
	it("clears the screen on Ctrl+L and reprints the prompt on the cleared grid", async () => {
		await mount();
		await send("abc");
		const mark = terminal.writes.length;

		await send(CTRL_L);

		expect(writesSince(mark)).toEqual([CLEAR_SCREEN, promptPayload("abc")]);
	});

	it("interrupts with Ctrl+C and drops the line", async () => {
		await mount();
		await send("abc");
		const mark = terminal.writes.length;

		await send(CTRL_C);

		expect(writesSince(mark)).toEqual([`${INTERRUPT}${NEWLINE}`, promptPayload("")]);
	});
});

describe("TerminalScreen chords", () => {
	it("deletes a word on Ctrl+Backspace, and one word per press", async () => {
		await mount();
		await send("one two three");

		const deleted = pressKey({ key: "Backspace", ctrlKey: true });

		expect(deleted.claimed).toBe(false);
		expect(deleted.event.defaultPrevented).toBe(true);
		expect(lastPayload()).toBe(promptPayload("one two "));

		const repeated = pressKey({ key: "Backspace", ctrlKey: true, repeat: true });

		// A held chord is claimed and consumed, so the OS's repeats never delete a character.
		expect(repeated.claimed).toBe(false);
		expect(repeated.event.defaultPrevented).toBe(true);
		expect(lastPayload()).toBe(promptPayload("one two "));
	});

	it("decides a chord once, on the press", async () => {
		await mount();
		await send("one two");

		const lifted = pressKey({ key: "Backspace", ctrlKey: true }, "keyup");

		expect(lifted.claimed).toBe(true);
		expect(lifted.event.defaultPrevented).toBe(false);
		expect(lastPayload()).toBe(promptPayload("one two"));
	});

	it("empties the line on Cmd+Backspace", async () => {
		await mount();
		await send("one two");

		const cleared = pressKey({ key: "Backspace", metaKey: true });

		expect(cleared.claimed).toBe(false);
		expect(cleared.event.defaultPrevented).toBe(true);
		expect(lastPayload()).toBe(promptPayload(""));
	});

	it("leaves an ordinary key and a held Tab to the line editor", async () => {
		await mount();
		await send("a");

		const plain = pressKey({ key: "a" });
		const held = pressKey({ key: "Tab", repeat: true });

		expect(plain.claimed).toBe(true);
		expect(held.claimed).toBe(true);
		expect(lastPayload()).toBe(promptPayload("a"));
	});

	it("copies a live selection on Ctrl+C and prints the notice", async () => {
		await mount();
		terminal.selection = "line one";

		const copy = pressKey({ key: "c", ctrlKey: true });
		await nextFrame();

		expect(copy.claimed).toBe(false);
		expect(copy.event.defaultPrevented).toBe(true);
		expect(clipboard.writeText).toHaveBeenCalledWith("line one");
		expect(noticeText()).toBe("copied · 8 chars");
	});

	it("never clobbers the clipboard with a selection that carries no text", async () => {
		await mount();
		terminal.hasSelection.mockReturnValue(true);
		terminal.selection = "";

		const copy = pressKey({ key: "c", ctrlKey: true });

		expect(copy.claimed).toBe(true);
		expect(copy.event.defaultPrevented).toBe(false);
		expect(clipboard.writeText).not.toHaveBeenCalled();
		expect(notice()).toBeNull();
	});

	it("leaves Ctrl+C to the shell when there is no selection", async () => {
		await mount();
		terminal.selection = "";

		const copy = pressKey({ key: "c", ctrlKey: true });

		expect(copy.claimed).toBe(true);
		expect(clipboard.writeText).not.toHaveBeenCalled();
	});
});

describe("TerminalScreen selection", () => {
	it("copies what the drag selected, once per frame", async () => {
		await mount();
		terminal.selection = "one\ntwo";

		await act(async () => {
			terminal.selectionHandler?.();
			terminal.selectionHandler?.();
		});
		await nextFrame();

		expect(clipboard.writeText).toHaveBeenCalledTimes(1);
		expect(clipboard.writeText).toHaveBeenCalledWith("one\ntwo");
		expect(noticeText()).toBe("copied · 2 lines");
	});

	it("leaves the clipboard alone when the selection was cleared", async () => {
		await mount();
		terminal.selection = "";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		expect(clipboard.writeText).not.toHaveBeenCalled();
		expect(notice()).toBeNull();
	});
});

describe("TerminalScreen copy notice", () => {
	it.each([
		{ name: "one character", text: "x", label: "copied · 1 char" },
		{ name: "several characters", text: "hello", label: "copied · 5 chars" },
		{ name: "one line", text: "one line", label: "copied · 8 chars" },
		{ name: "several lines", text: "a\nb\nc", label: "copied · 3 lines" }
	])("labels $name as the shell counts it", async ({ text, label }) => {
		await mount();
		terminal.selection = text;

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		expect(noticeText()).toBe(label);
	});

	it("announces the copy politely and takes it away under reduced motion", async () => {
		await mount();
		terminal.selection = "hello";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		const shown = notice();
		expect(shown).toHaveAttribute("aria-live", "polite");
		expect(shown).toHaveAttribute("aria-atomic", "true");
		// Reduced motion is no arrival and no departure at all.
		expect(shown?.style.transition).toBe("none");

		await advance(NOTICE_HOLD_MS);

		expect(notice()).toBeNull();
	});

	it("fades the notice out when the visitor allows motion", async () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: false }))
		);
		await mount();
		terminal.selection = "hello";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		expect(notice()?.style.transition).toContain(`opacity ${NOTICE_FADE_MS}ms`);

		await advance(NOTICE_HOLD_MS - 1);
		expect(noticeText()).toBe("copied · 5 chars");

		await advance(1);
		expect(notice()).toHaveStyle({ opacity: "0" });

		await advance(NOTICE_FADE_MS);
		expect(notice()).toBeNull();
	});

	it("fades instead of vanishing when the browser cannot say what it prefers", async () => {
		vi.stubGlobal("matchMedia", undefined);
		await mount();
		terminal.selection = "hello";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		expect(notice()?.style.transition).toContain("opacity");

		await advance(NOTICE_HOLD_MS + NOTICE_FADE_MS);

		expect(notice()).toBeNull();
	});

	it("replaces a notice rather than stacking two, restarting the hold", async () => {
		await mount();
		terminal.selection = "one";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();
		await advance(NOTICE_HOLD_MS - 100);

		terminal.selection = "two";
		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		expect(screen.getAllByRole("status")).toHaveLength(1);
		expect(noticeText()).toBe("copied · 3 chars");

		// The first hold would have expired by now; the second one has not.
		await advance(NOTICE_HOLD_MS - 100);
		expect(noticeText()).toBe("copied · 3 chars");
	});

	it("takes the notice back from a fade when something else is copied", async () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: false }))
		);
		await mount();
		terminal.selection = "one";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();
		await advance(NOTICE_HOLD_MS);

		expect(notice()).toHaveStyle({ opacity: "0" });

		terminal.selection = "two";
		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		// The copy being written is the one on screen: the fade it interrupted is gone.
		expect(noticeText()).toBe("copied · 3 chars");
		expect(notice()).toHaveStyle({ opacity: "1" });

		await advance(NOTICE_FADE_MS);

		expect(noticeText()).toBe("copied · 3 chars");
	});

	it("cancels a fade that was still running when the screen went", async () => {
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({ matches: false }))
		);
		await mount();
		terminal.selection = "hello";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();
		await advance(NOTICE_HOLD_MS);
		expect(vi.getTimerCount()).toBe(1);

		unmount();

		expect(vi.getTimerCount()).toBe(0);
	});

	it("cancels a copy that had not been sampled yet when the screen went", async () => {
		const cancelled = vi.spyOn(window, "cancelAnimationFrame");
		await mount();
		terminal.selection = "hello";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		unmount();
		await nextFrame();

		expect(cancelled).toHaveBeenCalledTimes(1);
		expect(clipboard.writeText).not.toHaveBeenCalled();
	});

	it("prints the notice in the fallback type when the shared options name none", async () => {
		const fontFamily = TERMINAL_OPTIONS.fontFamily;
		const fontSize = TERMINAL_OPTIONS.fontSize;
		TERMINAL_OPTIONS.fontFamily = undefined;
		TERMINAL_OPTIONS.fontSize = undefined;

		try {
			await mount();
			terminal.selection = "hello";

			await act(async () => {
				terminal.selectionHandler?.();
			});
			await nextFrame();

			expect(notice()).toHaveStyle({ fontFamily: "monospace", fontSize: "16px" });
		} finally {
			TERMINAL_OPTIONS.fontFamily = fontFamily;
			TERMINAL_OPTIONS.fontSize = fontSize;
		}
	});

	it("paints the notice in the palette the grid is wearing", async () => {
		await mount();
		await sendLine("theme");
		terminal.selection = "hello";

		await act(async () => {
			terminal.selectionHandler?.();
		});
		await nextFrame();

		const shown = notice();
		const amount = shown?.querySelector("span");

		expect(shown).toHaveStyle({ background: THEMES.light.background });
		expect(amount).toHaveStyle({ color: THEMES.light.brightBlack });
	});
});

describe("TerminalScreen notice palette fallback", () => {
	it("falls back to the foreground when the palette names no muted tone", async () => {
		const brightBlack = THEMES.light.brightBlack;
		Object.defineProperty(THEMES.light, "brightBlack", { value: undefined, configurable: true });
		storage.entries.set(THEME_KEY, "light");

		try {
			await mount();
			terminal.selection = "hello";

			await act(async () => {
				terminal.selectionHandler?.();
			});
			await nextFrame();

			expect(notice()?.querySelector("span")).toHaveStyle({
				color: THEMES.light.foreground
			});
		} finally {
			Object.defineProperty(THEMES.light, "brightBlack", {
				value: brightBlack,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
	});
});

describe("TerminalScreen theme", () => {
	it("flips the palette, the page and the remembered choice", async () => {
		await mount();
		const mark = terminal.writes.length;

		await sendLine("theme");

		expect(terminal.options.theme).toEqual(THEMES.light);
		expect(document.body.style.backgroundColor).toBe(THEMES.light.background);
		expect(document.documentElement.style.colorScheme).toBe("light");
		expect(storage.entries.get(THEME_KEY)).toBe("light");
		expect(writesSince(mark).join("")).toContain("theme: light");
		expect(lastPayload()).toBe(promptPayload(""));
	});

	it("flips back to the palette the visit started in", async () => {
		await mount();

		await sendLine("theme");
		await sendLine("theme");

		expect(terminal.options.theme).toEqual(THEMES.dark);
		expect(storage.entries.get(THEME_KEY)).toBe("dark");
		expect(output()).toContain("theme: dark");
	});

	it("opens in the palette the last visit stored", async () => {
		storage.entries.set(THEME_KEY, "light");

		await mount();

		expect(terminal.options.theme).toEqual(THEMES.light);
		expect(document.body.style.backgroundColor).toBe(THEMES.light.background);
	});
});

describe("TerminalScreen whoami", () => {
	it("fetches the portrait on the first line that needs it, never at boot", async () => {
		await mount();
		expect(portrait.loadPortrait).not.toHaveBeenCalled();

		await sendLine("help");
		expect(portrait.loadPortrait).not.toHaveBeenCalled();

		await sendLine("whoami");

		expect(portrait.loadPortrait).toHaveBeenCalledTimes(1);
		expect(portrait.loadPortrait).toHaveBeenCalledWith(PORTRAIT_URL);
		expect(output()).toContain("Current role");
		// The densest ink of the ramp: the face was drawn, not dropped for the facts alone.
		expect(output()).toContain("@");
	});

	it("asks for the portrait once per whoami and draws the same panel twice", async () => {
		await mount();
		await sendLine("whoami");
		const first = terminal.writes.length;

		await sendLine("whoami");

		// The same URL both times is what lets the module's own cache answer the second call.
		expect(portrait.loadPortrait.mock.calls).toEqual([[PORTRAIT_URL], [PORTRAIT_URL]]);
		expect(terminal.writes.length).toBeGreaterThan(first);
		expect(output()).toContain("Current role");
	});

	it("keeps the facts when the grid has no screen to measure", async () => {
		await mount();
		document.querySelector(".xterm-screen")?.remove();

		await sendLine("whoami");

		expect(portrait.loadPortrait).toHaveBeenCalledTimes(1);
		expect(output()).toContain("Current role");
	});
});

describe("TerminalScreen resize", () => {
	it("reflows the prompt for the new width", async () => {
		await mount();
		await send("abcd");
		terminal.cols = NARROW_COLUMNS;

		window.dispatchEvent(new Event("resize"));

		expect(lastPayload()).toBe(promptPayload("abcd", { columns: NARROW_COLUMNS }));
	});

	it("erases a wrapped prompt before writing it again", async () => {
		await mount();
		await send(LONG_DRAFT);
		terminal.cols = NARROW_COLUMNS;

		const mark = terminal.writes.length;
		window.dispatchEvent(new Event("resize"));

		// The wrapped row is walked back over and erased before the prompt is written again.
		expect(writesSince(mark)).toEqual([
			`\x1b[A${CLEAR_LINE}${NEWLINE}`,
			promptPayload(LONG_DRAFT, { columns: NARROW_COLUMNS })
		]);
	});

	it("does not rewrite a prompt laid out for the same width", async () => {
		await mount();
		await send("abcd");
		const mark = terminal.writes.length;

		window.dispatchEvent(new Event("resize"));

		expect(terminal.writes).toHaveLength(mark);
	});

	it("has nothing to reflow before the document lands", async () => {
		const load = deferred<CvLoadResult>();
		cv.loadCv.mockReturnValue(load.promise);
		renderScreen();
		await settle();

		window.dispatchEvent(new Event("resize"));

		expect(terminal.writes).toHaveLength(0);
	});

	it("has nothing to reflow while the prompt is off screen", async () => {
		await mount();
		await send("abc");
		await send(CTRL_L);
		// A resize right after the clear must not print a prompt nobody asked for twice.
		await send(CTRL_C);
		const mark = terminal.writes.length;

		window.dispatchEvent(new Event("resize"));

		expect(terminal.writes).toHaveLength(mark);
	});
});

describe("TerminalScreen export_cv.sh", () => {
	it("plays the beats in order, hands over the file and gives the prompt back", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		const clicked: { href: string | null; download: string; rel: string; attached: boolean }[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement
		) {
			clicked.push({
				href: this.getAttribute("href"),
				download: this.download,
				rel: this.rel,
				attached: document.body.contains(this)
			});
		});
		await mount();
		await send("export_cv.sh");
		const mark = terminal.writes.length;

		await send(ENTER);

		// The command closes its line and then the screen is the script's: no prompt.
		expect(writesSince(mark)).toEqual([NEWLINE]);
		expect(writesSince(mark).join("")).not.toContain("➜");

		await advance(0);
		expect(lastPayload()).toBe(beatPayload(0));

		await advance(BEAT_DELAY_MS);
		expect(lastPayload()).toBe(beatPayload(1));

		await advance(BEAT_DELAY_MS);
		expect(lastPayload()).toBe(beatPayload(2));

		await advance(BEAT_DELAY_MS * (BEAT_COUNT - 3) + PUNCHLINE_HOLD_MS);

		expect(clicked).toHaveLength(1);
		expect(clicked[0]).toEqual({
			href: CV_URL,
			download: DOWNLOAD_NAME,
			rel: "noopener",
			attached: true
		});
		expect(document.querySelector("a[download]")).toBeNull();
		expect(output()).toContain(paintLines(EXPORT_CV_DEBRIEF));
		expect(lastPayload()).toBe(promptPayload(""));
		// The prompt is handed back and given the keyboard with it.
		expect(terminal.focus).toHaveBeenCalledTimes(2);
	});

	it("ignores every key while the script plays", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0);
		await mount();
		await sendLine("export_cv.sh");
		const written = terminal.writes.length;

		const chord = pressKey({ key: "c", ctrlKey: true });
		expect(chord.claimed).toBe(true);
		expect(chord.event.defaultPrevented).toBe(false);

		await send(CTRL_C);
		await send("abc");
		await send("\r");

		expect(terminal.writes).toHaveLength(written);
		expect(clipboard.writeText).not.toHaveBeenCalled();
	});
});

describe("TerminalScreen links", () => {
	it("opens an http link in a new tab without an opener", async () => {
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		await mount();
		const addon = fakes.FakeWebLinksAddon.created.at(-1);

		addon?.activate(linkClick({ ctrlKey: true }), "https://example.test/cv");

		expect(open).toHaveBeenCalledWith("https://example.test/cv", "_blank", "noopener");
	});

	it("hands a mailto link to the OS instead of a tab", async () => {
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		const location = { href: "" };
		Object.defineProperty(window, "location", { value: location, configurable: true });
		await mount();
		const addon = fakes.FakeWebLinksAddon.created.at(-1);

		addon?.activate(linkClick({ metaKey: true }), "mailto:mario@example.test");

		expect(location.href).toBe("mailto:mario@example.test");
		expect(open).not.toHaveBeenCalled();
	});

	it("stays inert on a plain click, so a drag across a link still copies", async () => {
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		const location = { href: "" };
		Object.defineProperty(window, "location", { value: location, configurable: true });
		await mount();
		const addon = fakes.FakeWebLinksAddon.created.at(-1);

		addon?.activate(linkClick(), "https://example.test/cv");
		addon?.activate(linkClick(), "mailto:mario@example.test");

		expect(open).not.toHaveBeenCalled();
		expect(location.href).toBe("");
	});

	it.each([
		{ name: "a javascript: target", target: "javascript:alert(1)" },
		{ name: "a data: target", target: "data:text/html,<h1>hi</h1>" }
	])("drops $name instead of following it", async ({ target }) => {
		const open = vi.spyOn(window, "open").mockImplementation(() => null);
		const location = { href: "" };
		Object.defineProperty(window, "location", { value: location, configurable: true });
		await mount();
		const addon = fakes.FakeWebLinksAddon.created.at(-1);

		addon?.activate(linkClick({ ctrlKey: true }), target);

		// A document hands the browser no scheme it does not own: no tab, no navigation.
		expect(open).not.toHaveBeenCalled();
		expect(location.href).toBe("");
	});
});
