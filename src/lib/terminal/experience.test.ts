import { experienceTotals } from "@/lib/terminal/experience";
import type { CareerEntry } from "@/lib/terminal/experience";
import { JUNE_2024, moment } from "@/test/fixtures/terminal";

const testSubject = experienceTotals;

interface ExperienceCase {
	readonly name: string;
	readonly career: readonly CareerEntry[];
	readonly now?: Date;
	readonly months: number;
	readonly total?: string;
	/** Index of the entry the totals call current, or `undefined` when there is none. */
	readonly current?: number;
}

const ROLE: CareerEntry = { role: "Engineer", company: "Aurum", period: "Jan 2020 – Dec 2020" };
const LATER: CareerEntry = {
	role: "Senior engineer",
	company: "FitCheck",
	period: "Jan 2022 – Dec 2023"
};

const CASES: readonly ExperienceCase[] = [
	{ name: "no entries at all", career: [], months: 0 },
	{ name: "an entry with no period", career: [{ role: "Engineer" }], months: 0 },
	{ name: "an entry with a blank period", career: [{ period: "   " }], months: 0 },
	{ name: "a period of `Present` alone", career: [{ period: "Present" }], months: 0 },
	{ name: "a period that is not a period", career: [{ period: "Spring 2020" }], months: 0 },
	{
		name: "a start month that names no month",
		career: [{ period: "Foo 2020 – Dec 2020" }],
		months: 0
	},
	{
		name: "an end month that names no month",
		career: [{ period: "Jan 2020 – Foo 2021" }],
		months: 0
	},
	{
		name: "a period that ends before it starts",
		career: [{ period: "Dec 2020 – Jan 2020" }],
		months: 0
	},
	{ name: "one whole year", career: [ROLE], months: 12, total: "1y", current: 0 },
	{
		name: "one month",
		career: [{ period: "Jan 2024 – Jan 2024" }],
		months: 1,
		total: "1m",
		current: 0
	},
	{
		name: "two months",
		career: [{ period: "Jan 2024 – Feb 2024" }],
		months: 2,
		total: "2m",
		current: 0
	},
	{
		name: "three years and two months",
		career: [{ period: "Jan 2020 – Feb 2023" }],
		months: 38,
		total: "3y 2m",
		current: 0
	},
	{
		name: "three months of a full month name",
		career: [{ period: "January 2020 – March 2020" }],
		months: 3,
		total: "3m",
		current: 0
	},
	{
		name: "a hyphen where the CV prints an en dash",
		career: [{ period: "Jan 2020 - Mar 2020" }],
		months: 3,
		total: "3m",
		current: 0
	},
	{
		name: "a padded period",
		career: [{ period: "  Jan 2020 – Dec 2020  " }],
		months: 12,
		total: "1y",
		current: 0
	},
	{
		name: "a handover month counted once",
		career: [
			{ period: "Jan 2020 – Dec 2021" },
			{ role: "Senior engineer", period: "Jun 2021 – Dec 2021" }
		],
		months: 24,
		total: "2y",
		current: 0
	},
	{
		name: "a period contained in another",
		career: [{ period: "Jan 2020 – Dec 2022" }, { period: "Feb 2021 – Mar 2021" }],
		months: 36,
		total: "3y",
		current: 0
	},
	{
		name: "entries listed newest first",
		career: [LATER, ROLE],
		months: 36,
		total: "3y",
		current: 0
	},
	{
		name: "two periods back to back",
		career: [{ period: "Jan 2020 – Dec 2020" }, { period: "Jan 2021 – Dec 2021" }],
		months: 24,
		total: "2y",
		current: 1
	},
	{
		name: "the entry still running",
		career: [{ period: "Mar 2022 – Present" }],
		now: JUNE_2024,
		months: 28,
		total: "2y 4m",
		current: 0
	},
	{
		name: "`present` in lower case",
		career: [{ period: "mar 2022 – present" }],
		now: JUNE_2024,
		months: 28,
		total: "2y 4m",
		current: 0
	},
	{
		name: "two open entries: the one that started last is current",
		career: [{ period: "Jan 2020 – Present" }, { period: "Mar 2021 – Present" }],
		now: JUNE_2024,
		months: 54,
		total: "4y 6m",
		current: 1
	},
	{
		name: "an open entry outranks a closed one that ended later",
		career: [{ period: "Jan 2020 – Present" }, { period: "Jan 2024 – Jun 2024" }],
		now: JUNE_2024,
		months: 54,
		total: "4y 6m",
		current: 0
	},
	{
		name: "without an open entry, the one that ended last is current",
		career: [{ period: "Jan 2020 – Dec 2020" }, { period: "Jan 2022 – Dec 2023" }],
		months: 36,
		total: "3y",
		current: 1
	},
	{
		name: "an open range that starts after today is refused, not clamped",
		career: [{ period: "Jan 6789 – Present" }],
		months: 0
	},
	{
		name: "a future open range never becomes the current entry",
		career: [{ period: "Jan 6789 – Present" }, ROLE],
		months: 12,
		total: "1y",
		current: 1
	},
	{
		name: "an unreadable entry is skipped, not counted",
		career: [{ period: "Spring 2020" }, { period: "Jan 2020 – Dec 2020" }],
		months: 12,
		total: "1y",
		current: 1
	}
];

describe("experienceTotals", () => {
	it.each(CASES)("$name", ({ career, now, months, total, current }) => {
		// WHEN
		const totals = testSubject(career, now ?? JUNE_2024);

		// THEN
		expect(totals.months).toBe(months);
		expect(totals.total).toBe(total);
		expect(totals.current).toBe(current === undefined ? undefined : career[current]);
	});

	it("reads only the month of the moment it is given", () => {
		// GIVEN two moments in the same month
		const firstOfJune = moment(2024, 6);
		const lastOfJune = new Date(2024, 5, 30);

		// WHEN
		const early = testSubject([{ period: "Jan 2024 – Present" }], firstOfJune);
		const late = testSubject([{ period: "Jan 2024 – Present" }], lastOfJune);

		// THEN
		expect(early).toEqual(late);
	});

	it("has no total and no current entry when every period is unreadable", () => {
		// WHEN
		const totals = testSubject([{ period: "sometime" }], JUNE_2024);

		// THEN
		expect(totals).toEqual({ months: 0 });
	});
});
