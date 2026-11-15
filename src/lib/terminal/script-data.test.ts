import {
	EXPORT_CV_DEBRIEF,
	EXPORT_CV_SCRIPT,
	EXPORT_CV_STEPS,
	isExecutable,
	isReadable,
	permissionDenied,
	scheduleBeats,
	scriptFor
} from "@/lib/terminal/script-data";
import type { ContentFile } from "@/lib/terminal/types";
import { lineText, textsOf } from "@/test/fixtures/render";
import { fixtureDir, fixtureExecutable, fixtureFile } from "@/test/fixtures/terminal";

const testSubject = scheduleBeats;

/** The pause window `scheduleBeats` draws from: the low end is exact, the high end inclusive. */
const MIN_DELAY_MS = 350;
const MAX_DELAY_MS = 3000;
const LOW = 0;
/** Just under one: `Math.random` never returns the endpoint. */
const HIGH = 0.9999999;
const MIDDLE_DRAW = 0.5;
const MIDDLE_DELAY_MS = 1675;

const CONFESSION: readonly number[] = [600, 700, 600, 700, 900, 700, 0];
const PUNCHLINE = "just kidding 😂";
const DEBRIEF_FIRST_LINE = "";
const DEBRIEF_LAST_LINE = "😂";
const TARGET = "export_cv.sh";

/** A node that carries the runnable flag switched off: the guard, not a shape the tree builds. */
interface FlaggedFile extends ContentFile {
	readonly executable: boolean;
}

const NOT_RUNNABLE: FlaggedFile = {
	kind: "file",
	name: TARGET,
	path: `/${TARGET}`,
	sections: [],
	executable: false
};

describe("the script", () => {
	it("plays the confession in order, at the gag's own pace", () => {
		// WHEN
		const played = EXPORT_CV_STEPS.map(step => [lineText(step.line), step.delayMs]);

		// THEN
		expect(played).toEqual([
			["reading your system files…", 600],
			["reading your passwords…", 700],
			["wifi password found!", 600],
			["google account access granted!", 700],
			["installing a virus…", 900],
			["almost done…", 700],
			[PUNCHLINE, 0]
		]);
	});

	it("paints progress muted and the punchlines in the accent", () => {
		// WHEN
		const tones = EXPORT_CV_STEPS.map(step => step.line);

		// THEN
		expect(tones.map(line => (typeof line === "string" ? undefined : line[0]?.tone))).toEqual([
			"dim",
			"dim",
			"accent",
			"accent",
			"dim",
			"dim",
			"accent"
		]);
	});

	it("lands the last beat at once, so nothing delays the download", () => {
		// WHEN
		const last = EXPORT_CV_STEPS.at(-1);

		// THEN
		expect(lineText(last?.line ?? "")).toBe(PUNCHLINE);
		expect(last?.delayMs).toBe(0);
	});

	it("prints the admission line for line, standing away from the joke", () => {
		// WHEN
		const lines = textsOf(EXPORT_CV_DEBRIEF);

		// THEN
		expect(lines[0]).toBe(DEBRIEF_FIRST_LINE);
		expect(lines.at(-1)).toBe(DEBRIEF_LAST_LINE);
		expect(lines).toContain(
			"nothing happened. no files were read, no passwords were touched, no network"
		);
	});

	it("hands the view the copy, the admission and the one side effect", () => {
		// WHEN / THEN
		expect(EXPORT_CV_SCRIPT.steps).toBe(EXPORT_CV_STEPS);
		expect(EXPORT_CV_SCRIPT.debrief).toBe(EXPORT_CV_DEBRIEF);
		expect(EXPORT_CV_SCRIPT.action).toBe("download-cv");
	});
});

describe("scheduleBeats", () => {
	it("draws the lowest pause when the source returns nothing", () => {
		// WHEN
		const paced = testSubject(() => LOW);

		// THEN every beat that means to land waits the floor, and the punchline still does not
		expect(paced).toEqual(CONFESSION.map(delay => (delay === 0 ? 0 : MIN_DELAY_MS)));
	});

	it("stops at the cap when the source returns nearly one", () => {
		// WHEN
		const paced = testSubject(() => HIGH);

		// THEN
		expect(paced).toEqual(CONFESSION.map(delay => (delay === 0 ? 0 : MAX_DELAY_MS)));
	});

	it.each([LOW, 0.1, 0.25, MIDDLE_DRAW, 0.75, 0.9, HIGH])(
		"keeps every pause inside its window for a draw of %s",
		draw => {
			// WHEN
			const paced = testSubject(() => draw);

			// THEN
			for (const delay of paced) {
				expect(delay).toBeGreaterThanOrEqual(0);
				expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS);
			}
			for (const [index, delay] of paced.entries()) {
				if (CONFESSION[index] === 0) {
					expect(delay).toBe(0);
					continue;
				}
				expect(delay).toBeGreaterThanOrEqual(MIN_DELAY_MS);
			}
		}
	);

	it("maps a middle draw to its own millisecond", () => {
		// WHEN
		const paced = testSubject(() => MIDDLE_DRAW);

		// THEN
		expect(paced[0]).toBe(MIDDLE_DELAY_MS);
	});

	it("bounds the whole playback by the cap times the paced beats", () => {
		// WHEN
		const paced = testSubject(() => HIGH);
		const total = paced.reduce((sum, delay) => sum + delay, 0);
		const beats = CONFESSION.filter(delay => delay !== 0).length;

		// THEN
		expect(total).toBeLessThanOrEqual(MAX_DELAY_MS * beats);
	});

	it("draws once per beat that waits", () => {
		// GIVEN
		const draws = vi.fn(() => MIDDLE_DRAW);

		// WHEN
		testSubject(draws, EXPORT_CV_STEPS);

		// THEN
		expect(draws).toHaveBeenCalledTimes(CONFESSION.filter(delay => delay !== 0).length);
	});

	it("paces the steps it is handed, not the shipped ones", () => {
		// GIVEN a two-step script, one of which lands at once
		const steps = [
			{ line: "a", delayMs: 5 },
			{ line: "b", delayMs: 0 }
		] as const;

		// WHEN
		const paced = testSubject(() => LOW, steps);

		// THEN
		expect(paced).toEqual([MIN_DELAY_MS, 0]);
	});
});

describe("isExecutable", () => {
	it("reads the flag, never the name", () => {
		// GIVEN
		const runnable = fixtureExecutable();

		// WHEN / THEN
		expect(isExecutable(runnable)).toBe(true);
		expect(isExecutable(fixtureFile("/export_cv.sh"))).toBe(false);
	});

	it("refuses a directory", () => {
		// WHEN / THEN
		expect(isExecutable(fixtureDir("/scripts", []))).toBe(false);
	});

	it("refuses a node whose flag is present but off", () => {
		// WHEN / THEN
		expect(isExecutable(NOT_RUNNABLE)).toBe(false);
	});
});

describe("scriptFor", () => {
	it("hands back the script an executable plays", () => {
		// WHEN
		const script = scriptFor(fixtureExecutable());

		// THEN
		expect(script).toBe(EXPORT_CV_SCRIPT);
	});

	it("hands back nothing for a file the shell only prints", () => {
		// WHEN / THEN
		expect(scriptFor(fixtureFile(`/${TARGET}`))).toBeNull();
		expect(scriptFor(fixtureDir("/scripts", []))).toBeNull();
	});
});

describe("isReadable", () => {
	it("prints any directory", () => {
		// WHEN / THEN
		expect(isReadable(fixtureDir("/scripts", []))).toBe(true);
	});

	it("prints a file that states no refusal", () => {
		// WHEN / THEN
		expect(isReadable(fixtureFile(`/${TARGET}`))).toBe(true);
	});

	it("refuses a file that states one", () => {
		// GIVEN
		const refused = fixtureFile(`/${TARGET}`, [], { readable: false });

		// WHEN / THEN
		expect(isReadable(refused)).toBe(false);
	});
});

describe("permissionDenied", () => {
	it("names the target in the shell's one refusal", () => {
		// WHEN / THEN
		expect(permissionDenied(TARGET)).toBe(`permission denied: ${TARGET}`);
	});
});
