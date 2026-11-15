import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PixelRect, RgbaImage } from "@/lib/portrait/grid";
import { toGrid } from "@/lib/portrait/grid";
import { loadPortrait } from "@/lib/portrait/load";
import { blankImage, inkImage } from "@/test/fixtures/portrait";

/**
 * The browser `load.ts` narrows to: a bitmap it can measure and close, and a 2D context it
 * can draw on and read back. The doubles below supply exactly those members, so the one
 * place they meet the DOM's own types is the cast in `asBitmap`.
 */

/** Enough bytes to look like a JPEG to `fetch`. */
const IMAGE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
/** What the probe pass is allowed to measure: the widest side of a scaled-down copy. */
const PROBE_WIDTH = 192;
/** The width the decoded grid is kept at. */
const STORED_WIDTH = 96;

/** The members `load.ts` calls on a 2D context. */
interface FakeContext {
	readonly draws: readonly (readonly number[])[];
	readonly reads: readonly PixelRect[];
	drawImage(...args: number[]): void;
	getImageData(x: number, y: number, width: number, height: number): RgbaImage;
}

/** One canvas as the loader created it, with the context it was given. */
interface CreatedCanvas {
	readonly width: number;
	readonly height: number;
	readonly context: FakeContext | null;
}

/** A bitmap that says how many times it was closed. */
interface FakeBitmap {
	readonly width: number;
	readonly height: number;
	readonly close: ReturnType<typeof vi.fn>;
}

function fakeContext(
	options: { readonly image?: RgbaImage; readonly failure?: Error } = {}
): FakeContext {
	const draws: number[][] = [];
	const reads: PixelRect[] = [];

	return {
		draws,
		reads,
		drawImage(...args: number[]) {
			draws.push(args);
		},
		getImageData(x: number, y: number, width: number, height: number) {
			reads.push({ x, y, width, height });

			if (options.failure !== undefined) throw options.failure;
			if (options.image === undefined) throw new Error("no image queued for this context");

			return options.image;
		}
	};
}

function fakeBitmap(width: number, height: number): FakeBitmap {
	return { width, height, close: vi.fn() };
}

/** The one bridge to the DOM's own type: the double is a bitmap for every member read. */
function asBitmap(bitmap: FakeBitmap): ImageBitmap {
	return bitmap as unknown as ImageBitmap;
}

/** Replaces `OffscreenCanvas` with a factory handing out the contexts in `plan`, in order. */
function installCanvases(plan: readonly (FakeContext | null)[]): CreatedCanvas[] {
	const created: CreatedCanvas[] = [];

	class FakeOffscreenCanvas {
		readonly width: number;
		readonly height: number;
		readonly context: FakeContext | null;

		constructor(width: number, height: number) {
			this.width = width;
			this.height = height;
			this.context = plan[created.length] ?? null;
			created.push(this);
		}

		getContext(): FakeContext | null {
			return this.context;
		}
	}

	vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
	return created;
}

function imageResponse(ok = true): Response {
	return new Response(IMAGE_BYTES, { status: ok ? 200 : 404 });
}

let fetchMock: ReturnType<typeof vi.fn>;
let bitmapMock: ReturnType<typeof vi.fn>;
let bitmap: FakeBitmap;

/** Every url in the file is distinct: the module keeps one decoded portrait, keyed by url. */
function urlFor(caseName: string): string {
	return `/Portfolio/portrait-${caseName}.jpg`;
}

beforeEach(() => {
	bitmap = fakeBitmap(0, 0);
	bitmapMock = vi.fn(() => Promise.resolve(asBitmap(bitmap)));
	fetchMock = vi.fn(() => Promise.resolve(imageResponse()));
	vi.stubGlobal("createImageBitmap", bitmapMock);
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("loadPortrait", () => {
	it("prints no portrait without createImageBitmap", async () => {
		vi.stubGlobal("createImageBitmap", undefined);

		const testSubject = await loadPortrait(urlFor("unsupported"));

		expect(testSubject).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("prints no portrait for an image the server does not have", async () => {
		fetchMock.mockResolvedValue(imageResponse(false));

		const testSubject = await loadPortrait(urlFor("missing"));

		expect(testSubject).toBeNull();
		expect(bitmapMock).not.toHaveBeenCalled();
	});

	it("prints no portrait when the fetch itself fails", async () => {
		fetchMock.mockRejectedValue(new Error("network down"));

		const testSubject = await loadPortrait(urlFor("offline"));

		expect(testSubject).toBeNull();
	});

	it("decodes, crops and keeps the grid, and decodes it only once", async () => {
		const photo = inkImage(100, 100, { left: 40, top: 20, right: 59, bottom: 79 });
		const stored = inkImage(STORED_WIDTH, 124, { left: 0, top: 0, right: 95, bottom: 123 });
		const contexts = [fakeContext({ image: photo }), fakeContext({ image: stored })];
		const created = installCanvases(contexts);
		bitmap = fakeBitmap(100, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));
		const url = urlFor("square");

		const first = await loadPortrait(url);
		const second = await loadPortrait(url);

		expect(first).toEqual(toGrid(stored));
		expect(second).toBe(first);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(bitmapMock).toHaveBeenCalledTimes(1);
		expect(bitmap.close).toHaveBeenCalledTimes(1);
		expect(created.map(canvas => [canvas.width, canvas.height])).toEqual([
			[100, 100],
			[STORED_WIDTH, 124]
		]);
		expect(contexts[1]?.draws).toEqual([[bitmap, 24, 16, 52, 67, 0, 0, STORED_WIDTH, 124]]);
	});

	it("probes a landscape photo at the probe width and maps the crop back", async () => {
		const photo = inkImage(PROBE_WIDTH, 64, { left: 10, top: 5, right: 59, bottom: 44 });
		const stored = blankImage(STORED_WIDTH, 124);
		const contexts = [fakeContext({ image: photo }), fakeContext({ image: stored })];
		const created = installCanvases(contexts);
		bitmap = fakeBitmap(300, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		const testSubject = await loadPortrait(urlFor("landscape"));

		expect(testSubject?.width).toBe(STORED_WIDTH);
		expect(testSubject?.height).toBe(124);
		expect(created.map(canvas => [canvas.width, canvas.height])).toEqual([
			[PROBE_WIDTH, 64],
			[STORED_WIDTH, 124]
		]);
		expect(contexts[1]?.draws).toEqual([[bitmap, 27, 3, 55, 71, 0, 0, STORED_WIDTH, 124]]);
	});

	it("decodes again for another url, keeping one slot", async () => {
		const contexts = [
			fakeContext({ image: blankImage(100, 100) }),
			fakeContext({ image: blankImage(STORED_WIDTH, 124) }),
			fakeContext({ image: blankImage(100, 100) }),
			fakeContext({ image: blankImage(STORED_WIDTH, 124) }),
			fakeContext({ image: blankImage(100, 100) }),
			fakeContext({ image: blankImage(STORED_WIDTH, 124) })
		];
		installCanvases(contexts);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		await loadPortrait(urlFor("first"));
		await loadPortrait(urlFor("second"));
		await loadPortrait(urlFor("first"));

		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("prints no portrait when the probe canvas gives no context", async () => {
		installCanvases([null]);

		const testSubject = await loadPortrait(urlFor("no-probe-context"));

		expect(testSubject).toBeNull();
		expect(bitmap.close).toHaveBeenCalledTimes(1);
	});

	it("prints no portrait when the stored canvas gives no context", async () => {
		installCanvases([
			fakeContext({ image: inkImage(100, 100, { left: 40, top: 20, right: 59, bottom: 79 }) }),
			null
		]);
		bitmap = fakeBitmap(100, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		const testSubject = await loadPortrait(urlFor("no-target-context"));

		expect(testSubject).toBeNull();
		expect(bitmap.close).toHaveBeenCalledTimes(1);
	});

	it("prints no portrait for a blank photo", async () => {
		const contexts = [fakeContext({ image: blankImage(100, 100) })];
		installCanvases(contexts);
		bitmap = fakeBitmap(100, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		const testSubject = await loadPortrait(urlFor("blank"));

		expect(testSubject).toBeNull();
		expect(contexts[0]?.draws).toHaveLength(1);
	});

	it("reads the pixels through a document canvas when there is no OffscreenCanvas", async () => {
		const photo = inkImage(100, 100, { left: 40, top: 20, right: 59, bottom: 79 });
		const stored = inkImage(STORED_WIDTH, 124, { left: 0, top: 0, right: 95, bottom: 123 });
		const contexts = [fakeContext({ image: photo }), fakeContext({ image: stored })];
		const getContext = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockImplementation(() => contexts.shift() as unknown as CanvasRenderingContext2D);
		vi.stubGlobal("OffscreenCanvas", undefined);
		bitmap = fakeBitmap(100, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		const testSubject = await loadPortrait(urlFor("document-canvas"));

		expect(testSubject).toEqual(toGrid(stored));
		expect(getContext).toHaveBeenCalledTimes(2);
		expect(getContext).toHaveBeenNthCalledWith(1, "2d", { willReadFrequently: true });
	});

	it("prints no portrait when the document canvas gives no context either", async () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
		vi.stubGlobal("OffscreenCanvas", undefined);
		bitmap = fakeBitmap(100, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		const testSubject = await loadPortrait(urlFor("no-any-context"));

		expect(testSubject).toBeNull();
	});

	it("prints no portrait where there is neither canvas nor document", async () => {
		vi.stubGlobal("OffscreenCanvas", undefined);
		vi.stubGlobal("document", undefined);
		bitmap = fakeBitmap(100, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		const testSubject = await loadPortrait(urlFor("no-dom"));

		expect(testSubject).toBeNull();
	});

	it("closes the bitmap even when the pixels cannot be read", async () => {
		const failure = new Error("the canvas is tainted");
		installCanvases([fakeContext({ failure })]);
		bitmap = fakeBitmap(100, 100);
		bitmapMock.mockImplementation(() => Promise.resolve(asBitmap(bitmap)));

		const testSubject = await loadPortrait(urlFor("tainted"));

		expect(testSubject).toBeNull();
		expect(bitmap.close).toHaveBeenCalledTimes(1);
	});
});
