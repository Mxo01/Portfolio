import {
	LOADING_REASON,
	failureLines,
	unavailableLines,
	welcomeLines
} from "@/lib/terminal/content";
import type { Line } from "@/lib/terminal/types";
import {
	ACME,
	BANNER_MINIMUM_COLUMNS,
	BANNER_ROWS,
	BANNER_WIDTH,
	CLOSED_PERIOD,
	CLOSED_TOTAL,
	CV_LOCATION,
	CV_NAME,
	CV_ROLE,
	CV_SECTIONS,
	FIXED_NOW,
	OPEN_SECTIONS,
	OPEN_TOTAL,
	UNDATED_SECTIONS,
	section,
	spansOf,
	textsOf
} from "@/test/fixtures/render";

const testSubject = welcomeLines;

const WIDE = 120;
const NARROW = 45;
/** The banner's first screen, one column short of it, and the art's own width. */
const ART_SCREEN = 39;
const SHORT_OF_ART = 38;
const ART_WIDTH_SCREEN = 37;
const LABEL_WIDTH = "Experience".length;
const GAP = "  ";
/** Where every value starts: past the longest label and the gap `whoami` sets too. */
const VALUE_COLUMN = LABEL_WIDTH + GAP.length;
const STACK_SEPARATOR = " · ";
const ROLE_LABEL = "Role";
const COMPANY_LABEL = "Company";
const LOCATION_LABEL = "Location";
const EXPERIENCE_LABEL = "Experience";
const STACK_LABEL = "Stack";
const ELLIPSIS = "…";
const EMPTY = "";

const FULL_STACK = "TypeScript, React, Node.js";
const DOTTED_STACK = "TypeScript · React · Node.js";

interface Fact {
	readonly label: string;
	readonly value: string;
	readonly tone: string;
}

/** The five facts the splash states, in the order it states them. */
const FACTS: readonly Fact[] = [
	{ label: ROLE_LABEL, value: "Senior Engineer", tone: "plain" },
	{ label: COMPANY_LABEL, value: ACME, tone: "info" },
	{ label: LOCATION_LABEL, value: CV_LOCATION, tone: "plain" },
	{ label: EXPERIENCE_LABEL, value: CLOSED_TOTAL, tone: "plain" },
	{ label: STACK_LABEL, value: DOTTED_STACK, tone: "dim" }
];

function texts(lines: readonly Line[]): readonly string[] {
	return textsOf(lines);
}

/** The row a label opens, or `-1` when the splash does not state that fact at all. */
function rowOf(lines: readonly Line[], label: string): number {
	return texts(lines).findIndex(text => text.startsWith(label));
}

describe("welcomeLines — the banner", () => {
	const cases: readonly { name: string; columns: number; art: boolean }[] = [
		{ name: "a wide screen", columns: WIDE, art: true },
		{ name: "a 45-column screen", columns: NARROW, art: true },
		{ name: "the banner's first screen", columns: ART_SCREEN, art: true },
		{ name: "one column short of the banner", columns: SHORT_OF_ART, art: false },
		{ name: "the art's own width", columns: ART_WIDTH_SCREEN, art: false }
	];

	it.each(cases)("prints the art on $name", ({ columns, art }) => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, columns, FIXED_NOW);

		// THEN the six rows are there exactly when the screen holds them with their margin
		if (art) {
			expect(texts(lines).slice(0, BANNER_ROWS.length)).toEqual([...BANNER_ROWS]);
			expect(spansOf(lines[0] ?? "")).toEqual([{ text: BANNER_ROWS[0], tone: "accent" }]);
			expect(texts(lines)[BANNER_ROWS.length]).toBe(EMPTY);
			return;
		}

		expect(texts(lines).some(text => BANNER_ROWS.includes(text))).toBe(false);
		expect(rowOf(lines, ROLE_LABEL)).toBe(0);
	});

	it("needs the art's own width plus its margin", () => {
		// GIVEN the fixture's transcription of the art
		// THEN the first screen that holds it is the one below which nothing is printed
		expect(BANNER_MINIMUM_COLUMNS).toBe(ART_SCREEN);
		expect(BANNER_WIDTH).toBe(ART_WIDTH_SCREEN);
		expect(rowOf(testSubject(CV_SECTIONS, SHORT_OF_ART, FIXED_NOW), ROLE_LABEL)).toBe(0);
		expect(rowOf(testSubject(CV_SECTIONS, ART_SCREEN, FIXED_NOW), ROLE_LABEL)).toBe(
			BANNER_ROWS.length + 1
		);
	});
});

describe("welcomeLines — the labelled list", () => {
	it("prints the CV's facts under the art, one label per row", () => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, WIDE, FIXED_NOW);

		// THEN
		const start = BANNER_ROWS.length + 1;

		FACTS.forEach((fact, index) => {
			expect(texts(lines)[start + index]).toBe(
				`${fact.label.padEnd(LABEL_WIDTH)}${GAP}${fact.value}`
			);
			expect(spansOf(lines[start + index] ?? "")).toEqual([
				{ text: `${fact.label.padEnd(LABEL_WIDTH)}${GAP}`, tone: "dim" },
				{ text: fact.value, tone: fact.tone }
			]);
		});
	});

	it("starts every value in one column", () => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, WIDE, FIXED_NOW);

		// THEN
		for (const fact of FACTS) {
			const row = texts(lines)[rowOf(lines, fact.label)] ?? "";

			expect(row.slice(VALUE_COLUMN)).toBe(fact.value);
			expect(row.slice(0, VALUE_COLUMN).trimEnd()).toBe(fact.label);
		}
	});

	it("prints the CV's stack dotted, never the comma the document writes", () => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, WIDE, FIXED_NOW);

		// THEN the stack row is the dotted form of the CV's own comma-joined line
		expect(texts(lines)[rowOf(lines, STACK_LABEL)]).toBe(
			`${STACK_LABEL.padEnd(LABEL_WIDTH)}${GAP}${DOTTED_STACK}`
		);
		expect(texts(lines).some(text => text.includes(FULL_STACK))).toBe(false);
		expect(rowOf(lines, FULL_STACK)).toBe(-1);
	});

	it("closes the list with the ways in, then one blank row", () => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, WIDE, FIXED_NOW);

		// THEN
		expect(texts(lines).slice(-3)).toEqual([
			EMPTY,
			["help", "whoami", "cat cv.pdf"].join(STACK_SEPARATOR),
			EMPTY
		]);
	});

	it("prints the hints in the accent, separated by the muted dot", () => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, WIDE, FIXED_NOW);

		// THEN
		expect(spansOf(lines.at(-2) ?? "")).toEqual([
			{ text: "help", tone: "accent" },
			{ text: STACK_SEPARATOR, tone: "dim" },
			{ text: "whoami", tone: "accent" },
			{ text: STACK_SEPARATOR, tone: "dim" },
			{ text: "cat cv.pdf", tone: "accent" }
		]);
	});

	it("reads the open career entry as today's role, company and stack", () => {
		// WHEN
		const lines = testSubject(OPEN_SECTIONS, WIDE, FIXED_NOW);

		// THEN
		expect(texts(lines)).toContain(`${ROLE_LABEL.padEnd(LABEL_WIDTH)}${GAP}Senior Engineer`);
		expect(texts(lines)).toContain(`${COMPANY_LABEL.padEnd(LABEL_WIDTH)}${GAP}${ACME}`);
		expect(texts(lines)).toContain(`${EXPERIENCE_LABEL.padEnd(LABEL_WIDTH)}${GAP}${OPEN_TOTAL}`);
	});

	it("keeps the role the profile states when no period can be read", () => {
		// GIVEN a CV whose every period this shell cannot read
		// WHEN
		const lines = testSubject(UNDATED_SECTIONS, WIDE, FIXED_NOW);

		// THEN the profile's headline still names a role, and no total is invented
		expect(texts(lines)).toContain(`${ROLE_LABEL.padEnd(LABEL_WIDTH)}${GAP}${CV_ROLE}`);
		expect(rowOf(lines, EXPERIENCE_LABEL)).toBe(-1);
		expect(rowOf(lines, COMPANY_LABEL)).toBe(-1);
	});

	it("prints no row for a fact the CV does not state", () => {
		// GIVEN a CV with a header and nothing under it
		const headerOnly = [
			section("Header", [CV_NAME, CV_LOCATION, `${CV_ROLE}  building calm systems`])
		];

		// WHEN
		const lines = testSubject(headerOnly, WIDE, FIXED_NOW);

		// THEN the role and the city print, and the career-derived rows do not exist
		expect(texts(lines)).toContain(`${ROLE_LABEL.padEnd(LABEL_WIDTH)}${GAP}${CV_ROLE}`);
		expect(texts(lines)).toContain(`${LOCATION_LABEL.padEnd(LABEL_WIDTH)}${GAP}${CV_LOCATION}`);
		for (const label of [COMPANY_LABEL, EXPERIENCE_LABEL, STACK_LABEL]) {
			expect(rowOf(lines, label)).toBe(-1);
		}
	});

	it("prints no fact at all for a CV that states none", () => {
		// GIVEN a header with only a name
		// WHEN
		const lines = testSubject([section("Header", [CV_NAME])], WIDE, FIXED_NOW);

		// THEN only the art and the hints remain
		for (const label of [
			ROLE_LABEL,
			COMPANY_LABEL,
			LOCATION_LABEL,
			EXPERIENCE_LABEL,
			STACK_LABEL
		]) {
			expect(rowOf(lines, label)).toBe(-1);
		}
	});

	it("reads the facts from the career alone when the CV states no profile", () => {
		// GIVEN a CV with no header at all
		const careerOnly = [
			section("Experience"),
			section(ACME, [`${ACME}   ${CV_LOCATION}`, `Senior Engineer   ${CLOSED_PERIOD}`])
		];

		// WHEN
		const lines = testSubject(careerOnly, WIDE, FIXED_NOW);

		// THEN
		expect(texts(lines)).toContain(`${ROLE_LABEL.padEnd(LABEL_WIDTH)}${GAP}Senior Engineer`);
		expect(rowOf(lines, LOCATION_LABEL)).toBe(-1);
	});

	it("prints the same block at any calendar moment", () => {
		// GIVEN a CV whose every period is closed
		// WHEN it is read at two different moments
		const now = testSubject(CV_SECTIONS, WIDE, FIXED_NOW);
		const later = testSubject(CV_SECTIONS, WIDE, new Date(2020, 5, 1));

		// THEN the boot and a reprint agree byte for byte
		expect(later).toEqual(now);
	});
});

describe("welcomeLines — the stack", () => {
	it("wraps between names, never inside one", () => {
		// WHEN the value column cannot hold the whole stack
		const lines = testSubject(CV_SECTIONS, ART_SCREEN, FIXED_NOW);

		// THEN the first row ends after a name and the next starts under the value column
		expect(texts(lines).slice(-5, -3)).toEqual([
			`${STACK_LABEL.padEnd(LABEL_WIDTH)}${GAP}TypeScript${STACK_SEPARATOR}React`,
			`${" ".repeat(VALUE_COLUMN)}Node.js`
		]);
	});

	it("never starts or ends a row with the separator", () => {
		// GIVEN a stack that wraps into three rows
		const stacked = [
			section("Header", [CV_NAME]),
			section("Experience"),
			section(ACME, [
				`${ACME}   ${CV_LOCATION}`,
				`Senior Engineer   ${CLOSED_PERIOD}`,
				"Alpha, Beta, Gamma"
			])
		];

		// WHEN
		const lines = testSubject(stacked, 20, FIXED_NOW);

		// THEN
		const factRows = texts(lines).slice(0, -3);

		for (const text of factRows) {
			expect(text.trimEnd().endsWith(STACK_SEPARATOR.trim())).toBe(false);
			expect(text.trimStart().startsWith(STACK_SEPARATOR.trim())).toBe(false);
		}
		expect(factRows.filter(text => text.includes(STACK_SEPARATOR))).toHaveLength(0);
		expect(factRows).toContain(`            Gamma`);
	});

	it("drops the separators the CV leaves empty", () => {
		// GIVEN a stack written with holes in it
		const holed = [
			section("Header", [CV_NAME]),
			section("Experience"),
			section(ACME, [
				`${ACME}   ${CV_LOCATION}`,
				`Senior Engineer   ${CLOSED_PERIOD}`,
				"TypeScript, , React,"
			])
		];

		// WHEN
		const lines = testSubject(holed, WIDE, FIXED_NOW);

		// THEN
		expect(texts(lines)).toContain(
			`${STACK_LABEL.padEnd(LABEL_WIDTH)}${GAP}TypeScript${STACK_SEPARATOR}React`
		);
	});

	it("prints no stack row at all when the CV states only separators", () => {
		// GIVEN a stack line with no technology in it
		const holed = [
			section("Header", [CV_NAME]),
			section("Experience"),
			section(ACME, [`${ACME}   ${CV_LOCATION}`, `Senior Engineer   ${CLOSED_PERIOD}`, ", ,"])
		];

		// WHEN
		const lines = testSubject(holed, WIDE, FIXED_NOW);

		// THEN the fact produces no row, rather than an empty one under the label
		expect(rowOf(lines, STACK_LABEL)).toBe(-1);
	});

	it("prints a name wider than the column whole, on a row of its own", () => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, 20, FIXED_NOW);

		// THEN the name keeps its whole row and the others fall under the value column
		const stackAt = rowOf(lines, STACK_LABEL);

		expect(texts(lines).slice(stackAt, stackAt + 3)).toEqual([
			`${STACK_LABEL.padEnd(LABEL_WIDTH)}${GAP}TypeScript`,
			`${" ".repeat(VALUE_COLUMN)}React`,
			`${" ".repeat(VALUE_COLUMN)}Node.js`
		]);
		expect(texts(lines).some(text => text.includes(ELLIPSIS))).toBe(false);
	});

	it("keeps the whole block as a column on a wide screen", () => {
		// WHEN
		const lines = testSubject(CV_SECTIONS, 200, FIXED_NOW);

		// THEN no row reaches past the welcome width, and the whole stack is one row
		const factRows = texts(lines).filter(text => text.length > 0 && !BANNER_ROWS.includes(text));

		expect(factRows.every(text => text.length <= VALUE_COLUMN + 80)).toBe(true);
		expect(rowOf(lines, STACK_LABEL)).toBe(BANNER_ROWS.length + 1 + FACTS.length - 1);
	});
});

describe("failureLines", () => {
	it("prints the reason alone when there is no offending line", () => {
		// WHEN
		const lines = failureLines("not a CV");

		// THEN
		expect(lines).toEqual([[{ text: "content unavailable: not a CV", tone: "error" }]]);
	});

	it("prints the line that broke the contract under the reason", () => {
		// WHEN
		const lines = failureLines("not a CV", "Header");

		// THEN
		expect(lines).toEqual([
			[{ text: "content unavailable: not a CV", tone: "error" }],
			[{ text: 'offending line: "Header"', tone: "dim" }]
		]);
	});
});

describe("unavailableLines", () => {
	it("says the same sentence a command needs content for", () => {
		// WHEN
		const lines = unavailableLines(LOADING_REASON);

		// THEN
		expect(lines).toEqual([[{ text: "content unavailable: still loading", tone: "error" }]]);
	});
});
