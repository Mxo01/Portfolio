import {
	sectionValue,
	TITLE_NAME,
	TITLE_PERIOD,
	TITLE_HIGHLIGHTS,
	TITLE_SUMMARY,
	TITLE_STACK,
	TITLE_ROLE,
	TITLE_DEGREE,
	TITLE_GRADE,
	TITLE_EMAIL,
	TITLE_MOBILE,
	TITLE_LINKS,
	TITLE_LOCATION
} from "@/lib/content/tree";

import { HOME_PATH } from "./constants";
import { CV_MAX_COLUMNS, cvLines, wrapText } from "./cv-layout";
import { blank, dim, heading, plain, span } from "./lines";
import { resolvePath } from "./path";
import type { ContentDir, ContentFile, ContentSection, Line, Span, Tone, TreeNode } from "./types";

const TITLE_GAP = "  ";
const EMPTY_DIRECTORY = "(empty)";
const BULLET = /^•\s+/;
const ELLIPSIS = "…";
/** One teaser line in a directory listing; the file itself keeps the whole bullet. */
const TEASER_COLUMNS = 78;

/** The `whoami` panel: one field per row, the label in a fixed column. */
const DETAILS_KEY_WIDTH = 12;
const DETAILS_GAP = "  ";
/** A value narrower than this is not worth sitting beside its label: the key stacks above it. */
const MINIMUM_VALUE_COLUMNS = 12;
const HEADER_RULE = "─";
const FIELD_SEPARATOR = " · ";
/** The CV states the label and the target together; nothing about a link is inferred. */
const LINK_LINE = /^([A-Za-z][A-Za-z ]*)\s+(\S+)$/;
/** The scheme an address is reached through; the address itself stays the CV's own. */
const MAILTO = "mailto:";
const PROFILE_PATH = "/about/profile";
const CONTACT_PATH = "/contact";
const CAREER_PATH = "/career";
const EDUCATION_PATH = "/education";

/** Titles that read as one line next to the value; every other section is a block. */
const INLINE_TITLES: ReadonlySet<string> = new Set([
	TITLE_NAME,
	TITLE_ROLE,
	TITLE_PERIOD,
	TITLE_LOCATION,
	TITLE_STACK,
	TITLE_DEGREE,
	"Grade",
	"Email",
	"Mobile"
]);

/**
 * A file as the CV prints it. The document and its entries are laid out by the CV renderer;
 * anything else — the profile, the summary, the contact block — prints its fields as they
 * stand. `columns` is the screen the caller is painting; without one, the CV's own cap.
 */
export function fileLines(file: ContentFile, columns: number = CV_MAX_COLUMNS): readonly Line[] {
	const cv = cvLines(file, columns);
	if (cv !== null) return cv;

	const width = titleWidth(file.sections);

	return file.sections.flatMap((section, index) => [
		...(isBlock(section) && index > 0 ? [blank()] : []),
		...sectionLines(section, width, columns)
	]);
}

/** A directory as its entries: name, then the line that tells them apart. */
export function listingLines(dir: ContentDir, columns: number = CV_MAX_COLUMNS): readonly Line[] {
	const files = dir.children.filter((child): child is ContentFile => child.kind === "file");
	if (files.length === 0) return [dim(EMPTY_DIRECTORY)];

	const width = Math.min(columns, TEASER_COLUMNS);

	return files.flatMap((file, index) => [
		...(index === 0 ? [] : [blank()]),
		...entryLines(file, width)
	]);
}

/** The tree with the glyphs a `tree` prints, in the order the CV states. */
export function treeLines(root: ContentDir): readonly Line[] {
	const lines: Line[] = [plain(root.name)];
	appendChildren(root, "", lines);
	return lines;
}

/** The two labels the panel adds on top of the CV's own section titles. */
const CURRENT_ROLE = "Current role";
const INSTITUTION = "Institution";

/**
 * `whoami`'s right-hand column: the CV's facts, one field per row, labels in a fixed
 * column so the values line up under each other and under the art.
 *
 * Every value is a string the document produced — the profile's name, role and city, the
 * contact file's email, mobile and links, the current career entry's role and period, the
 * first education entry's degree, institution, dates and grade. Nothing else: no host,
 * no kernel, no uptime, no package count. A section the CV does not have produces no row,
 * so a shorter CV prints a shorter panel instead of an empty line.
 *
 * The name opens the panel as its title, because the art has to start somewhere and a
 * header the CV did not state would be the one invented line on the screen.
 */
export function whoamiDetails(root: ContentDir, columns: number): readonly (readonly Span[])[] {
	const width = Math.max(1, columns);
	const profile = fileAt(root, PROFILE_PATH);
	const contact = fileAt(root, CONTACT_PATH);
	const career = firstFile(root, CAREER_PATH);
	const education = firstFile(root, EDUCATION_PATH);
	const name = value(profile, TITLE_NAME);
	const email = value(contact, TITLE_EMAIL);

	const rows: (readonly Span[])[] = [
		...(name === undefined
			? []
			: [
					[span(name, "heading")],
					[span(HEADER_RULE.repeat(Math.min(name.length, width)), "dim")],
					[]
				]),
		...field(TITLE_ROLE, value(profile, TITLE_ROLE), width),
		...field(TITLE_LOCATION, value(profile, TITLE_LOCATION), width),
		[],
		...field(CURRENT_ROLE, joined(value(career, TITLE_ROLE), value(career, TITLE_NAME)), width),
		...field(TITLE_PERIOD, value(career, TITLE_PERIOD), width),
		...field(TITLE_EMAIL, email, width, mailto(email)),
		...field(TITLE_MOBILE, value(contact, TITLE_MOBILE), width),
		...linkFields(contact, width),
		[],
		...field(TITLE_DEGREE, value(education, TITLE_DEGREE), width),
		...field(INSTITUTION, value(education, TITLE_NAME), width),
		...field(TITLE_PERIOD, value(education, TITLE_PERIOD), width),
		...field(TITLE_GRADE, value(education, TITLE_GRADE), width)
	];

	return rows.map(row => truncated(row, width));
}

/** One field row cut to the screen: a value that cannot fit ends on an ellipsis, never off-screen. */
function truncated(row: readonly Span[], columns: number): readonly Span[] {
	const width = Math.max(1, columns);

	if (row.reduce((sum, part) => sum + part.text.length, 0) <= width) return row;

	const fitted: Span[] = [];
	let remaining = width;

	for (const part of row) {
		/*
		 * A row the panel truncates is the title or a rule: one span. A field row is wrapped at
		 * exactly the column it has left, so nothing it holds can overflow — which is why the
		 * budget is never exhausted with a span still to place.
		 */
		/* v8 ignore start */
		if (remaining <= 0) break;
		if (part.text.length <= remaining) {
			fitted.push(part);
			remaining -= part.text.length;
			continue;
		}
		/* v8 ignore stop */

		fitted.push({ ...part, text: `${part.text.slice(0, remaining - 1)}${ELLIPSIS}` });
		remaining = 0;
	}

	return fitted;
}

/**
 * The CV's link annotations as rows: the label the document gives is what a reader sees, and
 * the target it points at travels behind it as `href`. The label is the whole row — a key
 * column repeating it would print the same word twice — so it sits in the panel's value
 * column, where every other value starts. The address is never the text.
 */
function linkFields(file: ContentFile | null, columns: number): readonly (readonly Span[])[] {
	const section = file?.sections.find(candidate => candidate.title === TITLE_LINKS);
	if (section === undefined) return [];

	return section.body.flatMap(line => {
		const match = LINK_LINE.exec(line);
		if (match === null) return [];

		const [, label = "", url = ""] = match;
		return linkRow(label, url, columns);
	});
}

/**
 * One link, printed once: a value aligned in the panel's value column, wrapped under it like
 * any other value and keeping its target on every row. Narrower than a value column, it takes
 * a row of its own at the screen's margin, exactly as a stacked field does.
 */
function linkRow(label: string, href: string, columns: number): readonly (readonly Span[])[] {
	const visible = label.trim();
	const indent = labelLead("", DETAILS_KEY_WIDTH);
	const valueColumns = columns - indent.length;

	if (valueColumns < MINIMUM_VALUE_COLUMNS) {
		return wrapText(visible, columns).map(line => [linkSpan(line, href)]);
	}

	return wrapText(visible, valueColumns).map(line => [span(indent, "dim"), linkSpan(line, href)]);
}

/** The email as the address book reaches it, so the address itself is never retyped. */
function mailto(address: string | undefined): string | undefined {
	return address === undefined || address.trim().length === 0
		? undefined
		: `${MAILTO}${address.trim()}`;
}

/** A value that is also a target: the text is what the CV prints, `href` is where it goes. */
function linkSpan(text: string, href: string | undefined, tone: Tone = "plain"): Span {
	return href === undefined ? span(text, tone) : { text, tone, href };
}

/**
 * What sits in front of a value: the label padded to the column its panel gives labels, then
 * the gap that separates the two. Exported because the splash draws the same two panels'
 * worth of fields, and a label and its value must sit the same distance apart on both.
 */
export function labelLead(key: string, keyWidth: number): string {
	return `${key.padEnd(keyWidth)}${DETAILS_GAP}`;
}

/**
 * One labelled field, wrapped under its own value column so a long address or URL stays
 * readable on a narrow screen instead of being cut where it matters. Too narrow for that,
 * and the label takes a line alone with the value under it. A value that carries a target
 * keeps it on every row the wrap produces.
 */
function field(
	key: string,
	value: string | undefined,
	columns: number,
	href?: string
): readonly (readonly Span[])[] {
	if (value === undefined || value.trim().length === 0) return [];

	const lead = labelLead(key, DETAILS_KEY_WIDTH);
	const valueColumns = columns - lead.length;

	if (valueColumns < MINIMUM_VALUE_COLUMNS) {
		return [
			[span(`${key}:`, "dim")],
			...wrapText(value.trim(), columns).map((line): readonly Span[] => [linkSpan(line, href)])
		];
	}

	return wrapText(value.trim(), valueColumns).map((line, index): readonly Span[] => [
		span(index === 0 ? lead : " ".repeat(lead.length), "dim"),
		linkSpan(line, href)
	]);
}

function value(file: ContentFile | null, title: string): string | undefined {
	return file === null ? undefined : sectionValue(file.sections, title);
}

function joined(...parts: readonly (string | undefined)[]): string | undefined {
	const present = parts.filter(
		(part): part is string => part !== undefined && part.trim().length > 0
	);
	return present.length === 0 ? undefined : present.join(FIELD_SEPARATOR);
}

/** The file at an absolute path, or `null` when the CV has no such file. */
export function fileAt(root: ContentDir, path: string): ContentFile | null {
	const node = resolvePath(HOME_PATH, path, root);
	return node !== null && node.kind === "file" ? node : null;
}

/** The first entry of a group: the CV orders its entries newest first. */
function firstFile(root: ContentDir, path: string): ContentFile | null {
	const node = resolvePath(HOME_PATH, path, root);
	if (node === null || node.kind !== "dir") return null;

	return node.children.find((child): child is ContentFile => child.kind === "file") ?? null;
}

function entryLines(file: ContentFile, columns: number): readonly Line[] {
	const sections = file.sections;
	const name = sectionValue(sections, TITLE_NAME) ?? sections[0]?.title ?? file.name;
	const meta =
		sectionValue(sections, TITLE_ROLE) ??
		sectionValue(sections, TITLE_STACK) ??
		sectionValue(sections, TITLE_DEGREE);
	const period = sectionValue(sections, TITLE_PERIOD);
	const lead =
		sectionValue(sections, TITLE_HIGHLIGHTS) ??
		sectionValue(sections, TITLE_SUMMARY) ??
		sectionValue(sections, TITLE_LOCATION);

	return [
		heading(name),
		...(meta === undefined ? [] : [dim(meta)]),
		...(period === undefined ? [] : [dim(period)]),
		...(lead === undefined ? [] : [dim(teaser(lead, columns))])
	];
}

function sectionLines(section: ContentSection, width: number, columns: number): readonly Line[] {
	if (isBlock(section)) {
		return [
			heading(section.title),
			...section.body.flatMap(line => bodyLines(section.title, line, columns))
		];
	}

	return section.body.map(value => [
		span(`${section.title.padEnd(width)}${TITLE_GAP}`, "dim"),
		linkSpan(value, linkTarget(section.title, value))
	]);
}

/**
 * A block's body: the CV's link annotations print the label the document gave them, with
 * the target behind it, so no address ever becomes the text. Everything else is prose and
 * prints as it stands, wrapped at the screen it is printed on.
 */
function bodyLines(title: string, line: string, columns: number): readonly Line[] {
	const match = title === TITLE_LINKS ? LINK_LINE.exec(line) : null;
	if (match === null) return wrapText(line, columns).map(text => plain(text));

	const [, label = "", url = ""] = match;
	const visible = label.trim();
	if (visible.length <= columns) return [[linkSpan(visible, url)]];

	return wrapText(visible, columns).map(text => plain(text));
}

/** The one inline field that is a target of its own: the CV's email, as a `mailto:`. */
function linkTarget(title: string, value: string): string | undefined {
	return title === TITLE_EMAIL ? `${MAILTO}${value.trim()}` : undefined;
}

function isBlock(section: ContentSection): boolean {
	return !INLINE_TITLES.has(section.title);
}

function titleWidth(sections: readonly ContentSection[]): number {
	return Math.max(...sections.map(section => section.title.length), 0);
}

/** One teaser line: the CV's bullet glyph dropped, cut on a word boundary. */
function teaser(text: string, columns: number): string {
	const clean = text.replace(BULLET, "").trim();
	const width = Math.max(1, Math.min(columns, TEASER_COLUMNS));
	if (clean.length <= width) return clean;

	const cut = clean.slice(0, width);
	const space = cut.lastIndexOf(" ");
	return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}${ELLIPSIS}`;
}

function appendChildren(dir: ContentDir, prefix: string, lines: Line[]): void {
	dir.children.forEach((child, index) => {
		const last = index === dir.children.length - 1;
		lines.push([
			span(`${prefix}${last ? "└── " : "├── "}`, "dim"),
			span(label(child), child.kind === "dir" ? "accent" : "plain")
		]);

		if (child.kind === "dir") {
			appendChildren(child, `${prefix}${last ? "    " : "│   "}`, lines);
		}
	});
}

function label(node: TreeNode): string {
	return node.kind === "dir" ? `${node.name}/` : node.name;
}
