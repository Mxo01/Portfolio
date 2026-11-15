import {
	sectionValue,
	TITLE_DEGREE,
	TITLE_GRADE,
	TITLE_HIGHLIGHTS,
	TITLE_LINKS,
	TITLE_LOCATION,
	TITLE_NAME,
	TITLE_NOTES,
	TITLE_PERIOD,
	TITLE_ROLE,
	TITLE_STACK
} from "@/lib/content/tree";

import { blank, dim, plain, span } from "./lines";
import type { ContentFile, ContentSection, Line, Span } from "./types";

/**
 * The CV laid out the way the document lays it out.
 *
 * One renderer serves `cat cv.pdf` and every `cat career|projects|education/<slug>`: the
 * file is normalised into the same entry shape first — the document's own block and the
 * per-entry file are two readings of the same fields — and drawn once from there. The
 * strings are the document's throughout: this module owns rows, wrapping and tone, and
 * never invents a word. An entry's own title line is consumed by its header row, so a
 * name is printed once per entry however the file was built.
 */

/** The widest the CV is ever laid out: past this a line stops being read, not starts. */
export const CV_MAX_COLUMNS = 80;
/** Two cells closer than this share a row; below it the right cell takes one of its own. */
const MINIMUM_GAP = 2;
/** The document's own rule, drawn across the text block and nothing else. */
const RULE = "─";
/** What separates two fields on one row: the CV's own dot, not a pipe or a slash. */
const FIELD_SEPARATOR = " · ";
/** A bullet, then its hanging indent: the text starts at column 4 on every row. */
const BULLET_LEAD = "  • ";
const BULLET_INDENT = "    ";
const COLUMN_GAP = /\s{2,}/;
const BULLET = /^•\s+/;
/** A link annotation: the label the document prints and the target it points at. */
const ANNOTATION = /^([A-Za-z][A-Za-z ]*)\s+((?:https?:\/\/|mailto:)\S+)$/;
/** A `Label: value` cell, as the contact block prints it. One word, so `https:` is not a label. */
const LABELLED = /^([A-Za-z]+):\s*(.+)$/;
const LABEL_SEPARATOR = " | ";
const MAILTO = "mailto:";
const EMAIL_LABEL = "Email";
const WORD_RUN = /\s+/;
const PATH_SEPARATOR = "/";

/** The section titles the projection assigns: the shape, not the content. */
const DOCUMENT_TITLE = "Header";
const CONTACT_TITLE = "Contact";
const EXPERIENCE_TITLE = "Experience";
const PROJECTS_TITLE = "Projects";
const EDUCATION_TITLE = "Education";

/** The three groups of the CV, in the order the document states them. */
type Group = "career" | "projects" | "education";
const GROUPS: readonly Group[] = ["career", "projects", "education"];

/** A contact field: the value the CV prints, and the address it reaches. */
interface ContactField {
	readonly value: string;
	readonly href?: string;
}

/** The block above the first section: who this is, and how to reach them. */
interface CvHeader {
	readonly name: string;
	readonly location?: string;
	/** The summary as the document wraps it, one string per line it was extracted as. */
	readonly summary: readonly string[];
	readonly contact: readonly ContactField[];
}

/** One entry of the CV: the fields every group shares, filled in by the group it came from. */
interface CvEntry {
	readonly name: string;
	readonly location?: string;
	/** The role, or the degree for an education entry: the line under the name. */
	readonly role?: string;
	readonly period?: string;
	readonly grade?: string;
	readonly stack?: string;
	readonly bullets: readonly string[];
	readonly links: readonly string[];
	readonly notes: readonly string[];
}

/** One section of the CV: its heading and the entries under it, in document order. */
interface CvGroup {
	readonly title: string;
	readonly group: Group;
	readonly entries: readonly CvEntry[];
}

interface CvDocument {
	readonly header: CvHeader | null;
	readonly groups: readonly CvGroup[];
}

/**
 * The file as the CV prints it, or `null` when the file is not part of the CV: `cv.pdf` is
 * the document, and a file inside one of the three groups is one of its entries.
 */
export function cvLines(file: ContentFile, columns: number): readonly Line[] | null {
	const width = widthOf(columns);
	const header = file.sections.find(section => section.title === DOCUMENT_TITLE);

	if (header !== undefined) return documentLines(documentOf(file, header), width);

	const group = groupOf(file.path);
	return group === null ? null : entryLines(entryOf(file.sections, group), width);
}

/**
 * Greedy wrap on word boundaries. A word that cannot fit a line of its own — a URL, an
 * address with no spaces — is broken mid-word, because overflowing the screen is worse
 * than breaking a link.
 */
export function wrapText(text: string, columns: number): readonly string[] {
	const width = Math.max(1, Math.floor(columns));
	const lines: string[] = [];
	let line = "";

	for (const word of text.split(WORD_RUN).filter(part => part.length > 0)) {
		let rest = word;

		while (rest.length > 0) {
			const candidate = line.length === 0 ? rest : `${line} ${rest}`;
			if (candidate.length <= width) {
				line = candidate;
				rest = "";
			} else if (line.length === 0) {
				lines.push(rest.slice(0, width));
				rest = rest.slice(width);
			} else {
				lines.push(line);
				line = "";
			}
		}
	}

	if (line.length > 0) lines.push(line);
	return lines;
}

/** The text block the CV is laid out in: the screen's columns, never wider than the cap. */
function widthOf(columns: number): number {
	const usable = Number.isFinite(columns) ? Math.floor(columns) : CV_MAX_COLUMNS;
	return Math.max(1, Math.min(usable, CV_MAX_COLUMNS));
}

/** The group a file lives in, or `null` for a file outside the CV's three sections. */
function groupOf(path: string): Group | null {
	const [, directory] = path.split(PATH_SEPARATOR);
	return GROUPS.find(group => group === directory) ?? null;
}

/** The group a section title opens, or `null` when the section is an entry or the header. */
function groupOfTitle(title: string): Group | null {
	if (title === EXPERIENCE_TITLE) return "career";
	if (title === PROJECTS_TITLE) return "projects";
	if (title === EDUCATION_TITLE) return "education";
	return null;
}

/**
 * `cv.pdf` as blocks: the header, then every entry under the section that opened it. The
 * caller only reads a document when it has found the `Header` section, so the block is
 * handed over rather than looked up a second time.
 */
function documentOf(file: ContentFile, header: ContentSection): CvDocument {
	const groups: { title: string; group: Group; entries: CvEntry[] }[] = [];

	for (const section of file.sections) {
		if (section.title === DOCUMENT_TITLE || section.title === CONTACT_TITLE) continue;

		const group = groupOfTitle(section.title);
		if (group !== null) {
			groups.push({ title: section.title, group, entries: [] });
			continue;
		}

		// Prose above the first marker belongs to no group, so it is not an entry.
		const current = groups[groups.length - 1];
		if (current === undefined) continue;

		current.entries.push(blockEntry(section, current.group));
	}

	return {
		header: headerOf(
			header,
			file.sections.find(section => section.title === CONTACT_TITLE)
		),
		groups
	};
}

/** The header block: the name row, the summary under it, and the fields that reach them. */
function headerOf(header: ContentSection, contact: ContentSection | undefined): CvHeader | null {
	// The extraction puts the cell the document printed beside the name in the same body,
	// so the second line is the location column and everything after it is the summary.
	const [name = "", place, ...summary] = header.body;
	if (name.trim().length === 0) return null;

	return {
		name: name.trim(),
		location: place === undefined ? undefined : unlabelled(place),
		summary: summary.map(line => line.trim()).filter(line => line.length > 0),
		contact: contactOf(contact)
	};
}

/** The labelled contact fields, in the order the document prints them. */
function contactOf(section: ContentSection | undefined): readonly ContactField[] {
	if (section === undefined) return [];

	return section.body.flatMap(line =>
		line.split(LABEL_SEPARATOR).flatMap((cell): readonly ContactField[] => {
			const match = LABELLED.exec(cell.trim());
			if (match === null) return [];

			const [, label = "", value = ""] = match;
			return [{ value, href: label === EMAIL_LABEL ? `${MAILTO}${value}` : undefined }];
		})
	);
}

/** One entry of `cv.pdf`: its title line is the headline, and the rest reads by group. */
function blockEntry(section: ContentSection, group: Group): CvEntry {
	const [headline = "", ...body] = section.body;
	const [name = section.title, beside] = cells(headline);

	if (group === "projects") {
		// `Name   Stack` over the bullets.
		return { ...emptyEntry(name), stack: beside, ...bodyLines(body) };
	}

	const [timing = "", ...rest] = body;
	const [role, period] = cells(timing);

	if (group === "education") {
		// `Institution   Location` over `Degree   Period`, then the grade.
		const { notes, ...tail } = bodyLines(rest);
		const [grade, ...extra] = notes;
		return { ...emptyEntry(name), location: beside, role, period, grade, ...tail, notes: extra };
	}

	// `Company   Location` over `Role   Period`, then the stack, then the bullets.
	const [lead, ...tail] = rest;
	const stack =
		lead !== undefined && !BULLET.test(lead) && !ANNOTATION.test(lead) ? lead : undefined;

	return {
		...emptyEntry(name),
		location: beside,
		role,
		period,
		stack,
		...bodyLines(stack === undefined ? rest : tail)
	};
}

/** One entry as its own file states it: the fields the projection derived, title included. */
function fieldEntry(sections: readonly ContentSection[]): CvEntry {
	return {
		name: sectionValue(sections, TITLE_NAME) ?? "",
		location: sectionValue(sections, TITLE_LOCATION),
		role: sectionValue(sections, TITLE_ROLE) ?? sectionValue(sections, TITLE_DEGREE),
		period: sectionValue(sections, TITLE_PERIOD),
		grade: sectionValue(sections, TITLE_GRADE),
		stack: sectionValue(sections, TITLE_STACK),
		bullets: bodyOf(sections, TITLE_HIGHLIGHTS).map(bulletText),
		links: bodyOf(sections, TITLE_LINKS),
		notes: bodyOf(sections, TITLE_NOTES)
	};
}

/** An entry file either carries the derived fields or the document's own block. */
function entryOf(sections: readonly ContentSection[], group: Group): CvEntry {
	if (sections.some(section => section.title === TITLE_NAME)) return fieldEntry(sections);

	return blockEntry(sections[0] ?? { title: "", body: [] }, group);
}

/** Every entry starts with a name and ends with nothing it has not been given. */
function emptyEntry(name: string): CvEntry {
	return { name, bullets: [], links: [], notes: [] };
}

/** A block's body read as what it is: bullets, link annotations, and prose. */
function bodyLines(lines: readonly string[]): {
	readonly bullets: readonly string[];
	readonly links: readonly string[];
	readonly notes: readonly string[];
} {
	const bullets: string[] = [];
	const links: string[] = [];
	const notes: string[] = [];

	for (const line of lines) {
		if (BULLET.test(line)) bullets.push(bulletText(line));
		else if (ANNOTATION.test(line)) links.push(line);
		else notes.push(line);
	}

	return { bullets, links, notes };
}

/** The shell's own bullet, not the document's: the renderer draws one glyph per row. */
function bulletText(line: string): string {
	return line.replace(BULLET, "").trim();
}

function bodyOf(sections: readonly ContentSection[], title: string): readonly string[] {
	return sections.find(section => section.title === title)?.body ?? [];
}

/** The CV's column gutter: one cell per column, empty cells dropped. */
function cells(text: string): readonly string[] {
	return text
		.split(COLUMN_GAP)
		.map(cell => cell.trim())
		.filter(cell => cell.length > 0);
}

/** `Location: Pisa, Italy` and `Pisa, Italy` both read as `Pisa, Italy`. */
function unlabelled(text: string): string {
	const source = text.trim();
	return LABELLED.exec(source)?.[2]?.trim() ?? source;
}

/** The whole document: the ruled header block, then its sections in their own order. */
function documentLines(document: CvDocument, width: number): readonly Line[] {
	const sections = document.groups.flatMap((group, index) => [
		...(index === 0 ? [] : [blank()]),
		...sectionLines(group, width)
	]);

	if (document.header === null) return sections;

	return [...headerLines(document.header, width), blank(), blank(), ...sections];
}

/** The header block: two rules, and the information a reader needs between them. */
function headerLines(header: CvHeader, width: number): readonly Line[] {
	return [
		rule(width),
		...nameRow(header.name, header.location, width),
		...header.summary.flatMap(line => wrapText(line, width).map(text => plain(text))),
		...contactLines(header.contact, width),
		rule(width)
	];
}

/**
 * The contact row: the fields the document labelled, on one line under the summary. A row
 * that cannot fit keeps every character but loses its targets, because half a link is a
 * wrong link.
 */
function contactLines(fields: readonly ContactField[], width: number): readonly Line[] {
	if (fields.length === 0) return [];

	const text = fields.map(field => field.value).join(FIELD_SEPARATOR);
	if (text.length > width) return wrapText(text, width).map(line => dim(line));

	const spans: Span[] = [];
	fields.forEach((field, index) => {
		if (index > 0) spans.push(span(FIELD_SEPARATOR, "dim"));
		spans.push(
			field.href === undefined
				? span(field.value, "dim")
				: { text: field.value, tone: "dim", href: field.href }
		);
	});

	return [spans];
}

/** One section: the caps heading, the rule under it, then its entries. */
function sectionLines(section: CvGroup, width: number): readonly Line[] {
	return [
		plain(section.title.toUpperCase()),
		rule(width),
		blank(),
		...section.entries.flatMap((entry, index) => [
			...(index === 0 ? [] : [blank()]),
			...entryLines(entry, width)
		])
	];
}

/**
 * One entry: the name beside its city, the role and period under it, the stack, then the
 * bullets. Nothing is indented but a bullet's continuation, which lines up at column 4.
 *
 * A link labelled with the entry's own name is the entry's target, not a row: the name is
 * printed once, on the header row, and that is where the click belongs.
 */
function entryLines(entry: CvEntry, width: number): readonly Line[] {
	return [
		...nameRow(entry.name, entry.location, width, targetOf(entry)),
		...metaLines(entry.role, entry.period, width),
		...(entry.grade === undefined ? [] : wrapText(entry.grade, width).map(line => dim(line))),
		...(entry.stack === undefined ? [] : wrapText(entry.stack, width).map(line => dim(line))),
		...entry.bullets.flatMap(bullet => bulletLines(bullet, width)),
		...entry.links.flatMap(link => linkLines(link, entry.name, width)),
		...entry.notes.flatMap(line => wrapText(line, width).map(text => plain(text)))
	];
}

/**
 * The role and the period on one dim line, separated by the CV's own dot. Narrow enough to
 * break, the dot is where it breaks: a period is one fact, and `Sep` on one row and `2020`
 * on the next reads as two.
 */
function metaLines(
	role: string | undefined,
	period: string | undefined,
	width: number
): readonly Line[] {
	const lines: string[] = [];

	for (const part of [role, period]) {
		if (part === undefined || part.trim().length === 0) continue;

		const tail = lines[lines.length - 1];
		const joined = tail === undefined ? part : `${tail}${FIELD_SEPARATOR}${part}`;

		if (tail !== undefined && joined.length <= width) {
			lines[lines.length - 1] = joined;
			continue;
		}

		lines.push(...wrapText(part, width));
	}

	return lines.map(line => dim(line));
}

/**
 * The name on the left and its city against the right edge, so two entries stack into a
 * readable column. Too close to fit, and the city drops to a line of its own rather than
 * pushing the name off the row. A name that carries a target is the row's only link.
 */
function nameRow(
	name: string,
	location: string | undefined,
	width: number,
	href?: string
): readonly Line[] {
	const parts = name.length <= width ? [name] : wrapText(name, width);
	const rows: Line[] = parts.map(text => [nameSpan(text, href)]);

	if (location === undefined || location.length === 0) return rows;

	const [last = ""] = parts.slice(-1);
	const gap = width - last.length - location.length;
	if (gap < MINIMUM_GAP) {
		return [...rows, ...wrapText(location, width).map(line => dim(line.padStart(width)))];
	}

	rows[rows.length - 1] = [
		nameSpan(last, href),
		span(" ".repeat(gap), "dim"),
		span(location, "dim")
	];

	return rows;
}

/** The entry's name as a run, so the name a README links to never prints its address. */
function nameSpan(text: string, href: string | undefined): Span {
	return href === undefined ? span(text, "accent") : { text, tone: "accent", href };
}

/**
 * The target the document attached to the entry's own name, if it attached one. The CV
 * labels a project's link with the project, and that label is the name already on the row.
 */
function targetOf(entry: CvEntry): string | undefined {
	for (const line of entry.links) {
		const match = ANNOTATION.exec(line);
		if (match !== null && match[1]?.trim() === entry.name) return match[2];
	}

	return undefined;
}

/** One bullet, wrapped under its own text: continuation rows start at column 4, never 0. */
function bulletLines(text: string, width: number): readonly Line[] {
	if (text.length === 0) return [];

	return wrapText(text, width - BULLET_LEAD.length).map(
		(line, index) => `${index === 0 ? BULLET_LEAD : BULLET_INDENT}${line}`
	);
}

/**
 * A link annotation as the document states it: the label is what the reader sees, the
 * target travels behind it and is never printed. Broken across rows, the label still
 * prints as text and loses only its target, because half a link is a wrong link.
 *
 * An annotation labelled with the entry's own name is that name again — the document labels
 * the project's link with the project — so it produces no row: `entryLines` moved the
 * target onto the header row, where the name is already printed once.
 */
function linkLines(line: string, name: string, width: number): readonly Line[] {
	const match = ANNOTATION.exec(line);
	if (match === null) return wrapText(line, width).map(text => dim(text));

	const [, label = "", url = ""] = match;
	const visible = label.trim();
	if (visible === name) return [];
	if (visible.length > width) return wrapText(visible, width).map(text => dim(text));

	return [[{ text: visible, tone: "dim", href: url }]];
}

function rule(width: number): Line {
	return dim(RULE.repeat(width));
}
