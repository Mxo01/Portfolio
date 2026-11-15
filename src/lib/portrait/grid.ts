import type { PortraitGrid } from "@/lib/terminal/types";

/**
 * The geometry of a portrait, with no browser in it: bounds, crop, resample and the
 * paper mask. Everything here is pure, so the one piece that needs a canvas — the
 * decode in `load.ts` — is a thin wrapper around functions that can be reasoned about
 * on their own.
 */

/** A rectangle in pixels, origin top-left, right and bottom exclusive. */
export interface PixelRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/** A rectangle in pixels, origin top-left, both edges inclusive. */
export interface PixelBounds {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

/** The shape a canvas hands back, narrowed to what this module reads. */
export interface RgbaImage {
	readonly width: number;
	readonly height: number;
	readonly data: Uint8ClampedArray;
}

/**
 * What counts as paper: the studio background is white, and so is the shirt, so the
 * test is only ever "near-white and colourless" — which pixels are connected to the
 * border is the mask's job, not this function's.
 *
 * Exported because the crop is not the only place paper has to be recognised: the
 * renderer derives its ink floor from the same number, so the two can never disagree
 * about where the background ends and the figure begins.
 */
export const PAPER_MINIMUM = 232;
const PAPER_CHROMA = 12;
/** How much taller than the ink the crop is: a little air above the head, the rest below. */
const HEAD_ROOM = 1.12;
/** The share of that air that goes above the ink, so the head is not glued to the top edge. */
const HEAD_ROOM_TOP = 0.55;

/** One pixel as `[r, g, b]`. */
export type Colour = readonly [number, number, number];

export function isPaper([r, g, b]: Colour): boolean {
	const minimum = Math.min(r, g, b);
	const maximum = Math.max(r, g, b);
	return minimum >= PAPER_MINIMUM && maximum - minimum <= PAPER_CHROMA;
}

/** One channel of a flat, tightly packed buffer, zero past its end: a short buffer reads as black. */
export function channel(buffer: Uint8ClampedArray, index: number): number {
	return buffer[index] ?? 0;
}

/** The pixel at `index` of the flat RGB grid. */
export function colourAt(grid: PortraitGrid, index: number): Colour {
	const at = index * 3;
	return [channel(grid.pixels, at), channel(grid.pixels, at + 1), channel(grid.pixels, at + 2)];
}

/** The canvas' RGBA buffer as the RGB grid the renderer works with. */
export function toGrid(image: RgbaImage): PortraitGrid {
	const pixels = new Uint8ClampedArray(image.width * image.height * 3);

	for (let index = 0; index < image.width * image.height; index++) {
		const from = index * 4;
		const to = index * 3;
		pixels[to] = channel(image.data, from);
		pixels[to + 1] = channel(image.data, from + 1);
		pixels[to + 2] = channel(image.data, from + 2);
	}

	return { width: image.width, height: image.height, pixels };
}

/**
 * Where the subject actually is. The photo is a square with white all round the figure,
 * so the crop cannot be the frame: it is this box, taken from every pixel that is not
 * paper. `null` when the image is blank.
 */
export function inkBounds(image: RgbaImage): PixelBounds | null {
	let left = image.width;
	let top = image.height;
	let right = -1;
	let bottom = -1;

	for (let y = 0; y < image.height; y++) {
		for (let x = 0; x < image.width; x++) {
			const at = (y * image.width + x) * 4;
			const colour: Colour = [
				channel(image.data, at),
				channel(image.data, at + 1),
				channel(image.data, at + 2)
			];
			if (isPaper(colour)) continue;

			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
		}
	}

	return right < left || bottom < top ? null : { left, top, right, bottom };
}

/**
 * Head and shoulders: the ink box grown a little taller and cut to the portrait ratio,
 * centred on the figure horizontally and biased upward vertically. Clamped inside the
 * image, so a tall crop loses air at the top rather than the shoulders at the bottom.
 */
export function cropRect(
	bounds: PixelBounds,
	imageWidth: number,
	imageHeight: number,
	aspect: number
): PixelRect {
	const inkHeight = bounds.bottom - bounds.top + 1;
	const height = Math.min(imageHeight, Math.max(1, Math.round(inkHeight * HEAD_ROOM)));
	const width = Math.min(imageWidth, Math.max(1, Math.round(height * aspect)));
	const centre = (bounds.left + bounds.right + 1) / 2;
	const air = Math.max(0, height - inkHeight);

	return {
		x: clamp(Math.round(centre - width / 2), 0, imageWidth - width),
		y: clamp(Math.round(bounds.top - air * HEAD_ROOM_TOP), 0, imageHeight - height),
		width,
		height
	};
}

/**
 * The stored grid resized to exactly `width × height` cells of source pixels. Area
 * averaging in both directions: shrinking a portrait to 28 columns must not skip the
 * glasses, and the fractional weights keep a non-integer ratio honest.
 */
export function resample(source: PortraitGrid, width: number, height: number): PortraitGrid {
	const pixels = new Uint8ClampedArray(width * height * 3);
	const scaleX = source.width / width;
	const scaleY = source.height / height;

	for (let y = 0; y < height; y++) {
		const top = y * scaleY;
		const bottom = top + scaleY;

		for (let x = 0; x < width; x++) {
			const left = x * scaleX;
			const right = left + scaleX;
			let r = 0;
			let g = 0;
			let b = 0;
			let weight = 0;

			for (let sy = Math.floor(top); sy < Math.ceil(bottom); sy++) {
				const vertical = overlap(sy, top, bottom);

				for (let sx = Math.floor(left); sx < Math.ceil(right); sx++) {
					const horizontal = overlap(sx, left, right);
					const area = horizontal * vertical;
					const colour = colourAt(source, sy * source.width + sx);
					r += colour[0] * area;
					g += colour[1] * area;
					b += colour[2] * area;
					weight += area;
				}
			}

			if (weight === 0) continue;
			const at = (y * width + x) * 3;
			pixels[at] = Math.round(r / weight);
			pixels[at + 1] = Math.round(g / weight);
			pixels[at + 2] = Math.round(b / weight);
		}
	}

	return { width, height, pixels };
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

/**
 * How much of one source cell the range `[start, end)` covers, as a fraction of the cell.
 * Zero when it covers nothing: the loop that walks a range can reach a cell the average
 * never intersects, and an empty share must weigh nothing rather than count negative.
 */
function overlap(index: number, start: number, end: number): number {
	return Math.max(0, Math.min(index + 1, end) - Math.max(index, start));
}
