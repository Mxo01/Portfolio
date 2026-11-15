import { buildContent } from "@/lib/content/tree";
import { CV_MAX_COLUMNS, cvLines, wrapText } from "@/lib/terminal/cv-layout";
import { fileAt } from "@/lib/terminal/output";
import type { ContentDir, ContentFile, Line } from "@/lib/terminal/types";
import {
	ACME,
	ACME_SLUG,
	BETA,
	CASE_STUDY_URL,
	CLOSED_PERIOD,
	CV_EMAIL,
	CV_LOCATION,
	CV_MOBILE,
	CV_NAME,
	CV_ROLE,
	CV_SECTIONS,
	PORTFOLIO,
	PORTFOLIO_SLUG,
	SITE_URL,
	TERMINAL,
	UNIVERSITY,
	UNIVERSITY_SLUG,
	file,
	lineText,
	section,
	spansOf,
	textsOf
} from "@/test/fixtures/render";

const testSubject = cvLines;

const RULE = "─";
const BULLET_LEAD = "  • ";
const BULLET_INDENT = "    ";
const FIELD_SEPARATOR = " · ";
const WIDE = 80;

const root: ContentDir = buildContent(CV_SECTIONS);
const documentFile = file("cv.pdf", "/cv.pdf", CV_SECTIONS);

function rendered(subject: ContentFile, columns: number): readonly Line[] {
	const lines = testSubject(subject, columns);
	if (lines === null) throw new Error(`expected ${subject.path} to be rendered as part of the CV`);
	return lines;
}

function renderedTexts(subject: ContentFile, columns: number): readonly string[] {
	return textsOf(rendered(subject, columns));
}

/** A file of the tree by absolute path; the fixtures are known to exist. */
function treeFile(path: string): ContentFile {
	const found = fileAt(root, path);
	if (found === null) throw new Error(`the fixture tree has no ${path}`);
	return found;
}

describe("cvLines — the 80-column cap", () => {
	const cases: readonly { name: string; columns: number; width: number }[] = [
		{ name: "a phone-sized screen", columns: 40, width: 40 },
		{ name: "a narrow desktop", columns: 60, width: 60 },
		{ name: "exactly the cap", columns: CV_MAX_COLUMNS, width: CV_MAX_COLUMNS },
		{ name: "one column past the cap", columns: 81, width: CV_MAX_COLUMNS },
		{ name: "a wide terminal", columns: 200, width: CV_MAX_COLUMNS }
	];

	it.each(cases)("never prints a row wider than $width on $name", ({ columns, width }) => {
		// GIVEN the document and a screen of `columns`
		// WHEN it is laid out
		const lines = rendered(documentFile, columns);

		// THEN every row stops at the text block, and the rules are exactly its width
		expect(textsOf(lines).every(text => text.length <= width)).toBe(true);
		expect(textsOf(lines).filter(text => text.startsWith(RULE))).toEqual([
			RULE.repeat(width),
			RULE.repeat(width),
			RULE.repeat(width),
			RULE.repeat(width),
			RULE.repeat(width)
		]);
	});

	it("falls back to the cap when the screen width is not a number", () => {
		expect(renderedTexts(documentFile, Number.NaN)).toEqual(
			renderedTexts(documentFile, CV_MAX_COLUMNS)
		);
	});

	it("keeps a one-column text block when the screen has none", () => {
		expect(textsOf(rendered(documentFile, 0))[0]).toBe(RULE);
	});
});

describe("cvLines — the header block", () => {
	it("rules the header and closes it with a second rule", () => {
		const lines = rendered(documentFile, WIDE);
		const texts = textsOf(lines);

		// GIVEN the document's header: two rules, and the facts a reader needs between them
		expect(texts[0]).toBe(RULE.repeat(WIDE));
		expect(spansOf(lines[0] ?? "")).toEqual([{ text: RULE.repeat(WIDE), tone: "dim" }]);
		expect(texts[4]).toBe(RULE.repeat(WIDE));
	});

	it("puts the city against the right edge of the name row", () => {
		const row = lineText(rendered(documentFile, WIDE)[1] ?? "");

		expect(row).toHaveLength(WIDE);
		expect(row.startsWith(CV_NAME)).toBe(true);
		expect(row.endsWith(CV_LOCATION)).toBe(true);
	});

	it("drops the city to its own row when the name leaves no room", () => {
		const texts = renderedTexts(documentFile, 20);
		const first = texts.findIndex(text => text.includes(CV_LOCATION));

		expect(texts[first]).toBe(" ".repeat(20 - CV_LOCATION.length) + CV_LOCATION);
	});

	it("prints the contact fields on one row, the address behind the email", () => {
		const lines = rendered(documentFile, WIDE);
		const contact = lines.find(line => lineText(line).includes(CV_EMAIL));

		expect(spansOf(contact ?? "")).toEqual([
			{ text: CV_EMAIL, tone: "dim", href: `mailto:${CV_EMAIL}` },
			{ text: FIELD_SEPARATOR, tone: "dim" },
			{ text: CV_MOBILE, tone: "dim" }
		]);
	});

	it("loses the targets when the contact row cannot fit", () => {
		const lines = rendered(documentFile, 20);
		const texts = textsOf(lines);
		const contact = lines.filter(line => lineText(line).includes(CV_EMAIL));

		expect(texts.some(text => text.includes(CV_EMAIL))).toBe(true);
		expect(texts.every(text => text.length <= 20)).toBe(true);
		expect(contact.every(line => spansOf(line).every(run => run.href === undefined))).toBe(true);
	});

	it("reads a labelled city back as the city", () => {
		const labelled = file("cv.pdf", "/cv.pdf", [
			section("Header", [CV_NAME, `Location: ${CV_LOCATION}`, `${CV_ROLE}  and prose`]),
			section("Experience"),
			section(ACME, [`${ACME}   ${CV_LOCATION}`, `Senior Engineer   ${CLOSED_PERIOD}`])
		]);

		const row = lineText(rendered(labelled, WIDE)[1] ?? "");

		expect(row.endsWith(CV_LOCATION)).toBe(true);
	});

	it("keeps every labelled contact cell on one row", () => {
		const contact = file("cv.pdf", "/cv.pdf", [
			section("Header", [CV_NAME]),
			section("Contact", ["Email: someone@example.com | Mobile: 123"]),
			section("Experience"),
			section(ACME, [`${ACME}   ${CV_LOCATION}`, `Senior Engineer   ${CLOSED_PERIOD}`])
		]);

		const row = rendered(contact, WIDE).find(line =>
			lineText(line).includes("someone@example.com")
		);

		expect(spansOf(row ?? "")).toEqual([
			{ text: "someone@example.com", tone: "dim", href: "mailto:someone@example.com" },
			{ text: FIELD_SEPARATOR, tone: "dim" },
			{ text: "123", tone: "dim" }
		]);
	});

	it("prints no header block at all when the document states no name", () => {
		const anonymous = file("cv.pdf", "/cv.pdf", [
			section("Header", [""]),
			section("Experience"),
			section(ACME, [`${ACME}   ${CV_LOCATION}`, `Senior Engineer   ${CLOSED_PERIOD}`])
		]);

		expect(renderedTexts(anonymous, WIDE)[0]).toBe("EXPERIENCE");
	});

	it("skips prose that no section opens", () => {
		const stray = file("cv.pdf", "/cv.pdf", [
			section("Header", [""]),
			section("Contact", ["Email: someone@example.com"]),
			section("Aside", ["a line above the first marker"]),
			section("Experience"),
			section(ACME, [`${ACME}   ${CV_LOCATION}`, `Senior Engineer   ${CLOSED_PERIOD}`])
		]);

		expect(renderedTexts(stray, WIDE).some(text => text.includes("above the first marker"))).toBe(
			false
		);
	});

	it("prints the sections alone when the document states no name", () => {
		const headerless = file("cv.pdf", "/cv.pdf", [
			section("Header"),
			section("Experience"),
			section(ACME, [`${ACME}   ${CV_LOCATION}`, `Senior Engineer   ${CLOSED_PERIOD}`])
		]);
		const texts = renderedTexts(headerless, WIDE);

		expect(texts[0]).toBe("EXPERIENCE");
		expect(texts[1]).toBe(RULE.repeat(WIDE));
	});
});

describe("cvLines — sections and entries", () => {
	it("prints a caps heading over a rule for each of the three groups", () => {
		const texts = renderedTexts(documentFile, WIDE);

		for (const heading of ["EXPERIENCE", "PROJECTS", "EDUCATION"]) {
			const at = texts.indexOf(heading);
			expect(at).toBeGreaterThan(-1);
			expect(texts[at + 1]).toBe(RULE.repeat(WIDE));
			expect(texts[at + 2]).toBe("");
		}
	});

	it("prints a name once per entry", () => {
		const texts = renderedTexts(documentFile, WIDE);

		for (const name of [ACME, BETA, PORTFOLIO, TERMINAL, UNIVERSITY]) {
			expect(texts.filter(text => text.includes(name))).toHaveLength(1);
		}
	});

	it("moves the project's own link onto the row where the name already is", () => {
		const lines = rendered(documentFile, WIDE);
		const header = lines.find(line => lineText(line).startsWith(PORTFOLIO));

		expect(spansOf(header ?? "").some(run => run.href === SITE_URL)).toBe(true);
		expect(textsOf(lines).some(text => text.includes(SITE_URL))).toBe(false);
	});

	it("prints a differently labelled link under the entry", () => {
		const lines = rendered(documentFile, WIDE);
		const link = lines.find(line => lineText(line) === "Case study");

		expect(spansOf(link ?? "")).toEqual([
			{ text: "Case study", tone: "dim", href: CASE_STUDY_URL }
		]);
	});

	it("separates two entries of one group with a blank row", () => {
		const texts = renderedTexts(documentFile, WIDE);
		const lastBullet = texts.indexOf(
			BULLET_LEAD + "Cut the build to under a minute on every branch"
		);

		expect(lastBullet).toBeGreaterThan(-1);
		expect(texts[lastBullet + 1]).toBe("");
		expect(texts[lastBullet + 2]?.startsWith(BETA)).toBe(true);
	});
});

describe("cvLines — the bullets", () => {
	const text = "Cut the build to under a minute on every branch";

	it("hangs a wrapped bullet under its own text", () => {
		const texts = renderedTexts(documentFile, 40);
		const first = texts.findIndex(row => row.startsWith(BULLET_LEAD + "Cut the build"));
		const row = texts[first] ?? "";
		const continuation = texts[first + 1] ?? "";

		// GIVEN a bullet wider than the text block
		expect(row.startsWith(BULLET_LEAD)).toBe(true);
		// THEN its continuation starts at column 4, never at 0
		expect(continuation.startsWith(BULLET_INDENT)).toBe(true);
		expect([row.slice(BULLET_LEAD.length), continuation.trim()].join(" ")).toBe(text);
	});

	it("prints one glyph per bullet, never the document's", () => {
		const texts = renderedTexts(documentFile, WIDE);

		expect(texts.filter(row => row.startsWith(BULLET_LEAD))).toHaveLength(5);
		expect(texts.every(row => row.startsWith("•") === false)).toBe(true);
	});

	it("prints no row for a bullet that carries no text", () => {
		const entry = file("x", "/career/x", [
			section("Name", ["X"]),
			section("Highlights", ["• ", "• a real bullet"])
		]);

		expect(renderedTexts(entry, WIDE)).toEqual(["X", BULLET_LEAD + "a real bullet"]);
	});
});

describe("cvLines — the stack and the meta line", () => {
	const stacked = file("x", "/career/x", [
		section("Name", ["X"]),
		section("Role", ["Senior Engineer"]),
		section("Period", [CLOSED_PERIOD]),
		section("Stack", ["TypeScript, React, Node.js"])
	]);

	it("prints the role and the period on one dim row, joined by the CV's dot", () => {
		const lines = rendered(treeFile(`/career/${ACME_SLUG}`), WIDE);

		expect(lineText(lines[1] ?? "")).toBe(`Senior Engineer${FIELD_SEPARATOR}${CLOSED_PERIOD}`);
		expect(spansOf(lines[1] ?? "")).toEqual([
			{ text: `Senior Engineer${FIELD_SEPARATOR}${CLOSED_PERIOD}`, tone: "dim" }
		]);
	});

	it("breaks the meta row where the dot is when it cannot fit", () => {
		const texts = renderedTexts(stacked, 20);

		expect(texts[1]).toBe("Senior Engineer");
		expect(texts[2]).toBe(CLOSED_PERIOD);
	});

	it("prints a role without a period, and a period without a role", () => {
		const roleOnly = file("x", "/career/x", [
			section("Name", ["X"]),
			section("Role", ["Engineer"])
		]);
		const periodOnly = file("y", "/career/y", [
			section("Name", ["Y"]),
			section("Role", ["   "]),
			section("Period", [CLOSED_PERIOD])
		]);

		expect(renderedTexts(roleOnly, WIDE)).toEqual(["X", "Engineer"]);
		expect(renderedTexts(periodOnly, WIDE)).toEqual(["Y", CLOSED_PERIOD]);
	});

	it("wraps the stack under the entry when it cannot fit", () => {
		const texts = renderedTexts(stacked, 20);

		expect(texts[3]).toBe("TypeScript, React,");
		expect(texts[4]).toBe("Node.js");
	});
});

describe("cvLines — one entry file", () => {
	it("reads a career entry as the fields the projection derived", () => {
		const texts = renderedTexts(treeFile(`/career/${ACME_SLUG}`), WIDE);

		expect(texts[0]).toHaveLength(WIDE);
		expect(texts[0]?.startsWith(ACME)).toBe(true);
		expect(texts).toContain(BULLET_LEAD + "Led the platform rewrite");
		expect(texts.some(text => text.includes("https://"))).toBe(false);
	});

	it("gives a project entry its own target on the name row", () => {
		const lines = rendered(treeFile(`/projects/${PORTFOLIO_SLUG}`), WIDE);
		const header = lines[0];

		expect(spansOf(header ?? "").some(run => run.href === SITE_URL)).toBe(true);
		expect(textsOf(lines).some(text => text.includes(SITE_URL))).toBe(false);
		expect(textsOf(lines)).toContain("Case study");
	});

	it("reads an education entry's degree as its role, then the grade", () => {
		const texts = renderedTexts(treeFile(`/education/${UNIVERSITY_SLUG}`), WIDE);

		expect(texts[1]).toBe(`MSc Computer Engineering${FIELD_SEPARATOR}Sep 2014 – Jul 2017`);
		expect(texts[2]).toBe("110/110");
	});

	it("keeps the notes an education entry states after its grade", () => {
		const entry = file("x", "/education/x", [
			section("Name", [UNIVERSITY]),
			section("Degree", ["MSc"]),
			section("Grade", ["110/110"]),
			section("Notes", ["Thesis on compilers"])
		]);

		expect(renderedTexts(entry, WIDE)).toEqual([
			UNIVERSITY,
			"MSc",
			"110/110",
			"Thesis on compilers"
		]);
	});

	it("reads an entry file that carries the document's own block instead", () => {
		const block = file("block", `/career/${ACME_SLUG}`, [
			section(ACME, [
				`${ACME}   ${CV_LOCATION}`,
				`Senior Engineer   ${CLOSED_PERIOD}`,
				"TypeScript, React",
				"• Led the platform rewrite"
			])
		]);

		const texts = renderedTexts(block, WIDE);

		expect(texts[0]?.startsWith(ACME)).toBe(true);
		expect(texts[1]).toBe(`Senior Engineer${FIELD_SEPARATOR}${CLOSED_PERIOD}`);
		expect(texts[2]).toBe("TypeScript, React");
		expect(texts[3]).toBe(BULLET_LEAD + "Led the platform rewrite");
	});

	it("reads a project block's stack from the headline beside its name", () => {
		const block = file("block", `/projects/${PORTFOLIO_SLUG}`, [
			section(PORTFOLIO, [`${PORTFOLIO}   TypeScript, React`, "• Built a terminal"])
		]);

		expect(renderedTexts(block, WIDE)).toEqual([
			PORTFOLIO,
			"TypeScript, React",
			BULLET_LEAD + "Built a terminal"
		]);
	});

	it("reads an education block's grade and notes", () => {
		const block = file("block", `/education/${UNIVERSITY_SLUG}`, [
			section(UNIVERSITY, [
				`${UNIVERSITY}   ${CV_LOCATION}`,
				"MSc Computer Engineering   Sep 2014 – Jul 2017",
				"110/110",
				"Thesis on compilers"
			])
		]);

		expect(renderedTexts(block, WIDE)).toContain("110/110");
		expect(renderedTexts(block, WIDE)).toContain("Thesis on compilers");
	});

	it("takes a bullet where the stack would sit as the entry's first bullet", () => {
		const block = file("block", `/career/${ACME_SLUG}`, [
			section(ACME, [
				`${ACME}   ${CV_LOCATION}`,
				`Senior Engineer   ${CLOSED_PERIOD}`,
				"• Led the platform rewrite"
			])
		]);

		const texts = renderedTexts(block, WIDE);

		expect(texts).toHaveLength(3);
		expect(texts[2]).toBe(BULLET_LEAD + "Led the platform rewrite");
	});

	it("takes a link where the stack would sit as a link, not a stack", () => {
		const block = file("block", `/career/${ACME_SLUG}`, [
			section(ACME, [
				`${ACME}   ${CV_LOCATION}`,
				`Senior Engineer   ${CLOSED_PERIOD}`,
				`Case study ${CASE_STUDY_URL}`
			])
		]);

		expect(renderedTexts(block, WIDE)).toContain("Case study");
		expect(renderedTexts(block, WIDE).some(text => text.includes("https://"))).toBe(false);
	});

	it("prints a link's label alone when the label cannot fit", () => {
		const block = file("block", `/projects/${PORTFOLIO_SLUG}`, [
			section(PORTFOLIO, [
				`${PORTFOLIO}   TypeScript`,
				`Case study and architecture notes ${CASE_STUDY_URL}`
			])
		]);
		const lines = rendered(block, 20);

		expect(textsOf(lines).some(text => text.includes("https://"))).toBe(false);
		expect(lines.every(line => lineText(line).length <= 20)).toBe(true);
	});

	it("prints an entry file's link that is not an annotation as prose", () => {
		const entry = file("x", "/career/x", [
			section("Name", ["X"]),
			section("Links", ["a line the document did not annotate"])
		]);

		expect(renderedTexts(entry, WIDE)).toEqual(["X", "a line the document did not annotate"]);
	});

	it("prints an entry file with no sections as an empty name row", () => {
		expect(renderedTexts(file("x", `/career/${ACME_SLUG}`), WIDE)).toEqual([""]);
	});

	it("prints an entry whose name section is empty as a name with no text", () => {
		const entry = file("x", "/career/x", [section("Name"), section("Location", [CV_LOCATION])]);
		const lines = rendered(entry, WIDE);

		expect(spansOf(lines[0] ?? "")[0]).toEqual({ text: "", tone: "accent" });
		expect(lineText(lines[0] ?? "")).toBe(" ".repeat(WIDE - CV_LOCATION.length) + CV_LOCATION);
	});

	it("wraps a name that outgrows the text block", () => {
		const entry = file("x", "/career/x", [
			section("Name", ["A company whose name runs past the column"]),
			section("Location", [CV_LOCATION])
		]);
		const texts = renderedTexts(entry, 20);

		expect(texts.length).toBeGreaterThan(1);
		expect(texts.every(text => text.length <= 20)).toBe(true);
	});
});

describe("cvLines — files outside the CV", () => {
	it("hands back nothing for a file that is neither the document nor an entry", () => {
		expect(testSubject(treeFile("/about/profile"), WIDE)).toBeNull();
		expect(testSubject(file("x", "/elsewhere/x", [section("Name", ["X"])]), WIDE)).toBeNull();
	});

	it("renders the document the projection built", () => {
		const document = treeFile("/cv.pdf");

		expect(renderedTexts(document, WIDE).some(text => text.startsWith(ACME))).toBe(true);
	});
});

describe("wrapText", () => {
	const subject = wrapText;

	const cases: readonly {
		name: string;
		text: string;
		columns: number;
		expected: readonly string[];
	}[] = [
		{ name: "an empty line", text: "", columns: 10, expected: [] },
		{ name: "one word that fits", text: "hello", columns: 10, expected: ["hello"] },
		{ name: "words that fit together", text: "a b c", columns: 10, expected: ["a b c"] },
		{ name: "a break on a word boundary", text: "aaa bbb", columns: 5, expected: ["aaa", "bbb"] },
		{
			name: "a word wider than the line",
			text: "abcdefgh",
			columns: 3,
			expected: ["abc", "def", "gh"]
		},
		{
			name: "a broken word's tail joining the next word",
			text: "abcdefg h",
			columns: 3,
			expected: ["abc", "def", "g h"]
		},
		{ name: "runs of whitespace collapsed", text: "a   b", columns: 10, expected: ["a b"] },
		{ name: "a fractional width floored", text: "abcd", columns: 2.9, expected: ["ab", "cd"] },
		{ name: "a screen with no columns", text: "ab", columns: 0, expected: ["a", "b"] }
	];

	it.each(cases)("wraps $name", ({ text, columns, expected }) => {
		expect(subject(text, columns)).toEqual(expected);
	});

	it("never returns a row wider than the columns it was given", () => {
		const rows = subject("the quick brown fox jumps over the lazy dog", 7);

		expect(rows.every(row => row.length <= 7)).toBe(true);
		expect(rows.join(" ")).toBe("the quick brown fox jumps over the lazy dog");
	});
});
