import { HOME_PATH } from "@/lib/terminal/constants";
import { PROMPT_ARROW, displayPath, promptRow, rowWidth } from "@/lib/terminal/prompt";
import type { PromptState } from "@/lib/terminal/prompt";

const testSubject = promptRow;
const path = displayPath;
const width = rowWidth;

const HOME: PromptState = { cwd: HOME_PATH, failed: false };
const FAILED: PromptState = { cwd: HOME_PATH, failed: true };
const ARROW_GAP = "  ";
const LINE_GAP = " ";
const TILDE = "~";
const ELLIPSIS = "…";
/** robbyrussell's air in front of the draft: arrow, gap, path, gap. */
const CHROME_COLUMNS = PROMPT_ARROW.length + ARROW_GAP.length + LINE_GAP.length;
/** The prompt keeps this much of the row free for what is being typed. */
const TYPING_ROOM = 2;
const PHONE_COLUMNS = 45;

describe("displayPath", () => {
	it.each([
		{ name: "home", cwd: HOME_PATH, expected: TILDE },
		{ name: "a directory below home", cwd: "/career", expected: "career" },
		{ name: "a nested directory", cwd: "/career/acme-corp", expected: "acme-corp" },
		{ name: "a path with a trailing slash", cwd: "/career/", expected: "career" },
		{ name: "an empty path", cwd: "", expected: TILDE },
		{ name: "a path of separators alone", cwd: "///", expected: TILDE }
	])("prints $name as its last segment", ({ cwd, expected }) => {
		expect(path(cwd)).toBe(expected);
	});
});

describe("promptRow", () => {
	it("opens the line with the arrow, the home leaf and one space", () => {
		// WHEN
		const row = testSubject(HOME, 80, "");

		// THEN
		expect(row).toEqual([
			{ text: `${PROMPT_ARROW}${ARROW_GAP}`, tone: "success" },
			{ text: TILDE, tone: "info" },
			{ text: LINE_GAP, tone: "dim" }
		]);
	});

	it("prints the colour the last line earned", () => {
		// WHEN
		const row = testSubject(FAILED, 80, "");

		// THEN
		expect(row[0]).toEqual({ text: `${PROMPT_ARROW}${ARROW_GAP}`, tone: "error" });
	});

	it("names the directory the visitor is in", () => {
		// GIVEN
		const career: PromptState = { cwd: "/career", failed: false };

		// WHEN
		const row = testSubject(career, 80, "");

		// THEN
		expect(row[1]).toEqual({ text: "career", tone: "info" });
		expect(row.map(run => run.text).join("")).toBe(`${PROMPT_ARROW}${ARROW_GAP}career${LINE_GAP}`);
	});

	it("keeps the whole prompt on one row", () => {
		// WHEN
		const row = testSubject(FAILED, 80, "cat cv.pdf");

		// THEN
		expect(row.every(run => typeof run.text === "string")).toBe(true);
		expect(row.map(run => run.text).join("")).toBe(
			`${PROMPT_ARROW}${ARROW_GAP}${TILDE}${LINE_GAP}cat cv.pdf`
		);
	});
});

describe("promptRow — the draft", () => {
	it("paints nothing past the prompt for an empty line", () => {
		// WHEN
		const row = testSubject(HOME, 80, "");

		// THEN
		expect(row).toHaveLength(3);
	});

	it("paints a command in the arrow's own colour", () => {
		// WHEN
		const row = testSubject(HOME, 80, "ls");

		// THEN
		expect(row.at(-1)).toEqual({ text: "ls", tone: "success" });
	});

	it("paints a command's arguments muted, the gap before them included", () => {
		// WHEN
		const row = testSubject(HOME, 80, "cat cv.pdf");

		// THEN
		expect(row.slice(-2)).toEqual([
			{ text: "cat", tone: "success" },
			{ text: " cv.pdf", tone: "dim" }
		]);
	});

	it("reads the first whitespace as the end of the command", () => {
		// WHEN
		const row = testSubject(HOME, 80, "cat\tcv.pdf");

		// THEN
		expect(row.slice(-2)).toEqual([
			{ text: "cat", tone: "success" },
			{ text: "\tcv.pdf", tone: "dim" }
		]);
	});

	it("paints a line that opens with a space as one muted draft", () => {
		// WHEN
		const row = testSubject(HOME, 80, " pwd");

		// THEN
		expect(row.at(-1)).toEqual({ text: " pwd", tone: "dim" });
	});
});

describe("the row at 45 columns", () => {
	const LONG_LEAF = "a".repeat(60);
	const DEEP: PromptState = { cwd: `/${LONG_LEAF}`, failed: false };

	it("keeps the chrome inside the screen and the typing room beside it", () => {
		// WHEN
		const row = testSubject(DEEP, PHONE_COLUMNS, "");

		// THEN the chrome stops two columns short of the edge
		expect(width(row)).toBe(PHONE_COLUMNS - TYPING_ROOM);
		expect(row[1]?.text).toHaveLength(PHONE_COLUMNS - CHROME_COLUMNS - TYPING_ROOM);
	});

	it("shortens a long leaf from the front, keeping its tail", () => {
		// WHEN
		const row = testSubject(DEEP, PHONE_COLUMNS, "");

		// THEN
		expect(row[1]?.text.startsWith(ELLIPSIS)).toBe(true);
		expect(row[1]?.text.endsWith(LONG_LEAF.slice(-1))).toBe(true);
	});

	it("fills the row exactly when the draft uses the room it kept", () => {
		// WHEN
		const row = testSubject(DEEP, PHONE_COLUMNS, "ls");

		// THEN
		expect(width(row)).toBe(PHONE_COLUMNS);
	});

	it("cuts a leaf to the ellipsis alone when the screen has no room", () => {
		// WHEN
		const row = testSubject(DEEP, 4, "");
		const narrow = testSubject(DEEP, 5, "");

		// THEN
		expect(row[1]?.text).toBe(ELLIPSIS);
		expect(narrow[1]?.text).toBe(ELLIPSIS);
	});

	it("leaves a leaf that exactly fits its budget alone", () => {
		// GIVEN a six-column leaf on a screen that leaves it six columns
		const career: PromptState = { cwd: "/career", failed: false };

		// WHEN
		const row = testSubject(career, 12, "");

		// THEN
		expect(row[1]?.text).toBe("career");
		expect(row[1]?.text).not.toContain(ELLIPSIS);
	});
});

describe("rowWidth", () => {
	it("counts every cell the row occupies", () => {
		// WHEN
		const row = testSubject(HOME, 80, "ls");
		const total = row.reduce((sum, run) => sum + run.text.length, 0);

		// THEN
		expect(width(row)).toBe(total);
	});

	it("measures an empty row as nothing", () => {
		// WHEN
		// THEN
		expect(width([])).toBe(0);
	});
});
