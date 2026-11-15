import {
	CLEAR_LINE,
	CLEAR_SCREEN,
	NEWLINE,
	bullets,
	paintLine,
	paintLines,
	paintText
} from "@/features/terminal/ansi";
import type { Line, Tone } from "@/lib/terminal/types";

const testSubject = paintLine;
const paint = paintLine;
const paintAll = paintLines;

const RESET = "\x1b[0m";
const LINK_STOP = "\x1b\\";
const TARGET = "https://example.com/cv";

const TONE_CODES: readonly { readonly tone: Tone; readonly code: string }[] = [
	{ tone: "plain", code: "" },
	{ tone: "heading", code: "\x1b[1;33m" },
	{ tone: "dim", code: "\x1b[90m" },
	{ tone: "accent", code: "\x1b[33m" },
	{ tone: "error", code: "\x1b[31m" },
	{ tone: "success", code: "\x1b[32m" },
	{ tone: "info", code: "\x1b[36m" }
];

function link(href: string, text: string): string {
	return `\x1b]8;;${href}${LINK_STOP}${text}\x1b]8;;${LINK_STOP}`;
}

describe("paintLine", () => {
	it("writes a bare string as it stands", () => {
		// WHEN
		const painted = testSubject("career");

		// THEN
		expect(painted).toBe("career");
	});

	it.each(TONE_CODES)("maps $tone to its own code", ({ tone, code }) => {
		// GIVEN one run of text in one register
		const line: Line = [{ text: "career", tone }];

		// WHEN
		const painted = paint(line);

		// THEN
		expect(painted).toBe(code === "" ? "career" : `${code}career${RESET}`);
	});

	it("joins the runs of a mixed line", () => {
		// GIVEN
		const line: Line = [
			{ text: "about", tone: "accent" },
			{ text: " ", tone: "dim" },
			{ text: "profile", tone: "plain" }
		];

		// WHEN
		const painted = paint(line);

		// THEN
		expect(painted).toBe(`\x1b[33mabout${RESET}\x1b[90m ${RESET}profile`);
	});

	it("writes a run that carries a target as an OSC 8 link", () => {
		// GIVEN
		const line: Line = [{ text: "the CV", href: TARGET }];

		// WHEN
		const painted = paint(line);

		// THEN
		expect(painted).toBe(link(TARGET, "the CV"));
	});

	it("keeps the register around a link", () => {
		// GIVEN
		const line: Line = [{ text: "the CV", tone: "accent", href: TARGET }];

		// WHEN
		const painted = paint(line);

		// THEN
		expect(painted).toBe(`\x1b[33m${link(TARGET, "the CV")}${RESET}`);
	});
});

describe("paintText", () => {
	it("paints one run as a span of the given register", () => {
		// WHEN
		const painted = paintText("dim", "career");

		// THEN
		expect(painted).toBe(`\x1b[90mcareer${RESET}`);
	});
});

describe("paintLines", () => {
	it("ends every row with the carriage return xterm needs", () => {
		// WHEN
		const painted = paintAll(["about", [{ text: "career", tone: "accent" }]]);

		// THEN
		expect(painted).toBe(`about${NEWLINE}\x1b[33mcareer${RESET}${NEWLINE}`);
	});

	it("writes nothing for no rows", () => {
		// WHEN
		const painted = paintAll([]);

		// THEN
		expect(painted).toBe("");
	});
});

describe("bullets", () => {
	it("puts the shell's own bullet in front of every line", () => {
		// WHEN
		const listed = bullets(["one", "two"]);

		// THEN
		expect(listed).toEqual(["• one", "• two"]);
	});
});

describe("screen sequences", () => {
	it.each([
		{ name: "clearing the line", sequence: CLEAR_LINE, expected: "\r\x1b[2K" },
		{ name: "clearing the screen", sequence: CLEAR_SCREEN, expected: "\x1b[2J\x1b[H" }
	])("$name writes the sequence the terminal expects", ({ sequence, expected }) => {
		// THEN
		expect(sequence).toBe(expected);
	});
});
