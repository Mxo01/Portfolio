import { COPIED_SEPARATOR, copiedLabel, copySelection } from "@/features/terminal/clipboard";
import type { CopiedLabel } from "@/features/terminal/clipboard";

const testSubject = copiedLabel;
const copy = copySelection;

const VERB = "copied";

interface LabelCase {
	readonly name: string;
	readonly text: string;
	readonly amount: string;
}

const CASES: readonly LabelCase[] = [
	{ name: "one line of prose", text: "no such file", amount: "12 chars" },
	{ name: "a single character", text: "a", amount: "1 char" },
	{ name: "one emoji, counted as one", text: "😂", amount: "1 char" },
	{ name: "two rows", text: "one\ntwo", amount: "2 lines" },
	{ name: "rows dragged to the line end", text: "one\ntwo\n", amount: "2 lines" },
	{ name: "a selection that ends on several newlines", text: "one\ntwo\n\n\n", amount: "2 lines" },
	{ name: "an empty selection", text: "", amount: "0 chars" },
	{ name: "a selection of newlines alone", text: "\n\n", amount: "0 chars" }
];

describe("copiedLabel", () => {
	it.each(CASES)("labels $name", ({ text, amount }) => {
		// WHEN
		const label = testSubject(text);

		// THEN
		expect(label).toEqual({ verb: VERB, amount } satisfies CopiedLabel);
	});

	it("is printed with the separator the toast uses", () => {
		// GIVEN
		const label = testSubject("one\ntwo");

		// WHEN
		const printed = `${label.verb}${COPIED_SEPARATOR}${label.amount}`;

		// THEN
		expect(printed).toBe("copied · 2 lines");
	});
});

interface ClipboardStub {
	readonly writeText: unknown;
}

function stubClipboard(clipboard: ClipboardStub | undefined): void {
	vi.stubGlobal("navigator", clipboard === undefined ? undefined : { clipboard });
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("copySelection", () => {
	it("leaves the clipboard alone for an empty selection", () => {
		// GIVEN
		const writeText = vi.fn(() => Promise.resolve());
		stubClipboard({ writeText });

		// WHEN
		copy("");

		// THEN
		expect(writeText).not.toHaveBeenCalled();
	});

	it("copies a selection of spaces, which is still a selection", () => {
		// GIVEN
		const writeText = vi.fn(() => Promise.resolve());
		stubClipboard({ writeText });

		// WHEN
		copy(" ");

		// THEN
		expect(writeText).toHaveBeenCalledWith(" ");
	});

	it("writes the selection as it stands", () => {
		// GIVEN
		const writeText = vi.fn(() => Promise.resolve());
		stubClipboard({ writeText });

		// WHEN
		copy("no such file");

		// THEN
		expect(writeText).toHaveBeenCalledWith("no such file");
	});

	it("says nothing when the browser has no clipboard", () => {
		// GIVEN
		stubClipboard(undefined);

		// WHEN
		const write = () => copy("no such file");

		// THEN
		expect(write).not.toThrow();
	});

	it("says nothing when the clipboard has no write", () => {
		// GIVEN a clipboard object the browser hands back without a writable member
		stubClipboard({ writeText: undefined });

		// WHEN
		const write = () => copy("no such file");

		// THEN
		expect(write).not.toThrow();
	});

	it("says nothing when write is not a function", () => {
		// GIVEN
		stubClipboard({ writeText: "nope" });

		// WHEN
		const write = () => copy("no such file");

		// THEN
		expect(write).not.toThrow();
	});

	it("swallows a write the browser refuses", async () => {
		// GIVEN
		const writeText = vi.fn(() => Promise.reject(new Error("denied")));
		stubClipboard({ writeText });

		// WHEN
		copy("no such file");
		await Promise.resolve();

		// THEN
		expect(writeText).toHaveBeenCalledTimes(1);
	});

	it("swallows a write that throws on the spot", () => {
		// GIVEN a gesture that has already expired
		const writeText = vi.fn(() => {
			throw new Error("expired");
		});
		stubClipboard({ writeText });

		// WHEN
		const write = () => copy("no such file");

		// THEN
		expect(write).not.toThrow();
	});
});
