import type { PortraitGrid } from "@/lib/terminal/types";

import { cropRect, inkBounds, toGrid } from "./grid";

/**
 * The portrait, at runtime: one fetch, one decode, one crop, kept as an RGB grid.
 *
 * It is decoration, so nothing here is allowed to fail loudly — a missing image, a
 * browser without `createImageBitmap` or a canvas that will not give up its pixels all
 * resolve to `null`, and `whoami` prints the facts without the art. The decoded grid
 * is cached in a module-level promise keyed by URL, so a second invocation or a second
 * mount never pays for the JPEG again; only the glyph grid is rebuilt, and only when
 * the width or the palette moves.
 */

/** The probe copy the figure is found in: enough pixels to locate hair and shoulders. */
const PROBE_WIDTH = 192;
/** The widest the art is ever drawn is 60 columns; storing more only slows the resample. */
const STORED_WIDTH = 96;
/** Head and shoulders: a portrait rectangle, not the square the photo was shot in. */
const PORTRAIT_ASPECT = 0.78;

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** One portrait, so one slot: a different URL replaces the decoded grid. */
let cached: { readonly url: string; readonly grid: Promise<PortraitGrid | null> } | null = null;

/** The portrait for `url`, decoded on the first call and shared from then on. */
export function loadPortrait(url: string): Promise<PortraitGrid | null> {
	if (cached === null || cached.url !== url) {
		cached = { url, grid: decode(url).catch(() => null) };
	}

	return cached.grid;
}

async function decode(url: string): Promise<PortraitGrid | null> {
	if (typeof createImageBitmap !== "function") return null;

	const response = await fetch(url);
	if (!response.ok) return null;

	const bitmap = await createImageBitmap(await response.blob());

	try {
		return cropToGrid(bitmap);
	} finally {
		// The pixels are already in the grid: the bitmap itself is not worth keeping alive.
		bitmap.close();
	}
}

/**
 * Two passes over the bitmap: a small copy to find where the figure is, then the one
 * draw that matters — the crop rectangle straight into the stored grid, so the browser's
 * own resampler does the work at the size the art is kept at.
 */
function cropToGrid(bitmap: ImageBitmap): PortraitGrid | null {
	const scale = Math.min(1, PROBE_WIDTH / Math.max(bitmap.width, bitmap.height));
	const probe = surface(
		Math.max(1, Math.round(bitmap.width * scale)),
		Math.max(1, Math.round(bitmap.height * scale))
	);
	if (probe === null) return null;

	probe.context.drawImage(bitmap, 0, 0, probe.width, probe.height);
	const bounds = inkBounds(probe.context.getImageData(0, 0, probe.width, probe.height));
	if (bounds === null) return null;

	const rect = cropRect(
		{
			left: Math.floor(bounds.left / scale),
			top: Math.floor(bounds.top / scale),
			right: Math.ceil(bounds.right / scale),
			bottom: Math.ceil(bounds.bottom / scale)
		},
		bitmap.width,
		bitmap.height,
		PORTRAIT_ASPECT
	);

	const height = Math.max(1, Math.round((STORED_WIDTH * rect.height) / rect.width));
	const target = surface(STORED_WIDTH, height);
	if (target === null) return null;

	target.context.drawImage(
		bitmap,
		rect.x,
		rect.y,
		rect.width,
		rect.height,
		0,
		0,
		STORED_WIDTH,
		height
	);

	return toGrid(target.context.getImageData(0, 0, STORED_WIDTH, height));
}

/** A drawing surface: off the document when the browser has one, on it when it does not. */
function surface(
	width: number,
	height: number
): { readonly context: Context2D; readonly width: number; readonly height: number } | null {
	if (typeof OffscreenCanvas === "function") {
		const context = new OffscreenCanvas(width, height).getContext("2d");
		return context === null ? null : { context, width, height };
	}

	if (typeof document === "undefined") return null;

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	// The pixels are read once and never drawn on: the hint keeps the canvas on the CPU.
	const context = canvas.getContext("2d", { willReadFrequently: true });
	return context === null ? null : { context, width, height };
}
