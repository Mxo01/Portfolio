import { accent, blank, dim, error, heading, plain, span, withTone } from "@/lib/terminal/lines";
import type { Line, Tone } from "@/lib/terminal/types";

const makeSpan = span;
const inTone = withTone;

const TEXT = "career";

describe("span", () => {
	it("defaults to the plain register", () => {
		// WHEN
		const run = makeSpan(TEXT);

		// THEN
		expect(run).toEqual({ text: TEXT, tone: "plain" });
	});

	it("carries the register it was given", () => {
		// WHEN
		const run = makeSpan(TEXT, "accent");

		// THEN
		expect(run).toEqual({ text: TEXT, tone: "accent" });
	});
});

describe("withTone", () => {
	it.each(["heading", "dim", "accent", "error"] as const)("paints a line %s", (tone: Tone) => {
		// WHEN
		const line = inTone(tone, TEXT);

		// THEN
		expect(line).toEqual([{ text: TEXT, tone }]);
	});
});

describe("line builders", () => {
	it.each([
		{ name: "plain", build: () => plain(TEXT), expected: TEXT },
		{ name: "blank", build: () => blank(), expected: "" }
	])("$name stays a bare string", ({ build, expected }: { build: () => Line; expected: Line }) => {
		// WHEN
		const line = build();

		// THEN
		expect(line).toBe(expected);
	});

	it.each([
		{ name: "dim", build: dim, tone: "dim" as const },
		{ name: "heading", build: heading, tone: "heading" as const },
		{ name: "accent", build: accent, tone: "accent" as const },
		{ name: "error", build: error, tone: "error" as const }
	])("$name wraps the text in its register", ({ build, tone }) => {
		// WHEN
		const line = build(TEXT);

		// THEN
		expect(line).toEqual([{ text: TEXT, tone }]);
	});
});
