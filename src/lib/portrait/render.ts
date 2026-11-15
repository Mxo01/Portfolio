import type { CellMetrics, Line, PortraitGrid, ShellTheme, Span, Tone } from "@/lib/terminal/types";

import { channel, PAPER_MINIMUM, resample } from "./grid";

/**
 * The `whoami` panel: a face drawn in characters, the CV's facts beside it.
 *
 * Inverted luminance is the whole idea. The photo's studio background is the brightest
 * thing in the frame, so it lands on index 0 of the ramp and prints as nothing; the suit,
 * the hair and the glasses are the darkest, so they land on the densest glyph. What is
 * left is a silhouette in the terminal's own foreground colour, with only the densest
 * bucket carrying the palette's gold — no truecolour, no photo, no white rectangle.
 *
 * One cell is one glyph, box-averaged over the source region under it, and how many rows
 * a given width needs comes from the measured cell, never from a constant: the same art
 * has to read on a font, a zoom and a line height this module has never seen.
 */

/**
 * The ramp that ships: nine glyphs over the inverted luminance, lightest first, with the
 * paper floor at index 0. Classic ASCII, because it is the one ramp that is a single cell
 * wide in every monospace font.
 */
export const ASCII_RAMP: readonly string[] = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

/** The one ramp the renderer uses. */
const RAMP: readonly string[] = ASCII_RAMP;
/** The ramp as one string: a bucket indexes a glyph, and no bucket can be missing one. */
const GLYPHS = RAMP.join("");
/** Inverted luminance is gamma-corrected before it picks a bucket: 0.8 opens the midtones. */
const GAMMA = 0.8;
/** The densest bucket wears the palette's gold, so the silhouette carries the accent. */
const GOLD: Tone = "accent";
/** Everything lighter prints in the terminal's own foreground. */
const INK: Tone = "plain";
const DENSEST = RAMP.length - 1;
const PAPER = " ";

/** Below this the art is a mosaic, so the facts print alone. */
export const MIN_COLUMNS_WITH_ART = 72;
/** Columns between the last art column and the first character of the facts. */
export const ART_GAP = 6;
/** Narrower than this and the face stops reading as a face. */
const MIN_ART_COLUMNS = 20;
/** Wider than this and the panel is a picture with a caption, not a summary. */
const MAX_ART_COLUMNS = 60;

const LUMINANCE: readonly [number, number, number] = [0.2126, 0.7152, 0.0722];
const WHITE = 255;

/**
 * The ink floor: the crop's own near-white threshold, read as inverted luminance. Anything
 * at or below it is paper and prints as nothing. Without the floor the studio white sits on
 * bucket 1 and speckles the whole background with `.`: the crop removes paper from the
 * bounds, not from the pixels inside them. Deriving it from `PAPER_MINIMUM` is what keeps
 * "where the background stops" one number instead of two that drift apart.
 */
const PAPER_INK = 1 - PAPER_MINIMUM / WHITE;

/** Everything the art needs that the shell already knows. */
export interface PortraitRequest {
	readonly grid: PortraitGrid;
	/** How many columns the art is drawn in. */
	readonly columns: number;
	/** Cell width over cell height, as the DOM reports it. */
	readonly cell: CellMetrics;
	readonly theme: ShellTheme;
}

/** A portrait with the facts beside it. */
export interface PanelRequest {
	/** The decoded portrait, or `null` when it could not be read: the facts print alone. */
	readonly portrait: PortraitGrid | null;
	/** Columns the terminal has right now. */
	readonly columns: number;
	readonly cell: CellMetrics;
	readonly theme: ShellTheme;
	/** The CV's facts laid out at the width that is left after the art. */
	readonly detailsFor: (columns: number) => readonly (readonly Span[])[];
}

/** The panel with the portrait, or the facts alone when the screen cannot hold both. */
export function renderPanel(request: PanelRequest): readonly Line[] {
	const { portrait, detailsFor, columns } = request;
	const details = detailsFor(columns);
	const artColumns = portrait === null ? null : artColumnsFor(request, details);
	if (artColumns === null || portrait === null) return details;

	const art = renderPortrait({
		grid: portrait,
		columns: artColumns,
		cell: request.cell,
		theme: request.theme
	});
	const beside = detailsFor(columns - artColumns - ART_GAP);
	const height = Math.max(art.length, beside.length);

	return Array.from({ length: height }, (_unused, row): Line => [
		...(art[row] ?? [span(PAPER.repeat(artColumns))]),
		span(PAPER.repeat(ART_GAP)),
		...(beside[row] ?? [])
	]);
}

/**
 * The art on its own, one span row per cell row, each padded to exactly `columns` so the
 * facts beside it share one left edge on every row.
 *
 * Memoised on the grid, the size and the palette: a second `whoami`, or a resize that lands
 * on the same width, costs a lookup instead of a resample. The palette is part of the key
 * because the densest bucket's tone is resolved per theme — the glyphs are the same, the
 * cache is never served a grid built for the other one.
 */
export function renderPortrait(request: PortraitRequest): readonly (readonly Span[])[] {
	const { grid, columns, cell, theme } = request;
	const rows = rowsFor(grid, columns, cell);
	if (rows === 0) return [];

	if (
		cached !== null &&
		cached.grid === grid &&
		cached.columns === columns &&
		cached.rows === rows &&
		cached.theme === theme
	) {
		return cached.lines;
	}

	const pixels = resample(grid, columns, rows);
	const lines = Array.from({ length: rows }, (_unused, row) => glyphRow(pixels, row, columns));
	cached = { grid, columns, rows, theme, lines };

	return lines;
}

/**
 * How tall the art is at this width, in cells: the measured cell's own ratio times the
 * grid's proportions. A 40-column portrait on a 9.92 × 24.96 cell is 20 rows.
 */
function rowsFor(grid: PortraitGrid, columns: number, cell: CellMetrics): number {
	if (!usable(cell) || grid.width === 0 || grid.height === 0) return 0;

	const aspect = cell.width / cell.height;
	return Math.max(1, Math.round(columns * aspect * (grid.height / grid.width)));
}

/**
 * How wide the art gets: as many rows as the facts column is tall, capped by the room the
 * facts leave and by the widest a face is allowed to be. `null` is the one case that prints
 * the facts alone — a screen too narrow to hold both, or a cell that cannot be measured.
 */
function artColumnsFor(
	request: PanelRequest,
	details: readonly (readonly Span[])[]
): number | null {
	const { portrait, columns, cell } = request;
	if (portrait === null || columns < MIN_COLUMNS_WITH_ART || !usable(cell)) return null;

	const rowsPerColumn = (cell.width / cell.height) * (portrait.height / portrait.width);
	if (!Number.isFinite(rowsPerColumn) || rowsPerColumn <= 0) return null;

	const available = columns - ART_GAP - widest(details);
	if (available < MIN_ART_COLUMNS) return null;

	const preferred = Math.round(details.length / rowsPerColumn);
	return Math.max(MIN_ART_COLUMNS, Math.min(preferred, available, MAX_ART_COLUMNS));
}

/** One row of glyphs: the bucket per cell, runs merged by tone, paper trimmed, then padded. */
function glyphRow(pixels: PortraitGrid, row: number, columns: number): readonly Span[] {
	const glyphs: string[] = [];
	const tones: Tone[] = [];

	for (let column = 0; column < columns; column++) {
		const ink = inkAt(pixels, row * columns + column);

		if (ink <= PAPER_INK) {
			glyphs.push(PAPER);
			tones.push(INK);
			continue;
		}

		const bucket = Math.min(DENSEST, Math.floor(Math.pow(ink, GAMMA) * RAMP.length));

		glyphs.push(GLYPHS.charAt(bucket));
		tones.push(bucket === DENSEST ? GOLD : INK);
	}

	// The white around the head is padding, not art: it does not need a span of its own.
	let end = glyphs.length;
	while (end > 0 && glyphs[end - 1] === PAPER) end--;

	const spans: Span[] = [];
	let start = 0;

	for (let index = 1; index <= end; index++) {
		if (index < end && tones[index] === tones[start]) continue;

		spans.push({ text: glyphs.slice(start, index).join(""), tone: tones[start] });
		start = index;
	}

	if (end < columns) spans.push(span(PAPER.repeat(columns - end)));
	return spans;
}

/** Inverted luminance of one pixel of the stored grid: 0 is the studio white, 1 is ink. */
function inkAt(grid: PortraitGrid, index: number): number {
	const at = index * 3;
	const red = channel(grid.pixels, at) / WHITE;
	const green = channel(grid.pixels, at + 1) / WHITE;
	const blue = channel(grid.pixels, at + 2) / WHITE;

	return 1 - (LUMINANCE[0] * red + LUMINANCE[1] * green + LUMINANCE[2] * blue);
}

function widest(details: readonly (readonly Span[])[]): number {
	return details.reduce(
		(width, row) =>
			Math.max(
				width,
				row.reduce((sum, part) => sum + part.text.length, 0)
			),
		0
	);
}

function usable(cell: CellMetrics): boolean {
	return (
		Number.isFinite(cell.width) && Number.isFinite(cell.height) && cell.width > 0 && cell.height > 0
	);
}

function span(text: string, tone?: Tone): Span {
	return { text, tone };
}

let cached: {
	readonly grid: PortraitGrid;
	readonly columns: number;
	readonly rows: number;
	readonly theme: ShellTheme;
	readonly lines: readonly (readonly Span[])[];
} | null = null;
