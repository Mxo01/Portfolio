import type { ContentSection } from "@/lib/terminal/types";

/**
 * The CV PDF as sections. Pure: text items and link annotations in, section values
 * out — no pdf.js, no DOM, no clock. Every string is the document's own; this
 * module only decides where a line begins and ends, and refuses to guess.
 *
 * Layout contract, keyed to the one-page CV:
 * - all-caps lines `EXPERIENCE`, `PROJECTS`, `EDUCATION` open the three groups, in that order;
 * - `Company    City, Country` is an entry headline, `Role    Mon YYYY – Mon YYYY` its role line;
 * - a comma-separated line under the role is the stack, and `•` opens a bullet whose wrapped
 *   lines are joined back into one line;
 * - link annotations are attached to the label they cover, by position.
 *
 * Anything this contract cannot place is an error, never a silently dropped line.
 */

/** One positioned run of text, as pdf.js reports it: points, origin bottom-left. */
export interface TextItem {
	readonly text: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/** A link annotation: the target and the box it covers. */
export interface LinkAnnotation {
	readonly url: string;
	readonly rect: readonly number[];
}

/** What the document says before the layout contract reads it. */
export interface CvInput {
	readonly items: readonly TextItem[];
	readonly annotations?: readonly LinkAnnotation[];
}

/** A named block of the CV: the same section the shell's files print. */
export type CvSection = ContentSection;

/** A failure that names the reason and the line it could not place. */
export class CvParseError extends Error {
	/** The line the document could not place, word for word; absent when none applies. */
	readonly line: string | undefined;

	constructor(message: string, line?: string) {
		super(message);
		this.name = "CvParseError";
		this.line = line;
	}
}

/** The document's column gutter; a word space is about 2.2pt, the gutter far wider. */
const COLUMN_GAP = 8;
/** Items within this many points of each other vertically are one line, not two. */
const ROW_TOLERANCE = 3.5;
/** The gutter written back into a line: the projection splits cells on `\s{2,}`. */
const COLUMN_SEPARATOR = "  ";
/**
 * What joins a label to the row it sits on when claims are deduped: no label can hold a NUL,
 * so two words and two rows can never read as the same claim.
 */
const CLAIM_SEPARATOR = "\u0000";
const WORD_SEPARATOR = " ";
const COLUMN_SEPARATOR_PATTERN = /\s{2,}/;
const SPACE_RUN = /\s+/g;
const BULLET = /^•\s+/;
const ALL_CAPS = /^[A-Z][A-Z\s&]{2,}$/;

const HEADER_TITLE = "Header";
const CONTACT_TITLE = "Contact";
const EXPERIENCE = "EXPERIENCE";
const PROJECTS = "PROJECTS";
const EDUCATION = "EDUCATION";

const SECTION_MARKERS = [EXPERIENCE, PROJECTS, EDUCATION] as const;
type Marker = (typeof SECTION_MARKERS)[number];

const SECTION_TITLES: Readonly<Record<Marker, string>> = {
	[EXPERIENCE]: "Experience",
	[PROJECTS]: "Projects",
	[EDUCATION]: "Education"
};

/** How many entries a group must state for the site to be worth shipping. */
const MINIMUM_ENTRIES: Readonly<Record<Marker, number>> = {
	[EXPERIENCE]: 3,
	[PROJECTS]: 3,
	[EDUCATION]: 1
};

/** `Mon YYYY – Mon YYYY`, accepting a hyphen and a period still running. */
const PERIOD = /^[A-Z][a-z]{2,3} \d{4} [–—-] (?:[A-Z][a-z]{2,3} \d{4}|Present)$/;
/** The header line that carries the contact fields. */
const CONTACT_ROW = /(?:^|\s)Email:/;

/** One run of text with the box the document gives it. */
interface Cell {
	readonly text: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/** One visual line: the cells that share a baseline, and their joined text. */
interface Row {
	readonly text: string;
	readonly cells: readonly Cell[];
	/** Position in the document, top to bottom: how annotations are ordered. */
	readonly order: number;
}

interface Entry {
	readonly title: string;
	readonly headline: Row;
	readonly role: Row | null;
	readonly rows: readonly Row[];
}

/** A section while annotations are still being attached: its body is still growing. */
interface DraftSection {
	readonly title: string;
	readonly body: string[];
}

/** Everything the document says, as the sections the projection consumes. */
export function parseCv({ items, annotations = [] }: CvInput): CvSection[] {
	const rows = rowsFromItems(items);
	const markers = findMarkers(rows);
	const experienceStart = markers[EXPERIENCE];
	const headerRows = rows.slice(0, experienceStart);
	const header = headerSections(headerRows, rows[experienceStart]?.text);
	const sections: DraftSection[] = [header.header, header.contact];
	const owners = new Map<Row, DraftSection>();

	// A link in the header block is contact: the name, the role and the fields share one area.
	for (const row of headerRows) owners.set(row, header.contact);

	for (const marker of SECTION_MARKERS) {
		const start = markers[marker] + 1;
		const next = SECTION_MARKERS.map(title => markers[title]).find(position => position >= start);
		const end = next ?? rows.length;
		const groupRows = rows.slice(start, end);
		const entries =
			marker === PROJECTS ? projectEntries(groupRows, marker) : datedEntries(groupRows, marker);

		checkCount(marker, entries, groupRows, rows[end]?.text ?? lastLine(rows));
		const group: DraftSection = { title: SECTION_TITLES[marker], body: [] };
		sections.push(group);

		for (const entry of entries) {
			const section: DraftSection = { title: entry.title, body: entryBody(marker, entry) };
			sections.push(section);
			for (const row of [entry.headline, entry.role, ...entry.rows]) {
				if (row !== null) owners.set(row, section);
			}
		}
	}

	attachAnnotations(owners, annotations);

	return sections.map(section => ({ title: section.title, body: [...section.body] }));
}

/**
 * The document's lines, top to bottom. Cells are joined by their horizontal gap: a
 * word space inside a line, the document's gutter between columns.
 */
function rowsFromItems(items: readonly TextItem[]): readonly Row[] {
	const filled = items.filter(item => item.text.trim().length > 0);
	const ordered = [...filled].sort((a, b) => b.y - a.y || a.x - b.x);
	const grouped: { baseline: number; items: TextItem[] }[] = [];

	for (const item of ordered) {
		const current = grouped[grouped.length - 1];
		if (current !== undefined && Math.abs(current.baseline - item.y) <= ROW_TOLERANCE) {
			current.items.push(item);
			continue;
		}
		grouped.push({ baseline: item.y, items: [item] });
	}

	return grouped.map((row, order) => {
		const cells = [...row.items].sort((a, b) => a.x - b.x);
		return { text: joinCells(cells), cells, order };
	});
}

/** One line of text from its cells, each normalized; the gutter stays a gutter. */
function joinCells(cells: readonly Cell[]): string {
	let text = "";
	let right: number | null = null;

	for (const cell of cells) {
		const value = cell.text.replace(SPACE_RUN, " ").trim();
		if (right !== null) {
			text += cell.x - right >= COLUMN_GAP ? COLUMN_SEPARATOR : WORD_SEPARATOR;
		}
		text += value;
		right = cell.x + cell.width;
	}

	return text;
}

/**
 * The three group markers, refused unless each exists once and they run in order, keyed so
 * every later read of a marker's row is total.
 */
function findMarkers(rows: readonly Row[]): Readonly<Record<Marker, number>> {
	const found = new Map<Marker, number>();

	rows.forEach((row, index) => {
		const marker = markerOf(row.text);
		if (marker === null) return;
		if (found.has(marker)) fail(`section "${marker}" is declared twice`, row.text);
		found.set(marker, index);
	});

	// A marker still missing fails below, so every value written here is a row the document
	// actually placed; the seed is never read.
	const positions: Record<Marker, number> = { [EXPERIENCE]: 0, [PROJECTS]: 0, [EDUCATION]: 0 };
	let previous = -1;

	for (const marker of SECTION_MARKERS) {
		const position = found.get(marker);
		if (position === undefined) {
			const next = SECTION_MARKERS.map(candidate => found.get(candidate)).find(
				candidate => candidate !== undefined && candidate > previous
			);
			fail(`missing section "${marker}"`, next === undefined ? lastLine(rows) : rows[next]?.text);
		}
		if (position < previous) fail(`section "${marker}" is out of order`, marker);
		positions[marker] = position;
		previous = position;
	}

	return positions;
}

function markerOf(text: string): Marker | null {
	return SECTION_MARKERS.find(marker => marker === text) ?? null;
}

/** The block above the first marker: the name, the role and summary, the contact fields. */
function headerSections(
	rows: readonly Row[],
	fallbackLine: string | undefined
): { readonly header: DraftSection; readonly contact: DraftSection } {
	const [nameRow, ...rest] = rows;
	if (nameRow === undefined) fail("the header block is missing", fallbackLine);

	const contactRow = rows.find(row => CONTACT_ROW.test(row.text)) ?? null;
	const [name, ...extraNames] = splitCells(nameRow.text);

	return {
		header: {
			title: HEADER_TITLE,
			body: [name, ...extraNames, ...rest.filter(row => row !== contactRow).map(row => row.text)]
		},
		contact: {
			title: CONTACT_TITLE,
			body: contactRow === null ? [] : [...splitCells(contactRow.text)]
		}
	};
}

/** Headline, role line, then extra lines: the shape experience and education share. */
function datedEntries(rows: readonly Row[], marker: Marker): readonly Entry[] {
	const entries: Entry[] = [];
	let entry: { title: string; headline: Row; role: Row | null; rows: Row[] } | null = null;

	for (const row of rows) {
		const cells = splitCells(row.text);
		const period = cells[1];

		if (period !== undefined && cells.length === 2 && PERIOD.test(period)) {
			if (entry === null) fail(`role line before any entry in ${marker}`, row.text);
			if (entry.role !== null) fail(`entry "${entry.title}" has two role lines`, row.text);
			entry.role = row;
			continue;
		}

		if (period !== undefined) {
			entry = { title: cells[0], headline: row, role: null, rows: [] };
			entries.push(entry);
			continue;
		}

		if (entry === null) fail(`line outside any entry in ${marker}`, row.text);
		if (ALL_CAPS.test(row.text)) fail(`unknown section inside ${marker}`, row.text);
		entry.rows.push(row);
	}

	for (const candidate of entries) {
		if (candidate.role === null) {
			fail(`entry "${candidate.title}" has no role or period line`, candidate.headline.text);
		}
	}

	return entries;
}

/** Projects: `Name    Stack` over the bullets. */
function projectEntries(rows: readonly Row[], marker: Marker): readonly Entry[] {
	const entries: Entry[] = [];
	let entry: { title: string; headline: Row; role: Row | null; rows: Row[] } | null = null;

	for (const row of rows) {
		const parts = splitCells(row.text);

		if (parts.length >= 2) {
			entry = { title: parts[0], headline: row, role: null, rows: [] };
			entries.push(entry);
			continue;
		}

		if (entry === null) fail(`line outside any entry in ${marker}`, row.text);
		if (ALL_CAPS.test(row.text)) fail(`unknown section inside ${marker}`, row.text);
		entry.rows.push(row);
	}

	return entries;
}

/** The entry's lines in the order the projection reads them. */
function entryBody(marker: Marker, entry: Entry): string[] {
	const body = [entry.headline.text];
	if (entry.role !== null) body.push(entry.role.text);

	if (marker === EDUCATION) return body.concat(entry.rows.map(row => row.text));
	if (marker === PROJECTS) return body.concat(joinedBullets(entry, false));
	return body.concat(joinedBullets(entry, true));
}

/**
 * One line per bullet: a line that does not open a bullet continues the one above it, so a
 * bullet wrapped by the PDF comes back as one logical bullet. Experience may open with a
 * stack line instead of a bullet; a project may not.
 */
function joinedBullets(entry: Entry, hasStack: boolean): readonly string[] {
	const rows = entry.rows;
	const bullets: string[] = [];
	const first = rows[0];
	const start = hasStack && first !== undefined && !BULLET.test(first.text) ? 1 : 0;

	for (const row of rows.slice(start)) {
		if (BULLET.test(row.text)) {
			bullets.push(row.text);
			continue;
		}
		const previous = bullets[bullets.length - 1];
		if (previous === undefined) fail(`unplaced line in entry "${entry.title}"`, row.text);
		bullets[bullets.length - 1] = `${previous} ${row.text}`;
	}

	return start === 1 && first !== undefined ? [first.text, ...bullets] : bullets;
}

function checkCount(
	marker: Marker,
	entries: readonly Entry[],
	groupRows: readonly Row[],
	boundaryLine: string | undefined
): void {
	const minimum = MINIMUM_ENTRIES[marker];
	if (entries.length >= minimum) return;

	const line = lastLine(groupRows) ?? boundaryLine;
	if (marker === EDUCATION) fail("no education entry", line);
	fail(`expected at least ${minimum} ${marker} entries, found ${entries.length}`, line);
}

/**
 * Link annotations become `Label target` lines on the section that owns their label. A label
 * no text supports is dropped, and a label claimed more than once — by two URLs, or twice on
 * one row — keeps the label and loses the href: a wrong link is worse than no link.
 */
function attachAnnotations(
	owners: ReadonlyMap<Row, DraftSection>,
	annotations: readonly LinkAnnotation[]
): void {
	const resolved: {
		section: DraftSection;
		label: string;
		href: string | null;
		row: number;
		offset: number;
	}[] = [];

	for (const annotation of annotations) {
		const target = resolveAnnotation(owners, annotation);
		if (target !== null) resolved.push(target);
	}

	resolved.sort((a, b) => a.row - b.row || a.offset - b.offset);

	/** The labels already spoken for, read in document order: the first claim keeps the href. */
	const claimed = new Set<string>();

	for (const { section, label, href, row } of resolved) {
		const claim = `${row}${CLAIM_SEPARATOR}${label}`;
		const second = claimed.has(claim);
		claimed.add(claim);

		section.body.push(href === null || second ? label : `${label} ${href}`);
	}
}

/** A row and the section that owns it, read from the same map entry so the pair is whole. */
interface OwnedRow {
	readonly row: Row;
	readonly section: DraftSection;
}

function resolveAnnotation(
	owners: ReadonlyMap<Row, DraftSection>,
	annotation: LinkAnnotation
): {
	readonly section: DraftSection;
	readonly label: string;
	readonly href: string | null;
	readonly row: number;
	readonly offset: number;
} | null {
	const [left = 0, bottom = 0, right = 0, top = 0] = annotation.rect;
	const owned = ownerForBand(owners, bottom, top);
	if (owned === null) return null;

	const covers = (cell: Cell): boolean => overlaps(cell.x, cell.x + cell.width, left, right);
	const first = owned.row.cells.find(covers);
	if (first === undefined) return null;

	const label = labelOf(first.text);
	if (label.length === 0) return null;

	return {
		section: owned.section,
		label,
		href: owned.row.cells.filter(covers).length === 1 ? annotation.url : null,
		row: owned.row.order,
		offset: first.x
	};
}

/** The row whose text band covers most of the annotation's vertical extent, and its owner. */
function ownerForBand(
	owners: ReadonlyMap<Row, DraftSection>,
	bottom: number,
	top: number
): OwnedRow | null {
	let best: OwnedRow | null = null;
	let bestOverlap = 0;

	for (const [row, section] of owners) {
		const boxes = row.cells.map(cell => ({
			bottom: cell.y,
			top: cell.y + Math.max(cell.height, 1)
		}));
		const rowBottom = Math.min(...boxes.map(box => box.bottom));
		const rowTop = Math.max(...boxes.map(box => box.top));
		const shared = Math.min(rowTop, top) - Math.max(rowBottom, bottom);
		if (shared > bestOverlap) {
			best = { row, section };
			bestOverlap = shared;
		}
	}

	return best;
}

/** `Email: x` reads as `Email`; `Website` and `Aurum` read as themselves. */
function labelOf(text: string): string {
	const [label = ""] = text.split(":");
	const [word = ""] = label.trim().split(" ");
	return word;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
	return Math.min(endA, endB) - Math.max(startA, startB) > 0;
}

/** A line's cells: at least one, because a row only exists once a cell stated text. */
function splitCells(text: string): readonly [string, ...string[]] {
	const [first = "", ...rest] = text
		.split(COLUMN_SEPARATOR_PATTERN)
		.map(cell => cell.trim())
		.filter(cell => cell.length > 0);

	return [first, ...rest];
}

function lastLine(rows: readonly Row[]): string | undefined {
	return rows[rows.length - 1]?.text;
}

function fail(message: string, line: string | undefined): never {
	throw new CvParseError(message, line);
}
