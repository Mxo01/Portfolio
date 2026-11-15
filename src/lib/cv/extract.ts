import type { LinkAnnotation, TextItem } from "./parse";

/**
 * The CV PDF as flat text items plus link annotations.
 *
 * This is the only module that imports pdf.js, and it does so dynamically: the
 * renderer and its worker stay out of the entry chunk and are downloaded only when
 * the cache is cold. Everything downstream of `CvText` is pure.
 */

/** What the document says before the layout contract reads it. */
export interface CvText {
	readonly items: readonly TextItem[];
	readonly annotations: readonly LinkAnnotation[];
}

/** Room for error in the user-space geometry pdf.js reports (points, origin bottom-left). */
const RECT_LENGTH = 4;
/** The transform matrix stores the origin at these offsets. */
const X_OFFSET = 4;
const Y_OFFSET = 5;

/**
 * Reads every text item and every `url` link annotation of the document.
 *
 * Both imports are dynamic so the bundler splits pdf.js into its own chunk, and the
 * worker is taken as an asset URL rather than a second copy of the runtime.
 */
export async function extractCvText(data: Uint8Array): Promise<CvText> {
	const [pdfjs, worker] = await Promise.all([
		import("pdfjs-dist/legacy/build/pdf.mjs"),
		import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")
	]);

	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

	const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
	const document = await loadingTask.promise;

	try {
		const items: TextItem[] = [];
		const annotations: LinkAnnotation[] = [];

		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
			const page = await document.getPage(pageNumber);
			const content = await page.getTextContent();

			for (const item of content.items) {
				// Marked content carries a type, not text; only text runs are lines.
				if (!("str" in item)) continue;
				items.push({
					text: item.str,
					x: coordinate(item.transform, X_OFFSET),
					y: coordinate(item.transform, Y_OFFSET),
					width: item.width,
					height: item.height
				});
			}

			const pageAnnotations: readonly unknown[] = await page.getAnnotations();
			for (const annotation of pageAnnotations) {
				const link = linkOf(annotation);
				if (link !== null) annotations.push(link);
			}
		}

		return { items, annotations };
	} finally {
		await loadingTask.destroy();
	}
}

/** A matrix off by a field must not shift a whole page: a missing coordinate reads as zero. */
function coordinate(matrix: readonly number[], index: number): number {
	const value = matrix[index];
	return typeof value === "number" ? value : 0;
}

/** An annotation is a link only when it names a target and a box to hang it on. */
function linkOf(annotation: unknown): LinkAnnotation | null {
	if (typeof annotation !== "object" || annotation === null) return null;

	const { subtype, url, rect } = annotation as Partial<Record<string, unknown>>;
	if (subtype !== "Link" || typeof url !== "string" || url.length === 0) return null;

	const box = coordinates(rect);
	if (box.length < RECT_LENGTH) return null;

	return { url, rect: box.slice(0, RECT_LENGTH) };
}

/** pdf.js reports the box as an array of numbers; anything else is not a box. */
function coordinates(value: unknown): readonly number[] {
	if (typeof value !== "object" || value === null || !("length" in value)) return [];

	return Array.from(value as ArrayLike<unknown>).filter(
		(entry): entry is number => typeof entry === "number"
	);
}
