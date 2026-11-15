import { describe, expect, it } from "vitest";

import {
	PAPER_MINIMUM,
	colourAt,
	cropRect,
	inkBounds,
	isPaper,
	resample,
	toGrid
} from "@/lib/portrait/grid";
import type { Colour, PixelBounds } from "@/lib/portrait/grid";
import {
	INK,
	MIDTONE,
	OFF_WHITE,
	PAPER,
	WARM_PAPER,
	blankImage,
	gridOf,
	imageOf,
	inkImage,
	solidGrid
} from "@/test/fixtures/portrait";

describe("isPaper", () => {
	const cases: readonly {
		readonly name: string;
		readonly colour: Colour;
		readonly paper: boolean;
	}[] = [
		{ name: "the studio white", colour: PAPER, paper: true },
		{
			name: "exactly at the paper floor",
			colour: [PAPER_MINIMUM, PAPER_MINIMUM, PAPER_MINIMUM],
			paper: true
		},
		{
			name: "one step under the paper floor",
			colour: [PAPER_MINIMUM - 1, PAPER_MINIMUM - 1, PAPER_MINIMUM - 1],
			paper: false
		},
		{ name: "off-white", colour: OFF_WHITE, paper: true },
		{ name: "white with a red cast", colour: WARM_PAPER, paper: false },
		{ name: "the widest colourless spread", colour: [255, 243, 255], paper: true },
		{ name: "one step past the widest spread", colour: [255, 242, 255], paper: false },
		{ name: "a midtone", colour: MIDTONE, paper: false },
		{ name: "the suit", colour: INK, paper: false }
	];

	it.each(cases)("$name is paper: $paper", ({ colour, paper }) => {
		const testSubject = isPaper(colour);

		expect(testSubject).toBe(paper);
	});
});

describe("colourAt", () => {
	const grid = gridOf(2, 1, [INK, [10, 20, 30]]);

	const cases: readonly {
		readonly name: string;
		readonly index: number;
		readonly colour: Colour;
	}[] = [
		{ name: "the first pixel", index: 0, colour: [0, 0, 0] },
		{ name: "the second pixel", index: 1, colour: [10, 20, 30] },
		{ name: "a pixel past the grid", index: 2, colour: [0, 0, 0] }
	];

	it.each(cases)("reads $name", ({ index, colour }) => {
		const testSubject = colourAt(grid, index);

		expect(testSubject).toEqual(colour);
	});
});

describe("toGrid", () => {
	it("drops alpha and keeps every channel it read", () => {
		const image = imageOf(2, 1, [INK, [10, 20, 30]]);

		const testSubject = toGrid(image);

		expect(testSubject.width).toBe(2);
		expect(testSubject.height).toBe(1);
		expect(Array.from(testSubject.pixels)).toEqual([0, 0, 0, 10, 20, 30]);
	});

	it("reads a truncated buffer as zeroes rather than as NaN", () => {
		const image = { width: 2, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255, 40]) };

		const testSubject = toGrid(image);

		expect(Array.from(testSubject.pixels)).toEqual([10, 20, 30, 40, 0, 0]);
	});

	it("reads a buffer with no pixel at all as zeroes rather than as NaN", () => {
		const image = { width: 2, height: 1, data: new Uint8ClampedArray([10, 20, 30, 255]) };

		const testSubject = toGrid(image);

		expect(Array.from(testSubject.pixels)).toEqual([10, 20, 30, 0, 0, 0]);
	});
});

describe("inkBounds", () => {
	const cases: readonly {
		readonly name: string;
		readonly image: ReturnType<typeof blankImage>;
		readonly bounds: PixelBounds | null;
	}[] = [
		{
			name: "a blank sheet has no ink",
			image: blankImage(4, 3),
			bounds: null
		},
		{
			name: "one pixel of ink",
			image: inkImage(4, 3, { left: 1, top: 1, right: 1, bottom: 1 }),
			bounds: { left: 1, top: 1, right: 1, bottom: 1 }
		},
		{
			name: "the whole frame",
			image: inkImage(4, 3, { left: 0, top: 0, right: 3, bottom: 2 }),
			bounds: { left: 0, top: 0, right: 3, bottom: 2 }
		},
		{
			name: "a figure with air around it",
			image: inkImage(6, 4, { left: 2, top: 1, right: 4, bottom: 2 }),
			bounds: { left: 2, top: 1, right: 4, bottom: 2 }
		}
	];

	it.each(cases)("finds $name", ({ image, bounds }) => {
		const testSubject = inkBounds(image);

		expect(testSubject).toEqual(bounds);
	});

	it("counts a colour cast that is not paper as ink", () => {
		const image = imageOf(2, 1, [PAPER, WARM_PAPER]);

		const testSubject = inkBounds(image);

		expect(testSubject).toEqual({ left: 1, top: 0, right: 1, bottom: 0 });
	});

	it("reads a truncated buffer as ink at zero, not as NaN", () => {
		const image = { width: 2, height: 1, data: new Uint8ClampedArray([255, 255, 255, 255, 0]) };

		const testSubject = inkBounds(image);

		expect(testSubject).toEqual({ left: 1, top: 0, right: 1, bottom: 0 });
	});
});

describe("cropRect", () => {
	const cases: readonly {
		readonly name: string;
		readonly bounds: PixelBounds;
		readonly width: number;
		readonly height: number;
		readonly expected: {
			readonly x: number;
			readonly y: number;
			readonly width: number;
			readonly height: number;
		};
	}[] = [
		{
			name: "a centred figure",
			bounds: { left: 40, top: 20, right: 59, bottom: 79 },
			width: 100,
			height: 100,
			expected: { x: 24, y: 16, width: 52, height: 67 }
		},
		{
			name: "a figure against the left edge",
			bounds: { left: 0, top: 20, right: 9, bottom: 79 },
			width: 100,
			height: 100,
			expected: { x: 0, y: 16, width: 52, height: 67 }
		},
		{
			name: "a figure against the bottom edge",
			bounds: { left: 40, top: 60, right: 59, bottom: 99 },
			width: 100,
			height: 100,
			expected: { x: 33, y: 55, width: 35, height: 45 }
		},
		{
			name: "a figure taller than the frame",
			bounds: { left: 0, top: 0, right: 0, bottom: 199 },
			width: 200,
			height: 200,
			expected: { x: 0, y: 0, width: 156, height: 200 }
		},
		{
			name: "a single pixel of ink",
			bounds: { left: 5, top: 5, right: 5, bottom: 5 },
			width: 100,
			height: 100,
			expected: { x: 5, y: 5, width: 1, height: 1 }
		},
		{
			name: "a figure in a frame narrower than the crop",
			bounds: { left: 0, top: 20, right: 9, bottom: 79 },
			width: 10,
			height: 100,
			expected: { x: 0, y: 16, width: 10, height: 67 }
		}
	];

	it.each(cases)("cuts $name", ({ bounds, width, height, expected }) => {
		const testSubject = cropRect(bounds, width, height, 0.78);

		expect(testSubject).toEqual(expected);
	});
});

describe("resample", () => {
	it("leaves a grid already at the target size untouched", () => {
		const source = gridOf(2, 1, [INK, MIDTONE]);

		const testSubject = resample(source, 2, 1);

		expect(Array.from(testSubject.pixels)).toEqual([0, 0, 0, 128, 128, 128]);
	});

	it("averages a block into one cell", () => {
		const source = gridOf(2, 2, [INK, PAPER, PAPER, PAPER]);

		const testSubject = resample(source, 1, 1);

		expect(Array.from(testSubject.pixels)).toEqual([191, 191, 191]);
	});

	it("keeps the fractional weights of a non-integer ratio", () => {
		const source = gridOf(3, 1, [INK, PAPER, INK]);

		const testSubject = resample(source, 2, 1);

		expect(Array.from(testSubject.pixels)).toEqual([85, 85, 85, 85, 85, 85]);
	});

	it("repeats a single pixel over a wider target", () => {
		const source = gridOf(1, 1, [MIDTONE]);

		const testSubject = resample(source, 2, 2);

		expect(Array.from(testSubject.pixels)).toEqual([
			128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128, 128
		]);
	});

	it("prints an empty grid as zeroes rather than as NaN", () => {
		const source = solidGrid(0, 0, INK);

		const testSubject = resample(source, 1, 1);

		expect(testSubject.width).toBe(1);
		expect(testSubject.height).toBe(1);
		expect(Array.from(testSubject.pixels)).toEqual([0, 0, 0]);
	});
});
