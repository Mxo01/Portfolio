import type { Colour, PixelBounds, RgbaImage } from "@/lib/portrait/grid";
import type { CellMetrics, PortraitGrid, Span } from "@/lib/terminal/types";

/**
 * Portraits as data. Every fixture is built from a colour table rather than a JPEG, so a
 * test reads as the picture it describes and nothing here touches a canvas or a file.
 */

/** A cell as the DOM measures 0xProto at 16px with no extra leading: 0.62em by 1.56em. */
export const TYPED_CELL: CellMetrics = { width: 9.92, height: 24.96 };

/** Square cells: the one ratio where a portrait resamples one source pixel per cell. */
export const SQUARE_CELL: CellMetrics = { width: 8, height: 8 };

/** A cell no grid can be measured in: the cold visit, before the first fit. */
export const UNMEASURED_CELL: CellMetrics = { width: 0, height: 0 };

/** The studio background: bright and colourless. */
export const PAPER: Colour = [255, 255, 255];

/** The suit and the hair: no light at all, so the densest glyph. */
export const INK: Colour = [0, 0, 0];

/** A midtone, the skin of a face at half luminance. */
export const MIDTONE: Colour = [128, 128, 128];

/** Off-white but still colourless: paper by the crop, paper by the ink floor too. */
export const OFF_WHITE: Colour = [236, 236, 236];

/** Near-paper with a red cast: the chroma test is what keeps it out of the paper mask. */
export const WARM_PAPER: Colour = [255, 240, 240];

/** A pixel count no test should ever have to explain. */
function assertCount(actual: number, expected: number): void {
	if (actual !== expected) {
		throw new Error(`fixture: expected ${expected} colours, received ${actual}`);
	}
}

/** An RGBA buffer built from one colour per pixel, alpha opaque. */
export function imageOf(width: number, height: number, colours: readonly Colour[]): RgbaImage {
	assertCount(colours.length, width * height);

	const data = new Uint8ClampedArray(width * height * 4);

	colours.forEach(([r, g, b], index) => {
		data[index * 4] = r;
		data[index * 4 + 1] = g;
		data[index * 4 + 2] = b;
		data[index * 4 + 3] = 255;
	});

	return { width, height, data };
}

/** An RGBA buffer of one flat colour. */
export function solidImage(width: number, height: number, colour: Colour): RgbaImage {
	return imageOf(
		width,
		height,
		Array.from({ length: width * height }, () => colour)
	);
}

/** The paper sheet a portrait is found in: no ink anywhere. */
export function blankImage(width: number, height: number): RgbaImage {
	return solidImage(width, height, PAPER);
}

/** Paper with one solid box of ink, so `inkBounds` returns exactly that box. */
export function inkImage(width: number, height: number, bounds: PixelBounds): RgbaImage {
	const colours = Array.from({ length: width * height }, (_unused, index): Colour => {
		const x = index % width;
		const y = Math.floor(index / width);
		const inside = x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;

		return inside ? INK : PAPER;
	});

	return imageOf(width, height, colours);
}

/** The RGB grid the renderer reads, built from one colour per pixel. */
export function gridOf(width: number, height: number, colours: readonly Colour[]): PortraitGrid {
	assertCount(colours.length, width * height);

	const pixels = new Uint8ClampedArray(width * height * 3);

	colours.forEach(([r, g, b], index) => {
		pixels[index * 3] = r;
		pixels[index * 3 + 1] = g;
		pixels[index * 3 + 2] = b;
	});

	return { width, height, pixels };
}

/** A grid of one flat colour. */
export function solidGrid(width: number, height: number, colour: Colour): PortraitGrid {
	return gridOf(
		width,
		height,
		Array.from({ length: width * height }, () => colour)
	);
}

/** A grid with no ink: every cell prints as paper. */
export function blankGrid(width: number, height: number): PortraitGrid {
	return solidGrid(width, height, PAPER);
}

/** A grid whose first row is the colours given and whose other rows repeat the last one. */
export function gridRows(
	width: number,
	height: number,
	rows: readonly (readonly Colour[])[]
): PortraitGrid {
	const colours: Colour[] = [];

	for (let row = 0; row < height; row++) {
		const source = rows[Math.min(row, rows.length - 1)] ?? [];
		assertCount(source.length, width);
		colours.push(...source);
	}

	return gridOf(width, height, colours);
}

/** One span per detail row, `width` characters wide: the facts column the panel lays out. */
export function detailRows(widths: readonly number[]): readonly (readonly Span[])[] {
	return widths.map(width => [{ text: "x".repeat(width) }]);
}

/** Every character a line holds, spans flattened and string lines passed through. */
export function textOf(line: readonly Span[] | string): string {
	return typeof line === "string" ? line : line.map(part => part.text).join("");
}

/** The characters of every row, one string per line. */
export function textLines(lines: readonly (readonly Span[] | string)[]): readonly string[] {
	return lines.map(textOf);
}
