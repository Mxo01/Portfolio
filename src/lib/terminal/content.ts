import {
	buildContent,
	sectionValue,
	TITLE_LOCATION,
	TITLE_NAME,
	TITLE_PERIOD,
	TITLE_ROLE,
	TITLE_STACK
} from "@/lib/content/tree";

import { HOME_PATH } from "./constants";
import { wrapText } from "./cv-layout";
import { experienceTotals } from "./experience";
import type { CareerEntry } from "./experience";
import { dim, error, span } from "./lines";
import { fileAt, labelLead } from "./output";
import { filesIn } from "./path";
import type { ContentDir, ContentSection, Line, Span, Tone } from "./types";

/**
 * The shell's account of its one content file.
 *
 * The boot is silent: the grid opens empty with a cursor, and a line typed before the
 * document arrives waits for it. Nothing says that a load is in progress, and nothing
 * congratulates the visitor when it ends — the welcome block appears, and that is the
 * only sign the shell is ready.
 *
 * A document the contract cannot read is the one thing printed unasked: once, with the
 * reason, never a blank tree and never a thrown error.
 */

/** When a command finds the tree missing: it has still not arrived. */
export const LOADING_REASON = "still loading";

const OFFENDING = "offending line";
/** The banner reads as a column, not as a line across a 200-column terminal. */
const WELCOME_WIDTH = 80;
/** The separator between facts and between hints: the same breath in both rows. */
const SEPARATOR = " · ";
/** The comma the CV joins its stack on, and the dot the shell prints instead. */
const STACK_JOIN = /,/;
const PROFILE_PATH = "/about/profile";
const CAREER_PATH = "/career";

/**
 * A career entry's fields: the four the splash derives from. `company` is the entry's `Name`
 * in the tree — the CV prints the employer on the entry's own headline.
 */
const CAREER_TITLES = {
	company: TITLE_NAME,
	role: TITLE_ROLE,
	period: TITLE_PERIOD,
	stack: TITLE_STACK
} as const;

/**
 * The banner, six rows, pasted as drawn. `String.raw` keeps the box glyphs' backslashes
 * literal, so the art is exactly the bytes below and a reader can diff it against the source.
 */
const ART: readonly string[] = String.raw`  __  __          _____  _____ ____
 |  \/  |   /\   |  __ \|_   _/ __ \
 | \  / |  /  \  | |__) | | || |  | |
 | |\/| | / /\ \ |  _  /  | || |  | |
 | |  | |/ ____ \| | \ \ _| || |__| |
 |_|  |_/_/    \_\_|  \_\_____\____/`.split("\n");

/**
 * The banner's own width, measured off the literal's rows — leading space included — so the
 * threshold below can never be a stale guess. The block is one piece of type, never wrapped
 * and never cropped.
 */
const ART_WIDTH = Math.max(...ART.map(row => row.length));
/**
 * Air past the art's last glyph, never less than one column: a row that fills the grid is a
 * row xterm re-wraps, and a wrapped banner is a torn one. Two columns also keep the last
 * glyph off the edge. Below the sum, the list prints alone.
 */
const ART_MARGIN = 2;
const ART_MINIMUM_COLUMNS = ART_WIDTH + ART_MARGIN;

/**
 * The list's labels, in the order they print and in the words `whoami` already uses for the
 * same concepts, so the two panels are read as one system rather than two reports.
 */
const LABELS = {
	role: "Role",
	company: "Company",
	location: "Location",
	experience: "Experience",
	stack: "Stack"
} as const;

/** The one label column: the longest label, plus the gap `whoami` sets its own values at. */
const LABEL_WIDTH = Math.max(...Object.values(LABELS).map(label => label.length));
/** Where every value starts — the label column and its gap, with no label in it. */
const VALUE_INDENT = labelLead("", LABEL_WIDTH);

/** Exactly three ways in, in the order a visitor needs them. */
const HINTS: readonly string[] = ["help", "whoami", "cat cv.pdf"];

/**
 * One row of the list: the label it prints, the CV value behind it, and the register that
 * value wears. `stack` marks the one value that is a dotted list of names rather than a
 * phrase, so it is wrapped between its items and never inside one.
 */
interface Fact {
	readonly label: string;
	readonly value: string | undefined;
	readonly tone?: Tone;
	readonly stack?: boolean;
}

/**
 * The splash: the banner, then the CV's facts as a labelled list — role, company, city, the
 * total experience, the stack — then three hints.
 *
 * Pure — sections and a width in, lines out — so the view only decides when to print it. The
 * one thing that is not read from the document is the moment: `now` resolves the career's
 * open entry, and it is a parameter so a reprinted splash and the boot cannot disagree about
 * the calendar by accident.
 *
 * The name and the city are no longer typed across the block: identity is on the art, and
 * everything under it is a fact with a label that says what it is. The labels are the words
 * `whoami` prints, the values the same fields, and every value starts in the column the
 * longest label leaves — one column, computed here, never a magic width.
 *
 * Rule change, deliberate: an earlier ruling kept the splash to CV strings only, with no
 * derived value. The visitor asked for the current role, the total experience and the stack
 * on the opening screen, so derived values are back — and they come from the parsed CV alone:
 * the role, the company, the period and the stack are the career entries' own fields, joined
 * and counted, never typed here.
 *
 * The CV's summary sentence is not on the splash any more: it is prose, it made the opening
 * screen a paragraph, and `cat about/summary` still prints it verbatim, line for line.
 */
export function welcomeLines(
	sections: readonly ContentSection[],
	columns: number,
	now: Date = new Date()
): readonly Line[] {
	const root = buildContent(sections);
	const profile = fileAt(root, PROFILE_PATH);
	const totals = experienceTotals(careerEntries(root), now);
	const current = totals.current;
	const stated = profile?.sections ?? [];

	const facts: readonly Fact[] = [
		// The entry still running is what the role is now; the profile is the CV's fallback
		// headline, so a career the parser cannot date still names a role.
		{ label: LABELS.role, value: text(current?.role) ?? text(sectionValue(stated, TITLE_ROLE)) },
		{ label: LABELS.company, value: text(current?.company), tone: "info" },
		{ label: LABELS.location, value: text(sectionValue(stated, TITLE_LOCATION)) },
		{ label: LABELS.experience, value: text(totals.total) },
		{ label: LABELS.stack, value: text(current?.stack), tone: "dim", stack: true }
	];

	const rows: Line[] = [];
	if (columns >= ART_MINIMUM_COLUMNS) rows.push(...ART.map(row => [span(row, "accent")]), []);

	return [...rows, ...factLines(facts, columns), [], hintRow(), []];
}

/**
 * A document the contract refused, or a fetch that never arrived: the reason and the line
 * that broke it when there is one. No retry hint, no second paragraph — the shape of the
 * CV is not something a visitor can fix.
 */
export function failureLines(reason: string, line?: string): readonly Line[] {
	return [
		error(`content unavailable: ${reason}`),
		...(line === undefined ? [] : [dim(`${OFFENDING}: "${line}"`)])
	];
}

/** The same message a command prints when it needs content that is not there yet. */
export function unavailableLines(reason: string): readonly Line[] {
	return [error(`content unavailable: ${reason}`)];
}

/** The three ways in as one row: the commands in the accent, the separators muted. */
function hintRow(): Line {
	const row: Span[] = [];

	HINTS.forEach((command, index) => {
		if (index > 0) row.push(span(SEPARATOR, "dim"));
		row.push(span(command, "accent"));
	});

	return row;
}

/**
 * The list as it prints: one row per fact the CV states, every value starting in the same
 * column. A fact the document does not state produces no row at all — no empty label, no
 * placeholder, and nothing standing in for an answer the CV does not give.
 *
 * Values wrap under the value column, never under the labels: the continuation rows carry
 * the same indent and nothing else, which is what makes a long stack read as one column of
 * names instead of a sentence restarting under `Stack`.
 */
function factLines(facts: readonly Fact[], columns: number): readonly Line[] {
	const valueColumns = valueColumn(columns);

	return facts.flatMap(fact => {
		const written = fact.value;
		if (written === undefined) return [];

		const values =
			fact.stack === true
				? packStack(technologies(written), valueColumns)
				: wrapText(written, valueColumns);

		return values.map((value, index): Line => [
			span(index === 0 ? labelLead(fact.label, LABEL_WIDTH) : VALUE_INDENT, "dim"),
			span(value, fact.tone)
		]);
	});
}

/**
 * The cells a value may use: what the screen holds past the label column, never more than the
 * splash's own width. The cap is on the value, so the block stays a column on a wide terminal
 * without a wrapped row ever reaching past a narrow one.
 */
function valueColumn(columns: number): number {
	return Math.max(1, Math.min(columns - VALUE_INDENT.length, WELCOME_WIDTH));
}

/** The CV's stack line as its technologies: the comma the document writes, the trim it needs. */
function technologies(stack: string): readonly string[] {
	return stack
		.split(STACK_JOIN)
		.map(technology => technology.trim())
		.filter(technology => technology.length > 0);
}

/**
 * Greedy wrap at the shell's dot over the technologies themselves: a row keeps the most
 * names that still fit it, and a row never starts or ends with a separator — the dot only
 * ever sits between two names it actually joins. Wrapping happens between names, never
 * inside one, so a stack is always whole words on the screen: `Java Spring` and `Boot` on
 * two rows is not a stack.
 */
function packStack(technologies: readonly string[], columns: number): readonly string[] {
	const lines: string[] = [];
	let line = "";

	for (const technology of technologies) {
		if (line.length === 0) {
			line = technology;
			continue;
		}

		const joined = `${line}${SEPARATOR}${technology}`;
		// A name wider than the whole column still gets a row of its own: it is never cut.
		if (joined.length <= columns) {
			line = joined;
			continue;
		}

		lines.push(line);
		line = technology;
	}

	if (line.length > 0) lines.push(line);
	return lines;
}

/**
 * The CV's career entries and the four fields the splash reads from them. `company` is the
 * entry's `Name` in the tree: the document prints the employer on the entry's headline.
 */
function careerEntries(root: ContentDir): readonly CareerEntry[] {
	return filesIn(HOME_PATH, CAREER_PATH, root).map(file => ({
		company: sectionValue(file.sections, CAREER_TITLES.company),
		role: sectionValue(file.sections, CAREER_TITLES.role),
		period: sectionValue(file.sections, CAREER_TITLES.period),
		stack: sectionValue(file.sections, CAREER_TITLES.stack)
	}));
}

/** A CV field with something in it, trimmed; `undefined` when the document states nothing. */
function text(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}
