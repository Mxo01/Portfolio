import { describe, expect, it, vi } from "vitest";

import type { CellMetrics, PortraitGrid, ShellTheme, Span } from "@/lib/terminal/types";
import {
	ART_GAP,
	ASCII_RAMP,
	MIN_COLUMNS_WITH_ART,
	renderPanel,
	renderPortrait
} from "@/lib/portrait/render";
import type { PanelRequest } from "@/lib/portrait/render";
import {
	INK,
	MIDTONE,
	PAPER,
	SQUARE_CELL,
	TYPED_CELL,
	UNMEASURED_CELL,
	blankGrid,
	detailRows,
	gridRows,
	solidGrid,
	textLines,
	textOf
} from "@/test/fixtures/portrait";

const DARK: ShellTheme = "dark";
const LIGHT: ShellTheme = "light";
/** The paper span the panel pads a short art column with: no tone, so it prints as background. */
const PAD = " ";
/** The one glyph the densest bucket carries: the last entry of the shipped ramp. */
const DENSEST_GLYPH = ASCII_RAMP[ASCII_RAMP.length - 1] ?? "";

describe("renderPortrait", () => {
	const cases: readonly {
		readonly name: string;
		readonly grid: PortraitGrid;
		readonly columns: number;
		readonly cell: CellMetrics;
		readonly rows: number;
	}[] = [
		{
			name: "a square cell and a square grid",
			grid: blankGrid(10, 10),
			columns: 20,
			cell: SQUARE_CELL,
			rows: 20
		},
		{
			name: "a cell taller than it is wide",
			grid: blankGrid(10, 10),
			columns: 20,
			cell: { width: 4, height: 8 },
			rows: 10
		},
		{
			name: "the measured 0xProto cell",
			grid: blankGrid(10, 10),
			columns: 20,
			cell: TYPED_CELL,
			rows: 8
		},
		{
			name: "a wide, short grid",
			grid: blankGrid(40, 10),
			columns: 20,
			cell: SQUARE_CELL,
			rows: 5
		},
		{
			name: "a grid that rounds down to no height at all",
			grid: blankGrid(1000, 1),
			columns: 2,
			cell: SQUARE_CELL,
			rows: 1
		}
	];

	it.each(cases)("sizes $name", ({ grid, columns, cell, rows }) => {
		const testSubject = renderPortrait({ grid, columns, cell, theme: DARK });

		expect(testSubject).toHaveLength(rows);
	});

	it("gives every row exactly the columns asked for", () => {
		const art = renderPortrait({
			grid: solidGrid(10, 10, INK),
			columns: 7,
			cell: SQUARE_CELL,
			theme: DARK
		});

		expect(textLines(art)).toEqual(Array.from({ length: 7 }, () => DENSEST_GLYPH.repeat(7)));
	});

	const rowCases: readonly {
		readonly name: string;
		readonly colours: readonly (readonly (readonly [number, number, number])[])[];
		readonly columns: number;
		readonly expected: readonly (readonly Span[])[];
	}[] = [
		{
			name: "paper as one blank span",
			colours: [[PAPER, PAPER, PAPER, PAPER]],
			columns: 4,
			expected: [[{ text: PAD.repeat(4) }]]
		},
		{
			name: "the densest bucket in the accent tone",
			colours: [[INK, INK, INK, INK]],
			columns: 4,
			expected: [[{ text: DENSEST_GLYPH.repeat(4), tone: "accent" }]]
		},
		{
			name: "a midtone in the terminal's foreground",
			colours: [[MIDTONE, MIDTONE, MIDTONE, MIDTONE]],
			columns: 4,
			expected: [[{ text: "+".repeat(4), tone: "plain" }]]
		},
		{
			name: "one glyph and its padding",
			colours: [[INK, PAPER, PAPER, PAPER]],
			columns: 4,
			expected: [[{ text: DENSEST_GLYPH, tone: "accent" }, { text: PAD.repeat(3) }]]
		},
		{
			name: "runs merged by tone",
			colours: [[INK, INK, MIDTONE, INK]],
			columns: 4,
			expected: [
				[
					{ text: DENSEST_GLYPH.repeat(2), tone: "accent" },
					{ text: "+", tone: "plain" },
					{ text: DENSEST_GLYPH, tone: "accent" }
				]
			]
		},
		{
			name: "leading paper kept inside the first span",
			colours: [[PAPER, INK]],
			columns: 2,
			expected: [
				[
					{ text: PAD, tone: "plain" },
					{ text: DENSEST_GLYPH, tone: "accent" }
				]
			]
		}
	];

	it.each(rowCases)("prints $name", ({ colours, columns, expected }) => {
		const grid = gridRows(columns, colours.length, colours);

		const testSubject = renderPortrait({
			grid,
			columns,
			cell: SQUARE_CELL,
			theme: DARK
		});

		expect(testSubject).toEqual(expected);
	});

	it("keeps the source rows in order", () => {
		const grid = gridRows(2, 2, [
			[INK, PAPER],
			[PAPER, INK]
		]);

		const testSubject = renderPortrait({ grid, columns: 2, cell: SQUARE_CELL, theme: DARK });

		expect(testSubject).toEqual([
			[{ text: DENSEST_GLYPH, tone: "accent" }, { text: PAD }],
			[
				{ text: PAD, tone: "plain" },
				{ text: DENSEST_GLYPH, tone: "accent" }
			]
		]);
	});

	const unusableCells: readonly { readonly name: string; readonly cell: CellMetrics }[] = [
		{ name: "a cell with no width", cell: UNMEASURED_CELL },
		{ name: "a cell with no height", cell: { width: 8, height: 0 } },
		{ name: "an infinite width", cell: { width: Number.POSITIVE_INFINITY, height: 8 } },
		{ name: "a NaN height", cell: { width: 8, height: Number.NaN } }
	];

	it.each(unusableCells)("prints nothing for $name", ({ cell }) => {
		const testSubject = renderPortrait({
			grid: blankGrid(10, 10),
			columns: 20,
			cell,
			theme: DARK
		});

		expect(testSubject).toEqual([]);
	});

	const emptyGrids: readonly { readonly name: string; readonly grid: PortraitGrid }[] = [
		{ name: "a grid with no width", grid: solidGrid(0, 10, INK) },
		{ name: "a grid with no height", grid: solidGrid(10, 0, INK) }
	];

	it.each(emptyGrids)("prints nothing for $name", ({ grid }) => {
		const testSubject = renderPortrait({ grid, columns: 20, cell: SQUARE_CELL, theme: DARK });

		expect(testSubject).toEqual([]);
	});

	describe("the glyph cache", () => {
		it("answers a repeat request with the same rows", () => {
			const grid = solidGrid(10, 10, INK);
			const request = { grid, columns: 20, cell: SQUARE_CELL, theme: DARK };

			const first = renderPortrait(request);
			const second = renderPortrait(request);

			expect(second).toBe(first);
		});

		it("rebuilds for the other palette", () => {
			const grid = solidGrid(10, 10, INK);
			const request = { grid, columns: 20, cell: SQUARE_CELL, theme: DARK };

			const dark = renderPortrait(request);
			const light = renderPortrait({ ...request, theme: LIGHT });

			expect(light).not.toBe(dark);
			expect(textLines(light)).toEqual(textLines(dark));
		});

		it("rebuilds for another width", () => {
			const grid = solidGrid(10, 10, INK);
			const narrow = renderPortrait({ grid, columns: 20, cell: SQUARE_CELL, theme: DARK });
			const wide = renderPortrait({ grid, columns: 24, cell: SQUARE_CELL, theme: DARK });

			expect(wide).not.toBe(narrow);
			expect(textOf(wide[0] ?? [])).toHaveLength(24);
		});

		it("rebuilds for another grid", () => {
			const first = renderPortrait({
				grid: solidGrid(10, 10, INK),
				columns: 20,
				cell: SQUARE_CELL,
				theme: DARK
			});
			const second = renderPortrait({
				grid: solidGrid(10, 10, INK),
				columns: 20,
				cell: SQUARE_CELL,
				theme: DARK
			});

			expect(second).not.toBe(first);
			expect(second).toEqual(first);
		});

		it("keeps only the last request", () => {
			const grid = solidGrid(10, 10, INK);
			const first = renderPortrait({ grid, columns: 20, cell: SQUARE_CELL, theme: DARK });

			renderPortrait({ grid, columns: 22, cell: SQUARE_CELL, theme: DARK });
			const again = renderPortrait({ grid, columns: 20, cell: SQUARE_CELL, theme: DARK });

			expect(again).not.toBe(first);
			expect(again).toEqual(first);
		});
	});
});

describe("renderPanel", () => {
	/** The facts the panel lays out beside the art, one span per row. */
	const detailsFor = (widths: readonly number[]) => vi.fn((_columns: number) => detailRows(widths));

	function panel(overrides: Partial<PanelRequest> & { readonly columns: number }): PanelRequest {
		return {
			portrait: blankGrid(40, 20),
			cell: SQUARE_CELL,
			theme: DARK,
			detailsFor: detailsFor([10, 10, 10, 10, 10]),
			...overrides
		};
	}

	it("prints the facts alone when no portrait was decoded", () => {
		const facts = detailsFor([10, 10]);
		const request = panel({ portrait: null, columns: 120, detailsFor: facts });

		const testSubject = renderPanel(request);

		expect(testSubject).toBe(facts.mock.results[0]?.value);
		expect(facts).toHaveBeenCalledTimes(1);
	});

	it("prints the facts alone on a grid too narrow for both", () => {
		const facts = detailsFor([10, 10]);
		const request = panel({ columns: MIN_COLUMNS_WITH_ART - 1, detailsFor: facts });

		const testSubject = renderPanel(request);

		expect(testSubject).toBe(facts.mock.results[0]?.value);
	});

	it("prints the facts alone when the cell cannot be measured", () => {
		const facts = detailsFor([10, 10]);
		const request = panel({ columns: 120, cell: UNMEASURED_CELL, detailsFor: facts });

		const testSubject = renderPanel(request);

		expect(testSubject).toBe(facts.mock.results[0]?.value);
	});

	const unusableAspects: readonly { readonly name: string; readonly portrait: PortraitGrid }[] = [
		{ name: "a portrait with no width", portrait: solidGrid(0, 20, INK) },
		{ name: "a portrait with no height", portrait: solidGrid(40, 0, INK) }
	];

	it.each(unusableAspects)("prints the facts alone for $name", ({ portrait }) => {
		const facts = detailsFor([10, 10]);
		const request = panel({ columns: 200, portrait, detailsFor: facts });

		const testSubject = renderPanel(request);

		expect(testSubject).toBe(facts.mock.results[0]?.value);
	});

	it("prints the facts alone when they fill the grid", () => {
		const facts = detailsFor([80]);
		const request = panel({ columns: 100, detailsFor: facts });

		const testSubject = renderPanel(request);

		expect(testSubject).toBe(facts.mock.results[0]?.value);
	});

	it("draws the face at the narrowest width that still reads", () => {
		const facts = detailsFor([10, 10, 10, 10, 10]);
		const request = panel({ columns: 100, detailsFor: facts });

		const testSubject = renderPanel(request);

		// GIVEN a 40 x 20 portrait in square cells, five short facts ask for ten columns,
		// and the floor is what makes the face legible instead.
		expect(facts).toHaveBeenNthCalledWith(2, 100 - 20 - ART_GAP);
		expect(testSubject).toHaveLength(10);
		expect(testSubject[0]).toHaveLength(3);
		expect(textOf(testSubject[0] ?? [])).toBe(
			`${" ".repeat(20)}${" ".repeat(ART_GAP)}${"x".repeat(10)}`
		);
	});

	it("keeps the gap between the art and the facts", () => {
		const testSubject = renderPanel(panel({ columns: 100 }));

		expect(testSubject[0]?.[1]).toEqual({ text: " ".repeat(ART_GAP) });
	});

	it("narrows the face to the room the facts leave", () => {
		const facts = detailsFor([50, 50, 50, 50]);
		const columns = 90;

		const testSubject = renderPanel(
			panel({ columns, portrait: blankGrid(40, 4), detailsFor: facts })
		);

		const row = textOf(testSubject[0] ?? []);

		// GIVEN forty preferred columns and thirty-four available, the available width wins.
		expect(row).toHaveLength(34 + ART_GAP + 50);
	});

	it("never draws the face wider than sixty columns", () => {
		const facts = detailsFor([10, 10, 10, 10, 10, 10, 10, 10]);

		const testSubject = renderPanel(
			panel({ columns: 200, portrait: blankGrid(40, 4), detailsFor: facts })
		);

		expect(textOf(testSubject[0] ?? [])).toBe(
			`${" ".repeat(60)}${" ".repeat(ART_GAP)}${"x".repeat(10)}`
		);
	});

	it("pads the art when the facts column is taller", () => {
		const facts = detailsFor([10, 10, 10, 10, 10, 10, 10, 10]);

		const testSubject = renderPanel(
			panel({ columns: 200, portrait: blankGrid(40, 4), detailsFor: facts })
		);

		expect(testSubject).toHaveLength(8);
		expect(testSubject[6]).toEqual([
			{ text: PAD.repeat(60) },
			{ text: PAD.repeat(ART_GAP) },
			{ text: "x".repeat(10) }
		]);
	});

	it("leaves the facts out below the last row of art", () => {
		const facts = detailsFor([10, 10]);

		const testSubject = renderPanel(panel({ columns: 100, detailsFor: facts }));

		expect(testSubject).toHaveLength(10);
		expect(testSubject[5]).toHaveLength(2);
		expect(textOf(testSubject[9] ?? [])).toBe(" ".repeat(20 + ART_GAP));
	});
});
