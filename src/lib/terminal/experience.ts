/**
 * How long the CV's career adds up to, and which of its entries is the one still running.
 *
 * Pure: entries and a moment in, a number and a string out. The clock is a parameter, never
 * a read, so this file stays testable and a splash reprinted at a different hour is the same
 * splash. `now` is the moment the caller wants "Present" resolved at.
 *
 * Rule change, deliberate: an earlier ruling kept the splash to CV strings only, with nothing
 * derived from them. The visitor asked for the current role, the total experience and the
 * stack on the opening screen, so derived values are back — on one condition: everything here
 * comes from the parsed CV's own period, role, company and stack fields. Nothing is typed by
 * hand, nothing is estimated, and a period this module cannot read is dropped rather than
 * turned into a wrong number.
 */

/** One career entry as the CV states it: the fields the splash and the total read. */
export interface CareerEntry {
	readonly role?: string;
	readonly company?: string;
	readonly period?: string;
	readonly stack?: string;
}

/** The career in one value: the total, how far it counts, and the entry it ends on. */
export interface ExperienceTotals {
	/** Calendar months worked, each month counted once across overlapping entries. */
	readonly months: number;
	/** The total as the splash prints it — `3y`, `3y 2m`, `2m`; absent when nothing parsed. */
	readonly total?: string;
	/** The open-ended entry, else the one that ended last; absent when no period parsed. */
	readonly current?: CareerEntry;
}

/**
 * A month as one integer, so a period is subtraction and a union is a set of ranges rather
 * than a calendar walk. January 2024 is `2024 * 12 + 0`.
 */
type MonthIndex = number;

/** One entry with its period resolved: the two ends, in or out. */
interface MonthRange {
	readonly entry: CareerEntry;
	readonly start: MonthIndex;
	readonly end: MonthIndex;
	/** Whether the period is still open: the entry the visitor is in today. */
	readonly open: boolean;
}

/** A stretch of calendar months, both ends included, with no entry attached. */
interface MonthSpan {
	readonly start: MonthIndex;
	readonly end: MonthIndex;
}

const MONTHS_PER_YEAR = 12;
const MONTH_LETTERS = 3;

/** The document's month names, abbreviated, in the order January to December. */
const MONTH_NAMES: readonly string[] = [
	"jan",
	"feb",
	"mar",
	"apr",
	"may",
	"jun",
	"jul",
	"aug",
	"sep",
	"oct",
	"nov",
	"dec"
];

/**
 * `Mon YYYY – Mon YYYY` as the CV writes it: the en dash, a hyphen accepted, and `Present`
 * for the entry still running. The month is matched loosely and looked up in `MONTH_NAMES`,
 * so a full name reads and a word that is not a month does not.
 */
const PERIOD = /^([A-Za-z]+)\s+(\d{4})\s*[–-]\s*(?:([A-Za-z]+)\s+(\d{4})|present)$/i;

/**
 * The career's total and its current entry. An entry whose period this module cannot read
 * contributes nothing to either — a missing total is honest, a wrong one is not.
 */
export function experienceTotals(
	careerEntries: readonly CareerEntry[],
	now: Date
): ExperienceTotals {
	const today = monthIndex(now.getFullYear(), now.getMonth() + 1);
	const ranges = careerEntries.flatMap((entry): readonly MonthRange[] => {
		const range = rangeOf(entry, today);
		return range === null ? [] : [range];
	});
	const months = counted(merged(ranges));
	const current = currentOf(ranges);
	const total = months === 0 ? undefined : formatTotal(months);

	return {
		months,
		...(total === undefined ? {} : { total }),
		...(current === undefined ? {} : { current })
	};
}

/** One entry's period resolved against today, or `null` when it cannot be read. */
function rangeOf(entry: CareerEntry, today: MonthIndex): MonthRange | null {
	const period = entry.period?.trim();
	if (period === undefined || period.length === 0) return null;

	const match = PERIOD.exec(period);
	if (match === null) return null;

	const [, startMonth = "", startYear = "", endMonth = "", endYear = ""] = match;
	const start = monthOf(startMonth);
	if (start === null) return null;
	const from = monthIndex(Number(startYear), start);

	// No end month is the open alternative: the entry runs to the month the caller supplied.
	// A period that opens after that month is no more a period than one that ends before it
	// starts: refused rather than counted backwards, so a future `Present` cannot deflate the
	// total it contributes to.
	if (endMonth.length === 0) {
		return from > today ? null : { entry, start: from, end: today, open: true };
	}

	const end = monthOf(endMonth);
	if (end === null) return null;
	const to = monthIndex(Number(endYear), end);

	// A period that ends before it starts is not a period: the entry is dropped, not counted.
	return to < from ? null : { entry, start: from, end: to, open: false };
}

/** A month name as its number, 1 for January; `null` for a word that names no month. */
function monthOf(name: string): number | null {
	const index = MONTH_NAMES.indexOf(name.slice(0, MONTH_LETTERS).toLowerCase());
	return index < 0 ? null : index + 1;
}

/** A year and a month of that year as one integer, so two months are subtracted, not walked. */
function monthIndex(year: number, month: number): MonthIndex {
	return year * MONTHS_PER_YEAR + (month - 1);
}

/**
 * The ranges as a union, in order: an entry that started while another was running adds only
 * the months it opened, so a handover month counts once instead of twice.
 */
function merged(ranges: readonly MonthRange[]): readonly MonthSpan[] {
	const ordered = [...ranges].sort((first, second) => first.start - second.start);
	const union: { start: MonthIndex; end: MonthIndex }[] = [];

	for (const range of ordered) {
		const last = union[union.length - 1];
		if (last !== undefined && range.start <= last.end) {
			last.end = Math.max(last.end, range.end);
			continue;
		}
		union.push({ start: range.start, end: range.end });
	}

	return union;
}

/** How many calendar months the merged ranges cover, both ends included. */
function counted(spans: readonly MonthSpan[]): number {
	return spans.reduce((months, span) => months + (span.end - span.start + 1), 0);
}

/**
 * The entry the visitor is in: the open one, and when the CV states several, the one that
 * started last. Without an open entry, the one that ended last — the CV's newest, read as a
 * date rather than trusted as a document order.
 */
function currentOf(ranges: readonly MonthRange[]): CareerEntry | undefined {
	const open = ranges.filter(range => range.open);
	const pool = open.length > 0 ? open : ranges;
	const key = (candidate: MonthRange): MonthIndex =>
		open.length > 0 ? candidate.start : candidate.end;

	return pool.reduce<MonthRange | undefined>(
		(latest, range) => (latest === undefined || key(range) > key(latest) ? range : latest),
		undefined
	)?.entry;
}

/** `3y`, `3y 2m`, `2m`: whole years where they are whole, the remainder only when there is one. */
function formatTotal(months: number): string {
	const years = Math.floor(months / MONTHS_PER_YEAR);
	const rest = months % MONTHS_PER_YEAR;

	if (years === 0) return `${rest}m`;
	return rest === 0 ? `${years}y` : `${years}y ${rest}m`;
}
