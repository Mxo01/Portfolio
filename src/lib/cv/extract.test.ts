import { describe, expect, it, vi } from "vitest";

/**
 * pdf.js is the one thing the CV pipeline borrows from outside: the renderer, the worker
 * and a document load are all mocked here, so the extraction's own mapping — transform to
 * coordinates, annotation to link — is what the test states.
 */

const pdfjs = vi.hoisted(() => ({
	GlobalWorkerOptions: { workerSrc: "" },
	getDocument: vi.fn()
}));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => pdfjs);
vi.mock("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url", () => ({
	default: "pdf.worker.min.mjs"
}));

const { extractCvText } = await import("./extract");
const testSubject = extractCvText;

/** A text run as `getTextContent()` reports it: a string, a matrix, a box. */
interface PageTextItem {
	readonly str: string;
	readonly transform: readonly number[];
	readonly width: number;
	readonly height: number;
}

const IDENTITY = [1, 0, 0, 1, 0, 0];
const TEXT_WIDTH = 40;
const TEXT_HEIGHT = 10;

function textItem(str: string, transform: readonly number[] = IDENTITY): PageTextItem {
	return { str, transform, width: TEXT_WIDTH, height: TEXT_HEIGHT };
}

/** Marked content shares the items array but carries a type, not a string. */
const MARKED_CONTENT = { type: "beginMarkedContent" };

interface FakePage {
	getTextContent: () => Promise<{ readonly items: readonly unknown[] }>;
	getAnnotations: () => Promise<readonly unknown[]>;
}

function page(items: readonly unknown[], annotations: readonly unknown[] = []): FakePage {
	return {
		getTextContent: () => Promise.resolve({ items }),
		getAnnotations: () => Promise.resolve(annotations)
	};
}

interface FakeDocument {
	readonly numPages: number;
	getPage: (pageNumber: number) => Promise<FakePage>;
}

function documentWith(pages: readonly FakePage[], numPages: number = pages.length): FakeDocument {
	return {
		numPages,
		getPage: (pageNumber: number) => {
			const found = pages[pageNumber - 1];
			return found === undefined
				? Promise.reject(new Error(`no page ${pageNumber}`))
				: Promise.resolve(found);
		}
	};
}

const destroy = vi.fn(() => Promise.resolve());

function serve(documentValue: FakeDocument): void {
	pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(documentValue), destroy });
}

const X_FROM_TRANSFORM = 36;
const Y_FROM_TRANSFORM = 791.2;

beforeEach(() => {
	destroy.mockClear();
	pdfjs.getDocument.mockReset();
	pdfjs.GlobalWorkerOptions.workerSrc = "";
});

describe("extractCvText", () => {
	it("reads every text run and every link of every page", async () => {
		const secondPage = page(
			[textItem("Second page", [1, 0, 0, 1, 20, 30])],
			[{ subtype: "Link", url: "https://example.test/second", rect: [1, 2, 3, 4] }]
		);
		serve(
			documentWith([
				page(
					[
						textItem("Mario Di Modica", [1, 0, 0, 1, X_FROM_TRANSFORM, Y_FROM_TRANSFORM]),
						MARKED_CONTENT
					],
					[
						{
							subtype: "Link",
							url: "https://www.linkedin.com/in/mariodimodica/",
							rect: [35.004, 770.594, 76.465, 786.136, 99]
						}
					]
				),
				secondPage
			])
		);

		const result = await testSubject(new Uint8Array([1]));

		expect(result).toEqual({
			items: [
				{
					text: "Mario Di Modica",
					x: X_FROM_TRANSFORM,
					y: Y_FROM_TRANSFORM,
					width: TEXT_WIDTH,
					height: TEXT_HEIGHT
				},
				{ text: "Second page", x: 20, y: 30, width: TEXT_WIDTH, height: TEXT_HEIGHT }
			],
			annotations: [
				{
					url: "https://www.linkedin.com/in/mariodimodica/",
					rect: [35.004, 770.594, 76.465, 786.136]
				},
				{ url: "https://example.test/second", rect: [1, 2, 3, 4] }
			]
		});
	});

	it("hands pdf.js the document bytes and the worker it should use", async () => {
		serve(documentWith([page([])]));
		const data = new Uint8Array([1, 2, 3]);

		await testSubject(data);

		expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe("pdf.worker.min.mjs");
		expect(pdfjs.getDocument).toHaveBeenCalledWith({ data, useSystemFonts: true });
	});

	it("reads a matrix with no coordinate as a zero", async () => {
		serve(documentWith([page([textItem("Short matrix", [1, 0, 0, 1])])]));

		const { items } = await testSubject(new Uint8Array([1]));

		expect(items[0]).toEqual({
			text: "Short matrix",
			x: 0,
			y: 0,
			width: TEXT_WIDTH,
			height: TEXT_HEIGHT
		});
	});

	it("releases the loading task once the document is read", async () => {
		serve(documentWith([page([])]));

		await testSubject(new Uint8Array([1]));

		expect(destroy).toHaveBeenCalledTimes(1);
	});

	it("releases the loading task when a page cannot be read", async () => {
		serve(documentWith([page([])], 0));
		pdfjs.getDocument.mockReturnValue({
			promise: Promise.resolve(documentWith([], 1)),
			destroy
		});

		await expect(testSubject(new Uint8Array([1]))).rejects.toThrow("no page 1");
		expect(destroy).toHaveBeenCalledTimes(1);
	});
});

interface AnnotationCase {
	readonly case: string;
	readonly annotation: unknown;
}

const LINK = { subtype: "Link", url: "https://example.test/", rect: [1, 2, 3, 4] };

const droppedAnnotations: readonly AnnotationCase[] = [
	{ case: "drops a null annotation", annotation: null },
	{ case: "drops an annotation that is not an object", annotation: "Link" },
	{ case: "drops a non-link annotation", annotation: { ...LINK, subtype: "Text" } },
	{ case: "drops a link with no target", annotation: { ...LINK, url: "" } },
	{ case: "drops a link whose target is not a string", annotation: { ...LINK, url: 42 } },
	{ case: "drops a link with no box", annotation: { subtype: "Link", url: LINK.url } },
	{ case: "drops a box that is not an array", annotation: { ...LINK, rect: {} } },
	{ case: "drops a box that is null", annotation: { ...LINK, rect: null } },
	{ case: "drops a box with too few corners", annotation: { ...LINK, rect: [1, 2, 3] } },
	{
		case: "drops a box with a corner that is not a number",
		annotation: { ...LINK, rect: [1, 2, 3, "4"] }
	},
	{ case: "drops a box with no numbers at all", annotation: { ...LINK, rect: { length: 4 } } }
];

describe("extractCvText annotations", () => {
	it.each(droppedAnnotations)("$case", async ({ annotation }) => {
		serve(documentWith([page([textItem("Mario Di Modica")], [annotation])]));

		const { annotations } = await testSubject(new Uint8Array([1]));

		expect(annotations).toEqual([]);
	});
});
