import type { CvSection } from "@/lib/cv";
import { EXPORT_CV_SCRIPT } from "@/lib/terminal/script-data";
import type { ExecutableFile, Script } from "@/lib/terminal/script-data";
import type { ContentDir, ContentFile, ContentSection, TreeNode } from "@/lib/terminal/types";

/**
 * The CV as a virtual filesystem. Nothing here is retyped: every file is a
 * projection of the sections the document parsed into, split at the PDF's own
 * column gaps and bullet glyph, so `cat cv.pdf` and the per-entry files can never
 * disagree.
 *
 * The sections arrive from `loadCv` at runtime, which is why this file reads the
 * document and never restates it. A section the CV does not have produces no
 * file; a section outside a known group is still printed by `cv.pdf` but gets no
 * place in the tree, because the tree must not invent structure the document does
 * not describe.
 */

const ROOT_NAME = "/";
const ROOT_PATH = "/";
const SEPARATOR = "/";

const ABOUT_DIR = "about";
const CAREER_DIR = "career";
const EDUCATION_DIR = "education";
const PROJECTS_DIR = "projects";
const CONTACT_FILE = "contact";
const CV_FILE = "cv.pdf";
const EXPORT_SCRIPT_FILE = "export_cv.sh";
const PROFILE_FILE = "profile";
const SUMMARY_FILE = "summary";

/** The CV's group titles. `Experience` and `Projects` are markers: entries follow them. */
const HEADER_TITLE = "Header";
const CONTACT_TITLE = "Contact";
const EXPERIENCE_TITLE = "Experience";
const PROJECTS_TITLE = "Projects";
const EDUCATION_TITLE = "Education";

/**
 * The CV's own home page: the site's own link is omitted because it *is* the site, and it
 * points at the abandoned Firebase host. The parser keeps it; the projection drops it.
 */
const SITE_LINK_LABEL = "Website";

/** Section titles the projection assigns. The renderer reads them, never guesses. */
export const TITLE_NAME = "Name";
export const TITLE_ROLE = "Role";
export const TITLE_PERIOD = "Period";
export const TITLE_LOCATION = "Location";
export const TITLE_STACK = "Stack";
export const TITLE_HIGHLIGHTS = "Highlights";
export const TITLE_SUMMARY = "Summary";
export const TITLE_DEGREE = "Degree";
export const TITLE_GRADE = "Grade";
export const TITLE_EMAIL = "Email";
export const TITLE_MOBILE = "Mobile";
export const TITLE_LINKS = "Links";
export const TITLE_NOTES = "Notes";

/** The PDF's own two-column gap, the only place a field ends and the next begins. */
const COLUMN_GAP = /\s{2,}/;
/** The glyph the extraction keeps at the head of each bullet. */
const BULLET = /^•\s+/;
/** A `Label: value` cell, as the contact block prints it. The label is one word on purpose:
 * a URL's `https:` never reads as a label, and an annotation keeps its target whole. */
const LABELLED = /^([A-Za-z]+):\s*(.+)$/;
/** A link annotation: a label and the target the PDF points at. */
const ANNOTATION = /^([A-Za-z][A-Za-z ]*)\s+((?:https?:\/\/|mailto:)\S+)$/;
/** A bare label row: the PDF's chip line and its `Links` heading carry no value. */
const MARKER = /^[A-Za-z][A-Za-z ]*$/;
const LABEL_SEPARATOR = " | ";
/** Where the role ends when the extraction collapses the header's two columns. */
const ROLE_END = /\s+(?=[a-z])/;

type Group = "career" | "projects" | "education";

interface Entry {
	readonly slug: string;
	readonly sections: readonly ContentSection[];
}

interface CvDocument {
	readonly profile: readonly ContentSection[];
	readonly summary: readonly ContentSection[];
	readonly contact: readonly ContentSection[];
	readonly career: readonly Entry[];
	readonly education: readonly Entry[];
	readonly projects: readonly Entry[];
	/** One block per CV section, in CV order: what `cv.pdf` prints. */
	readonly blocks: readonly ContentSection[];
}

/**
 * The whole CV as the shell's filesystem. Pure: the same sections always make the same
 * tree.
 *
 * Every file but one is a projection of the document. `export_cv.sh` is the shell's own
 * easter egg: it carries its flags on the node — runnable, not readable — so the dispatcher
 * and the reader answer from those flags rather than from the name a visitor types.
 */
export function buildContent(sections: readonly CvSection[]): ContentDir {
	const cv = readCv(sections);

	return tree(ROOT_PATH, ROOT_NAME, [
		group(ABOUT_DIR, [
			document(join(ROOT_PATH, ABOUT_DIR), PROFILE_FILE, cv.profile),
			document(join(ROOT_PATH, ABOUT_DIR), SUMMARY_FILE, cv.summary)
		]),
		group(CAREER_DIR, files(CAREER_DIR, cv.career)),
		group(EDUCATION_DIR, files(EDUCATION_DIR, cv.education)),
		group(PROJECTS_DIR, files(PROJECTS_DIR, cv.projects)),
		document(ROOT_PATH, CONTACT_FILE, cv.contact),
		document(ROOT_PATH, CV_FILE, cv.blocks),
		executable(ROOT_PATH, EXPORT_SCRIPT_FILE, EXPORT_CV_SCRIPT)
	]);
}

/** A section's first body line, the value of a one-line field. */
export function sectionValue(
	sections: readonly ContentSection[],
	title: string
): string | undefined {
	return sections.find(section => section.title === title)?.body[0];
}

function readCv(sections: readonly ContentSection[]): CvDocument {
	const career: Entry[] = [];
	const education: Entry[] = [];
	const projects: Entry[] = [];
	const targets: Readonly<Record<Group, Entry[]>> = { career, education, projects };
	const builders: Readonly<Record<Group, EntryBuilder>> = {
		career: experienceEntry,
		projects: projectEntry,
		education: educationEntry
	};

	let profile: readonly ContentSection[] = [];
	let summary: readonly ContentSection[] = [];
	let contact: readonly ContentSection[] = [];
	let group: Group | null = null;

	const collect = (kind: Group, source: ContentSection): void => {
		targets[kind].push(entry(source, builders[kind]));
	};

	for (const source of sections) {
		switch (source.title) {
			case HEADER_TITLE: {
				const header = headerSections(source);
				profile = header.profile;
				summary = header.summary;
				continue;
			}
			case CONTACT_TITLE:
				contact = contactSections(source);
				continue;
			case EXPERIENCE_TITLE:
				group = "career";
				continue;
			case PROJECTS_TITLE:
				group = "projects";
				continue;
			case EDUCATION_TITLE:
				// With a body the section is the single education entry; empty, it opens a group.
				if (source.body.length === 0) {
					group = "education";
					continue;
				}
				collect("education", source);
				continue;
			default:
				break;
		}

		if (group !== null) collect(group, source);
	}

	// `cv.pdf` prints the document block for block, from the rows the parser placed. The
	// per-entry files are what derive fields; here the prose stays exactly as the PDF states
	// it, so a name, a role or a city lifted out of a line never replaces that line.
	return {
		profile,
		summary,
		contact,
		career,
		education,
		projects,
		blocks: sections.map(withoutSiteLink)
	};
}

/** The same omitted row in the document view, so `cat cv.pdf` agrees with `cat contact`. */
function withoutSiteLink(source: ContentSection): ContentSection {
	if (source.title !== CONTACT_TITLE) return source;

	return { ...source, body: source.body.filter(line => !isSiteLink(line)) };
}

/** An annotation row pointing at the site the visitor is already on. */
function isSiteLink(line: string): boolean {
	return ANNOTATION.exec(line)?.[1]?.trim() === SITE_LINK_LABEL;
}

type EntryBuilder = (source: ContentSection) => {
	readonly name: string;
	readonly sections: readonly ContentSection[];
};

/**
 * The header states the role and the summary as one sentence. The summary keeps that
 * sentence whole — from the role to its full stop — and the role is derived beside it,
 * for the profile file and for `whoami`, never by cutting the sentence the document wrote.
 */
function headerSections(source: ContentSection): {
	readonly profile: readonly ContentSection[];
	readonly summary: readonly ContentSection[];
} {
	const [name = "", place = "", titleLine = "", ...rest] = source.body;

	return {
		profile: compact([
			section(TITLE_NAME, [name]),
			section(TITLE_ROLE, single(derivedRole(titleLine))),
			section(TITLE_LOCATION, single(unlabelled(place)))
		]),
		summary: compact([section(TITLE_SUMMARY, [titleLine, ...rest])])
	};
}

/**
 * The role the header sentence opens with: everything before the PDF's column gutter, or —
 * when the extraction collapses the two columns — before the first word that is not
 * capitalised. A header line with no prose after the role is the role. Either way this only
 * reads the line: the summary keeps it whole.
 */
function derivedRole(line: string): string {
	const gap = COLUMN_GAP.exec(line);
	if (gap !== null) return line.slice(0, gap.index).trim();

	const end = ROLE_END.exec(line);
	if (end !== null) return line.slice(0, end.index).trim();

	return line.trim();
}

/** `Company   Location` over `Role   Period`, then the stack line, then the bullets. */
function experienceEntry(source: ContentSection): {
	readonly name: string;
	readonly sections: readonly ContentSection[];
} {
	const [headline = "", timing = "", ...body] = source.body;
	const [company, location] = columns(headline);
	const [role, period] = columns(timing);
	const name = company ?? source.title;
	const entry = splitEntryBody(body);

	return {
		name,
		sections: compact([
			section(TITLE_NAME, [name]),
			section(TITLE_ROLE, single(role)),
			section(TITLE_PERIOD, single(period)),
			section(TITLE_LOCATION, single(location)),
			section(TITLE_STACK, single(entry.stack)),
			section(TITLE_HIGHLIGHTS, entry.highlights),
			section(TITLE_LINKS, entry.links)
		])
	};
}

/** `Name   Stack`, then the bullets. */
function projectEntry(source: ContentSection): {
	readonly name: string;
	readonly sections: readonly ContentSection[];
} {
	const [headline = "", ...body] = source.body;
	const [name, stack] = columns(headline);
	const entry = splitEntryBody(body);
	const title = name ?? source.title;

	return {
		name: title,
		sections: compact([
			section(TITLE_NAME, [title]),
			section(TITLE_STACK, single(stack ?? entry.stack)),
			section(TITLE_HIGHLIGHTS, entry.highlights),
			section(TITLE_LINKS, entry.links)
		])
	};
}

/** `Institution   Location` over `Degree   Period`, then the grade. */
function educationEntry(source: ContentSection): {
	readonly name: string;
	readonly sections: readonly ContentSection[];
} {
	const [headline = "", award = "", grade = "", ...rest] = source.body;
	const [institution, location] = columns(headline);
	const [degree, period] = columns(award);
	const name = institution ?? source.title;

	return {
		name,
		sections: compact([
			section(TITLE_NAME, [name]),
			section(TITLE_DEGREE, single(degree)),
			section(TITLE_PERIOD, single(period)),
			section(TITLE_LOCATION, single(location)),
			section(TITLE_GRADE, single(grade)),
			section(TITLE_NOTES, rest)
		])
	};
}

/**
 * Fields, then the link annotations the PDF carries as link targets. The chip row
 * and the `Links` heading are layout, not contact, so they are dropped; an
 * annotation whose label is already a field is the same contact and is dropped
 * with them. Anything unparsed is kept word for word under `Notes`.
 */
function contactSections(source: ContentSection): readonly ContentSection[] {
	const fields: ContentSection[] = [];
	const links: string[] = [];
	const notes: string[] = [];

	for (const line of source.body) {
		const annotation = ANNOTATION.exec(line);
		if (annotation !== null) {
			if (isSiteLink(line)) continue;
			const [, label = ""] = annotation;
			if (!fields.some(field => field.title === label.trim())) links.push(line);
			continue;
		}

		const pairs = labelledPairs(line);
		if (pairs.length > 0) {
			fields.push(...pairs);
			continue;
		}

		if (!isMarker(line)) notes.push(line);
	}

	return [...fields, ...compact([section(TITLE_LINKS, links), section(TITLE_NOTES, notes)])];
}

function labelledPairs(line: string): readonly ContentSection[] {
	const fields: (ContentSection | null)[] = [];

	for (const cell of line.split(LABEL_SEPARATOR)) {
		const match = LABELLED.exec(cell.trim());
		if (match === null) return [];
		const [, title = "", value = ""] = match;
		fields.push(section(title, [value]));
	}

	return compact(fields);
}

function isMarker(line: string): boolean {
	return line
		.split(LABEL_SEPARATOR)
		.every(cell => MARKER.test(cell.trim()) && cell.trim().length > 0);
}

/** The CV's own column layout: one cell per column, empty cells dropped. */
function columns(text: string): readonly string[] {
	return text
		.split(COLUMN_GAP)
		.map(cell => cell.trim())
		.filter(cell => cell.length > 0);
}

/** The stack line, then the bullets, with a trailing link annotation kept out of them. */
function splitEntryBody(body: readonly string[]): {
	readonly stack: string | undefined;
	readonly highlights: readonly string[];
	readonly links: readonly string[];
} {
	const [first = "", ...rest] = body;
	const [stack, lines] = BULLET.test(first) ? [undefined, [first, ...rest]] : [first, rest];
	const highlights: string[] = [];
	const links: string[] = [];

	for (const line of lines) {
		if (BULLET.test(line) || !ANNOTATION.test(line)) highlights.push(line);
		else links.push(line);
	}

	return { stack, highlights, links };
}

function entry(source: ContentSection, build: EntryBuilder): Entry {
	const { name, sections } = build(source);
	return { slug: slugify(name), sections };
}

function section(title: string, body: readonly string[]): ContentSection | null {
	const lines = body.map(line => line.trim()).filter(line => line.length > 0);
	return lines.length === 0 ? null : { title, body: lines };
}

function compact(sections: readonly (ContentSection | null)[]): ContentSection[] {
	return sections.filter((entry): entry is ContentSection => entry !== null);
}

function single(value: string | undefined): readonly string[] {
	return value === undefined || value.trim().length === 0 ? [] : [value];
}

/** `Location: Pisa, Italy` and `Pisa, Italy` both read as `Pisa, Italy`. */
function unlabelled(text: string): string {
	const source = text.trim();
	return LABELLED.exec(source)?.[2]?.trim() ?? source;
}

function slugify(text: string): string {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function files(parent: string, entries: readonly Entry[]): readonly ContentFile[] {
	return entries.map(entry => document(join(ROOT_PATH, parent), entry.slug, entry.sections));
}

/** A group holds files only: a directory inside one would be structure the document lacks. */
function group(name: string, children: readonly ContentFile[]): ContentDir {
	return tree(
		join(ROOT_PATH, name),
		name,
		children.filter(child => child.sections.length > 0)
	);
}

function tree(path: string, name: string, children: readonly TreeNode[]): ContentDir {
	return { kind: "dir", name, path, children };
}

function document(parent: string, name: string, sections: readonly ContentSection[]): ContentFile {
	return { kind: "file", name, path: join(parent, name), sections };
}

/**
 * A file the shell can run and will not print. Both answers are flags on the node, so
 * nothing downstream has to recognise a file name; it carries no sections, because its body
 * is not content — `ls` and `tree` only need the name.
 */
function executable(parent: string, name: string, script: Script): ExecutableFile {
	return {
		kind: "file",
		name,
		path: join(parent, name),
		sections: [],
		executable: true,
		readable: false,
		script
	};
}

function join(parent: string, name: string): string {
	return parent === ROOT_PATH ? `${ROOT_PATH}${name}` : `${parent}${SEPARATOR}${name}`;
}
