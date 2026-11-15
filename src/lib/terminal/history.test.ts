import { HISTORY_LIMIT } from "@/lib/terminal/constants";
import { historyDown, historyUp, remember } from "@/lib/terminal/history";
import type { ShellSession } from "@/lib/terminal/types";
import { fixtureSession } from "@/test/fixtures/terminal";

const up = historyUp;
const down = historyDown;
const record = remember;

const FIRST = "pwd";
const SECOND = "ls career";
const THIRD = "cat cv.pdf";
const THREE: readonly string[] = [FIRST, SECOND, THIRD];

interface HistoryCase {
	readonly name: string;
	readonly session: ShellSession;
	readonly expectedIndex: number | null;
	readonly expectedDraft: string;
}

const UP_CASES: readonly HistoryCase[] = [
	{
		name: "keeps an empty history as it is",
		session: fixtureSession(),
		expectedIndex: null,
		expectedDraft: ""
	},
	{
		name: "steps back onto the newest entry",
		session: fixtureSession({ history: THREE }),
		expectedIndex: THREE.length - 1,
		expectedDraft: THIRD
	},
	{
		name: "steps back one entry from a browse position",
		session: fixtureSession({ history: THREE, historyIndex: 2 }),
		expectedIndex: 1,
		expectedDraft: SECOND
	},
	{
		name: "stays on the oldest entry",
		session: fixtureSession({ history: THREE, historyIndex: 0 }),
		expectedIndex: 0,
		expectedDraft: FIRST
	},
	{
		name: "drops a pending draft instead of stashing it",
		session: fixtureSession({ history: THREE, draft: "half typed" }),
		expectedIndex: THREE.length - 1,
		expectedDraft: THIRD
	}
];

const DOWN_CASES: readonly HistoryCase[] = [
	{
		name: "does nothing on the draft",
		session: fixtureSession({ history: THREE }),
		expectedIndex: null,
		expectedDraft: ""
	},
	{
		name: "steps forward one entry",
		session: fixtureSession({ history: THREE, historyIndex: 0 }),
		expectedIndex: 1,
		expectedDraft: SECOND
	},
	{
		name: "returns to an empty prompt past the newest entry",
		session: fixtureSession({ history: THREE, historyIndex: THIRD.length - 1 }),
		expectedIndex: null,
		expectedDraft: ""
	}
];

describe("historyUp", () => {
	it.each(UP_CASES)("$name", ({ session, expectedIndex, expectedDraft }) => {
		// WHEN
		const next = up(session);

		// THEN
		expect(next.historyIndex).toBe(expectedIndex);
		expect(next.draft).toBe(expectedDraft);
	});

	it("hands an empty history back unchanged", () => {
		// GIVEN
		const session = fixtureSession();

		// WHEN
		const next = up(session);

		// THEN
		expect(next).toBe(session);
	});

	it("hands a browse position past the end back unchanged", () => {
		// GIVEN a session the arrows cannot have produced
		const session = fixtureSession({ history: THREE, historyIndex: HISTORY_LIMIT });

		// WHEN
		const next = up(session);

		// THEN
		expect(next).toBe(session);
	});
});

describe("historyDown", () => {
	it.each(DOWN_CASES)("$name", ({ session, expectedIndex, expectedDraft }) => {
		// WHEN
		const next = down(session);

		// THEN
		expect(next.historyIndex).toBe(expectedIndex);
		expect(next.draft).toBe(expectedDraft);
	});

	it("hands the draft back unchanged", () => {
		// GIVEN
		const session = fixtureSession({ history: THREE });

		// WHEN
		const next = down(session);

		// THEN
		expect(next).toBe(session);
	});
});

describe("remember", () => {
	it.each([
		{ name: "an empty command", command: "", expected: THREE },
		{ name: "a command of spaces", command: "   ", expected: THREE },
		{ name: "a repeat of the newest entry", command: THIRD, expected: THREE },
		{ name: "a repeat with padding trimmed", command: `  ${THIRD}  `, expected: THREE }
	])("skips $name", ({ command, expected }) => {
		// WHEN
		const history = record(THREE, command);

		// THEN
		expect(history).toEqual(expected);
	});

	it("hands an unchanged history back as the same list", () => {
		// WHEN
		const history = record(THREE, THIRD);

		// THEN
		expect(history).toBe(THREE);
	});

	it("appends a new command at the end", () => {
		// GIVEN
		const command = "tree";

		// WHEN
		const history = record(THREE, command);

		// THEN
		expect(history).toEqual([...THREE, command]);
	});

	it("caps the list at the history limit, dropping the oldest", () => {
		// GIVEN a full history
		const full: readonly string[] = Array.from(
			{ length: HISTORY_LIMIT },
			(_value, index) => `${FIRST} ${index}`
		);

		// WHEN
		const history = record(full, "welcome");

		// THEN
		expect(history).toHaveLength(HISTORY_LIMIT);
		expect(history.at(0)).toBe(full.at(1));
		expect(history.at(-1)).toBe("welcome");
	});
});
