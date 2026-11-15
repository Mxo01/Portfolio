import { buildContent } from "@/lib/content/tree";
import { CV_MAX_COLUMNS, cvLines } from "@/lib/terminal/cv-layout";
import { span } from "@/lib/terminal/lines";
import {
	fileAt,
	fileLines,
	labelLead,
	listingLines,
	treeLines,
	whoamiDetails
} from "@/lib/terminal/output";
import type { ContentDir, ContentFile, Line } from "@/lib/terminal/types";
import {
	ACME,
	BETA,
	BETA_PERIOD,
	CASE_STUDY_LABEL,
	CASE_STUDY_URL,
	CLOSED_PERIOD,
	CV_EMAIL,
	CV_LOCATION,
	CV_MOBILE,
	CV_NAME,
	CV_ROLE,
	CV_SECTIONS,
	GITHUB_URL,
	PORTFOLIO,
	UNIVERSITY,
	dir,
	file,
	lineText,
	section,
	spansOf,
	textsOf
} from "@/test/fixtures/render";

const testSubject = fileLines;
const list = listingLines;
const details = whoamiDetails;

const WIDE = 80;
/** The panel's label column as `whoami` draws it: the widest label in the CV's own words. */
const KEY_WIDTH = 12;
const GAP = "  ";
const VALUE_COLUMN = KEY_WIDTH + GAP.length;
const ELLIPSIS = "…";
const RULE = "─";
const GLYPH_DIM = "dim" as const;
const EMPTY_DIRECTORY = "(empty)";
const CURRENT_ROLE = "Current role";
const INSTITUTION = "Institution";
const PATH_SEPARATOR = "/";

const root: ContentDir = buildContent(CV_SECTIONS);

function treeFile(path: string): ContentFile {
	const found = fileAt(root, path);
	if (found === null) throw new Error(`the fixture tree has no ${path}`);
	return found;
}

function treeDir(path: string): ContentDir {
	const found = root.children.find(node => node.path === path);
	if (found === undefined || found.kind !== "dir") {
		throw new Error(`the fixture tree has no ${path}`);
	}
	return found;
}

/** One label as the panel prints it, padding and gap included. */
function lead(key: string): string {
	return `${key.padEnd(KEY_WIDTH)}${GAP}`;
}

function texts(lines: readonly Line[]): readonly string[] {
	return textsOf(lines);
}

describe("fileLines", () => {
	it("hands the document and its entries to the CV renderer", () => {
		// GIVEN files the CV lays out
		const document = treeFile("/cv.pdf");
		const entry = treeFile("/career/acme-corp");

		// WHEN they are printed
		// THEN the CV renderer decides every row, not the flat layout below
		expect(testSubject(document, WIDE)).toEqual(cvLines(document, WIDE));
		expect(testSubject(entry, WIDE)).toEqual(cvLines(entry, WIDE));
	});

	it("prints a file outside the CV from its own sections", () => {
		// GIVEN a contact file with inline fields, a link annotation and prose
		const contact = file("contact", "/contact", [
			section("Email", [CV_EMAIL]),
			section("Mobile", [CV_MOBILE]),
			section("Links", [`GitHub ${GITHUB_URL}`]),
			section("Notes", ["no annotation here"])
		]);

		// WHEN
		const lines = testSubject(contact, WIDE);

		// THEN the fields sit in one column, the blocks are ruled by their titles, and the
		// address travels only behind the label
		expect(lines).toEqual([
			[span("Email   ", "dim"), { text: CV_EMAIL, tone: "plain", href: `mailto:${CV_EMAIL}` }],
			[span("Mobile  ", "dim"), { text: CV_MOBILE, tone: "plain" }],
			"",
			[span("Links", "heading")],
			[{ text: "GitHub", tone: "plain", href: GITHUB_URL }],
			"",
			[span("Notes", "heading")],
			"no annotation here"
		]);
	});

	it("opens a file that starts with a block without a leading blank row", () => {
		// GIVEN
		const summary = file("summary", "/about/summary", [
			section("Summary", ["Builds calm systems"])
		]);

		// WHEN
		const lines = testSubject(summary, WIDE);

		// THEN
		expect(lines).toEqual([[span("Summary", "heading")], "Builds calm systems"]);
	});

	it("wraps a link label that cannot fit and drops its target with it", () => {
		// GIVEN an annotation whose label is wider than the screen
		const annotated = file("links", "/links", [
			section("Links", [`${CASE_STUDY_LABEL} and architecture notes ${CASE_STUDY_URL}`])
		]);

		// WHEN
		const lines = testSubject(annotated, 20);

		// THEN the label prints whole above the grid's width, and no address is the text
		expect(texts(lines)).toEqual(["Links", "Case study and", "architecture notes"]);
		expect(texts(lines).some(text => text.includes("https://"))).toBe(false);
	});

	it("lays out at the CV's cap when the caller gives no columns", () => {
		// GIVEN
		const annotated = file("links", "/links", [
			section("Links", [`${CASE_STUDY_LABEL} ${CASE_STUDY_URL}`])
		]);

		// WHEN
		// THEN
		expect(testSubject(annotated)).toEqual(testSubject(annotated, CV_MAX_COLUMNS));
	});

	it("prints nothing for a file with no sections", () => {
		// GIVEN
		const empty = file("empty", "/empty", []);

		// WHEN
		// THEN
		expect(testSubject(empty, WIDE)).toEqual([]);
	});
});

describe("listingLines", () => {
	it("prints a directory as its entries, one teaser each", () => {
		// GIVEN the CV's career
		const career = treeDir("/career");

		// WHEN
		const lines = list(career, WIDE);

		// THEN every entry is its name, its role, its period and its first highlight
		expect(texts(lines)).toEqual([
			ACME,
			"Senior Engineer",
			CLOSED_PERIOD,
			"Led the platform rewrite",
			"",
			BETA,
			"Engineer",
			BETA_PERIOD,
			"Shipped the billing service"
		]);
		expect(spansOf(lines[0] ?? "")).toEqual([{ text: ACME, tone: "heading" }]);
		expect(spansOf(lines[3] ?? "")).toEqual([{ text: "Led the platform rewrite", tone: "dim" }]);
	});

	it("prints an empty directory as one word", () => {
		// GIVEN a directory with nothing in it
		const empty = dir("empty", "/empty", []);

		// WHEN
		const lines = list(empty, WIDE);

		// THEN
		expect(lines).toEqual([[span(EMPTY_DIRECTORY, "dim")]]);
	});

	it("prints an empty directory that only holds other directories as empty too", () => {
		// GIVEN
		const nested = dir("nested", "/nested", [dir("inner", "/nested/inner", [])]);

		// WHEN
		// THEN
		expect(texts(list(nested, WIDE))).toEqual([EMPTY_DIRECTORY]);
	});

	it("cuts a teaser at the columns it was given", () => {
		// GIVEN the same career on a narrow screen
		const career = treeDir("/career");

		// WHEN
		const lines = list(career, 20);

		// THEN no row outgrows the screen, and a cut teaser ends on the ellipsis
		expect(texts(lines).every(text => text.length <= 20)).toBe(true);
		expect(texts(lines)).toContain(`Led the platform${ELLIPSIS}`);
		expect(texts(lines)).toContain(`Shipped the billing${ELLIPSIS}`);
	});

	it("cuts a teaser that has no space to break on", () => {
		// GIVEN one word longer than the screen
		const words = dir("words", "/words", [
			file("long", "/words/long", [
				section("Name", ["Long"]),
				section("Highlights", ["Supercalifragilisticexpialidocious"])
			])
		]);

		// WHEN
		const lines = list(words, 10);

		// THEN
		expect(texts(lines)[1]).toBe(`Supercalif${ELLIPSIS}`);
	});

	it("caps the teaser at the listing's own width", () => {
		// GIVEN a screen wider than the listing may get
		const career = treeDir("/career");

		// WHEN
		// THEN the teaser is not cut for a 200-column screen
		expect(texts(list(career, 200))).toEqual(texts(list(career, WIDE)));
		expect(texts(list(career, 200))).toContain("Led the platform rewrite");
	});

	it("prints an entry with no name section as its own file name", () => {
		// GIVEN a file with no sections at all
		const bare = dir("bare", "/bare", [file("bare", "/bare/bare", [])]);

		// WHEN
		const lines = list(bare, WIDE);

		// THEN
		expect(texts(lines)).toEqual(["bare"]);
		expect(spansOf(lines[0] ?? "")).toEqual([{ text: "bare", tone: "heading" }]);
	});

	it("reads a section title as the name when the entry states none", () => {
		// GIVEN a file whose only section is a stack
		const stacked = dir("stacked", "/stacked", [
			file("stacked", "/stacked/stacked", [section("Stack", ["TypeScript"])])
		]);

		// WHEN
		const lines = list(stacked, WIDE);

		// THEN
		expect(texts(lines)).toEqual(["Stack", "TypeScript"]);
	});

	it("reads a project's stack and an education entry's degree as the meta line", () => {
		// GIVEN the CV's two groups
		const projects = treeDir("/projects");
		const education = treeDir("/education");

		// WHEN
		const projectTexts = texts(list(projects, WIDE));
		const educationTexts = texts(list(education, WIDE));

		// THEN
		expect(projectTexts).toContain(PORTFOLIO);
		expect(projectTexts).toContain("TypeScript, React");
		expect(educationTexts).toContain(UNIVERSITY);
		expect(educationTexts).toContain("MSc Computer Engineering");
	});

	it("reads a summary and a city as the teaser when there is no highlight", () => {
		// GIVEN the CV's about directory
		const about = treeDir("/about");

		// WHEN
		const lines = list(about, WIDE);

		// THEN
		expect(texts(lines)).toEqual([
			CV_NAME,
			CV_ROLE,
			CV_LOCATION,
			"",
			"Summary",
			`${CV_ROLE}  building calm systems`
		]);
	});

	it("lays out at the CV's cap when the caller gives no columns", () => {
		// GIVEN
		const career = treeDir("/career");

		// WHEN
		// THEN
		expect(list(career)).toEqual(list(career, CV_MAX_COLUMNS));
	});
});

describe("treeLines", () => {
	it("draws the root first, then every node under it", () => {
		// WHEN
		const lines = treeLines(root);

		// THEN
		expect(texts(lines)[0]).toBe(PATH_SEPARATOR);
		expect(lines[0]).toBe(PATH_SEPARATOR);
		expect(texts(lines)).toContain(`├── about${PATH_SEPARATOR}`);
		expect(texts(lines)).toContain(`│   ├── profile`);
		expect(texts(lines).at(-1)).toBe("└── export_cv.sh");
	});

	it("marks directories with a slash and files without one", () => {
		// WHEN
		const lines = treeLines(root);

		// THEN
		for (const directory of ["about", "career", "education", "projects"]) {
			expect(spansOf(lines.find(line => lineText(line).includes(directory)) ?? "")).toContainEqual({
				text: `${directory}${PATH_SEPARATOR}`,
				tone: "accent"
			});
		}
		expect(spansOf(lines.find(line => lineText(line) === "└── export_cv.sh") ?? "")).toEqual([
			{ text: "└── ", tone: GLYPH_DIM },
			{ text: "export_cv.sh", tone: "plain" }
		]);
	});

	it("keeps a last directory's children four spaces in", () => {
		// GIVEN a tree whose only directory is its last child
		const only = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			dir("only", "/only", [file("leaf", "/only/leaf")])
		]);

		// WHEN
		const lines = treeLines(only);

		// THEN
		expect(texts(lines)).toEqual([PATH_SEPARATOR, `└── only${PATH_SEPARATOR}`, "    └── leaf"]);
	});

	it("closes a nested directory with the glyph its position earns", () => {
		// GIVEN two directories, one closed, one still open
		const tree = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			dir("first", "/first", [file("a", "/first/a")]),
			dir("second", "/second", [file("b", "/second/b")])
		]);

		// WHEN
		const lines = treeLines(tree);

		// THEN
		expect(texts(lines)).toEqual([
			PATH_SEPARATOR,
			`├── first${PATH_SEPARATOR}`,
			"│   └── a",
			`└── second${PATH_SEPARATOR}`,
			"    └── b"
		]);
	});
});

describe("whoamiDetails", () => {
	it("prints one label per row, the value in one column", () => {
		// WHEN
		const rows = details(root, WIDE);

		// THEN the name opens the panel, ruled, and every fact follows in CV order
		expect(rows).toHaveLength(16);
		expect(rows[0]).toEqual([span(CV_NAME, "heading")]);
		expect(rows[1]).toEqual([span(RULE.repeat(CV_NAME.length), "dim")]);
		expect(rows[2]).toEqual([]);
		expect(rows[3]).toEqual([span(lead("Role"), "dim"), span(CV_ROLE)]);
		expect(rows[4]).toEqual([span(lead("Location"), "dim"), span(CV_LOCATION)]);
		expect(rows[5]).toEqual([]);
		expect(rows[6]).toEqual([span(lead(CURRENT_ROLE), "dim"), span(`Senior Engineer · ${ACME}`)]);
		expect(rows[7]).toEqual([span(lead("Period"), "dim"), span(CLOSED_PERIOD)]);
		expect(rows[8]).toEqual([
			span(lead("Email"), "dim"),
			{ text: CV_EMAIL, tone: "plain", href: `mailto:${CV_EMAIL}` }
		]);
		expect(rows[9]).toEqual([span(lead("Mobile"), "dim"), span(CV_MOBILE)]);
		expect(rows[10]).toEqual([
			span(lead(""), "dim"),
			{ text: "GitHub", tone: "plain", href: GITHUB_URL }
		]);
		expect(rows[11]).toEqual([]);
		expect(rows[12]).toEqual([span(lead("Degree"), "dim"), span("MSc Computer Engineering")]);
		expect(rows[13]).toEqual([span(lead(INSTITUTION), "dim"), span(UNIVERSITY)]);
		expect(rows[14]).toEqual([span(lead("Period"), "dim"), span("Sep 2014 – Jul 2017")]);
		expect(rows[15]).toEqual([span(lead("Grade"), "dim"), span("110/110")]);
	});

	it("starts every value in the same column", () => {
		// WHEN
		const rows = details(root, WIDE);

		// THEN every labelled row gives its label exactly the column and its value the rest
		const labelled = rows.filter(row => row.length === 2 && row[0]?.tone === GLYPH_DIM);

		expect(labelled.length).toBeGreaterThan(0);
		for (const [label, value] of labelled) {
			expect(label?.text).toHaveLength(VALUE_COLUMN);
			expect(label?.text).toBe(label?.text.trimEnd().padEnd(VALUE_COLUMN));
			expect(value?.text.startsWith(" ")).toBe(false);
		}
	});

	it("never prints an address as text", () => {
		// WHEN
		const rows = details(root, WIDE);

		// THEN every target travels behind a label
		expect(texts(rows).some(text => text.includes("https://"))).toBe(false);
		const linked = rows.flatMap(row => row).filter(run => run.href !== undefined);

		expect(linked.map(run => run.href)).toEqual([`mailto:${CV_EMAIL}`, GITHUB_URL]);
		expect(linked.map(run => run.text)).toEqual([CV_EMAIL, "GitHub"]);
	});

	it("stacks the label above the value when the screen cannot hold both", () => {
		// WHEN the value column would be narrower than a value worth printing
		const rows = details(root, 25);

		// THEN the label takes a row of its own and the value starts under it
		expect(rows[3]).toEqual([span("Role:", "dim")]);
		expect(texts(rows).slice(4, 6)).toEqual([CV_ROLE, "Location:"]);
	});

	it("keeps the label beside the value at the first width that fits both", () => {
		// WHEN
		const rows = details(root, 26);

		// THEN
		expect(rows[3]).toEqual([span(lead("Role"), "dim"), span("Software")]);
		expect(rows[4]).toEqual([span(" ".repeat(VALUE_COLUMN), "dim"), span("Engineer")]);
	});

	it("wraps a long value under its own column and keeps every target", () => {
		// WHEN the address cannot fit beside its label
		const rows = details(root, 30);

		// THEN it breaks inside the address and both rows still point at it
		const addressRows = rows.filter(row => row.some(run => run.href === `mailto:${CV_EMAIL}`));

		expect(addressRows.map(row => row[1]?.text)).toEqual(["mario@example.co", "m"]);
		expect(
			addressRows.every(row =>
				row.every(run => run.href === undefined || run.href === `mailto:${CV_EMAIL}`)
			)
		).toBe(true);
	});

	it("continues a wrapped value under the value column, never under the label", () => {
		// WHEN the current role cannot share its row with its label
		const rows = details(root, 30);

		// THEN
		expect(texts(rows).slice(7, 9)).toEqual([
			`${lead(CURRENT_ROLE)}Senior Engineer`,
			`${" ".repeat(VALUE_COLUMN)}· Acme Corp`
		]);
		expect(rows[8]?.[0]).toEqual(span(" ".repeat(VALUE_COLUMN), "dim"));
	});

	it("cuts the name rather than print past the screen", () => {
		// GIVEN a name wider than the panel
		const named = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			dir("about", "/about", [
				file("profile", "/about/profile", [section("Name", ["N".repeat(40)])])
			])
		]);

		// WHEN
		const rows = details(named, 24);

		// THEN the rule stops at the screen and the name ends on an ellipsis
		expect(rows[0]).toEqual([span(`${"N".repeat(23)}${ELLIPSIS}`, "heading")]);
		expect(rows[1]).toEqual([span(RULE.repeat(24), "dim")]);
	});

	it("keeps a one-column rule when the screen has no columns", () => {
		// WHEN
		const rows = details(root, 0);

		// THEN
		expect(rows[1]).toEqual([span(RULE, "dim")]);
		expect(texts(rows).every(text => text.length <= 1)).toBe(true);
	});

	it("prints no row for a fact the CV does not state", () => {
		// GIVEN a CV with a name and a role and nothing else
		const sparse = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			dir("about", "/about", [
				file("profile", "/about/profile", [section("Name", [CV_NAME]), section("Role", [CV_ROLE])])
			])
		]);

		// WHEN
		const rows = details(sparse, WIDE);

		// THEN only the name block and the role survive, with the separators in place
		expect(rows).toEqual([
			[span(CV_NAME, "heading")],
			[span(RULE.repeat(CV_NAME.length), "dim")],
			[],
			[span(lead("Role"), "dim"), span(CV_ROLE)],
			[],
			[]
		]);
	});

	it("reads no career or education from a node that is not a group directory", () => {
		// GIVEN a career that is a file and an education group holding no file
		const odd = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			dir("about", "/about", [file("profile", "/about/profile", [section("Name", [CV_NAME])])]),
			file("career", "/career", [section("Role", ["Not an entry"])]),
			dir("education", "/education", [dir("empty", "/education/empty", [])])
		]);

		// WHEN
		const rows = details(odd, WIDE);

		// THEN neither group contributes a row
		expect(texts(rows)).toEqual([CV_NAME, RULE.repeat(CV_NAME.length), "", "", ""]);
	});

	it("prints a link annotation as its label and skips a line that is not one", () => {
		// GIVEN a contact file whose links block carries prose and an annotation
		const annotated = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			file("contact", "/contact", [
				section("Links", ["a line, with punctuation", `Case study ${CASE_STUDY_URL}`])
			])
		]);

		// WHEN
		const rows = details(annotated, WIDE);

		// THEN only the annotation survives: the label once, in the value column, with its
		// target behind it and no key column repeating it
		expect(rows).toEqual([
			[],
			[span(lead(""), "dim"), { text: CASE_STUDY_LABEL, tone: "plain", href: CASE_STUDY_URL }],
			[]
		]);
	});

	it("wraps a link label under the value column, never beside a repeat of itself", () => {
		// GIVEN a label wider than the value column it is printed in
		const annotated = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			file("contact", "/contact", [
				section("Links", [`${CASE_STUDY_LABEL} and architecture notes ${CASE_STUDY_URL}`])
			])
		]);

		// WHEN
		const rows = details(annotated, 30);

		// THEN every row is the label under the value column, and no address is the text
		const linked = rows.filter(row => row.some(run => run.href === CASE_STUDY_URL));

		expect(texts(linked)).toEqual([
			`${lead("")}Case study and`,
			`${lead("")}architecture`,
			`${lead("")}notes`
		]);
		expect(texts(rows).some(text => text.includes("https://"))).toBe(false);
	});

	it("keeps a wrapped link's target on every row it produces", () => {
		// GIVEN a label too wide for the first row of its own column
		const label = "Case studies and notes";
		const annotated = dir(PATH_SEPARATOR, PATH_SEPARATOR, [
			file("contact", "/contact", [section("Links", [`${label} ${CASE_STUDY_URL}`])])
		]);

		// WHEN
		const rows = details(annotated, 30);

		// THEN
		const linked = rows.filter(row => row.some(run => run.href === CASE_STUDY_URL));

		expect(linked.map(row => row[1]?.text)).toEqual(["Case studies and", "notes"]);
		expect(linked.every(row => row[1]?.href === CASE_STUDY_URL)).toBe(true);
	});

	it("gives a link a row of its own when the value column is too narrow", () => {
		// WHEN the panel stacks every value under its label
		const rows = details(root, 25);

		// THEN the link prints once, at the screen's margin, with its target intact
		expect(rows.find(row => row.some(run => run.href === GITHUB_URL))).toEqual([
			{ text: "GitHub", tone: "plain", href: GITHUB_URL }
		]);
	});
});

describe("labelLead", () => {
	it.each([
		{ name: "a key narrower than the column", key: "Name", width: KEY_WIDTH },
		{ name: "a key exactly the column", key: "Current role", width: KEY_WIDTH },
		{ name: "a key wider than the column", key: "Institution", width: 10 },
		{ name: "no key at all", key: "", width: 4 }
	])("pads $name and adds the gap", ({ key, width }) => {
		// WHEN
		const printed = labelLead(key, width);

		// THEN
		expect(printed).toBe(`${key.padEnd(width)}${GAP}`);
		expect(printed.length).toBe(Math.max(key.length, width) + GAP.length);
	});
});

describe("fileAt", () => {
	it("finds a file by absolute path", () => {
		// WHEN
		const found = fileAt(root, "/about/profile");

		// THEN
		expect(found?.path).toBe("/about/profile");
	});

	it("hands back nothing for a directory", () => {
		// WHEN
		// THEN
		expect(fileAt(root, "/career")).toBeNull();
	});

	it("hands back nothing for a path the tree does not hold", () => {
		// WHEN
		// THEN
		expect(fileAt(root, "/nowhere")).toBeNull();
	});
});
