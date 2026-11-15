import { CvParseError, parseCv } from "./parse";
import type { CvSection } from "./parse";

/**
 * The CV at runtime: one `HEAD` for the document's validator, a cache hit or a
 * fetch, pdf.js, the layout contract, and the cache write. Nothing here throws to
 * the caller — the shell prints the reason and stays usable.
 *
 * A cache hit returns before pdf.js is imported at all, which is what makes a warm
 * visit cost a validator request instead of a megabyte of runtime.
 */

/** One document, so one slot: a different validator replaces the previous entry. */
const STORAGE_KEY = "portfolio-cv";
/** A CV's text is a few tens of kilobytes; a larger entry is not worth the quota risk. */
const CACHE_LIMIT = 200 * 1024;
/** The document as the failure messages name it, matching the tree's own file. */
const CV_NAME = "cv.pdf";

/** Where the document lives: the app passes the published URL, prefix included. */
export interface CvLoadRequest {
	readonly url: string;
}

/** The outcome the shell renders: the sections, or the reason they are missing. */
export type CvLoadResult =
	| { readonly ok: true; readonly sections: readonly CvSection[] }
	| { readonly ok: false; readonly reason: string; readonly line?: string };

/** What the browser keeps between visits: the validator the sections were parsed from. */
interface CacheEntry {
	readonly key: string;
	readonly sections: readonly CvSection[];
}

/**
 * One document is downloaded and parsed once per page, however many callers ask for
 * it: a strict-mode second mount, or a re-render that restarts the effect, joins the
 * promise the first caller started instead of paying for a second download and parse.
 * Dropped only when the load fails, so a retry can still start over.
 */
const loads = new Map<string, Promise<CvLoadResult>>();

export function loadCv({ url }: CvLoadRequest): Promise<CvLoadResult> {
	const running = loads.get(url);
	if (running !== undefined) return running;

	const pending = runLoad(url).then(result => {
		// A document that never arrived must not be remembered as an answer.
		if (!result.ok) loads.delete(url);
		return result;
	});

	loads.set(url, pending);
	return pending;
}

async function runLoad(url: string): Promise<CvLoadResult> {
	try {
		const key = await validatorOf(url);
		const cached = key === null ? null : readCache(key);
		if (cached !== null) return { ok: true, sections: cached };

		// Reached only on a miss, and always dynamic: a warm visit never pays for pdf.js.
		const { extractCvText } = await import("./extract");
		const data = await fetchDocument(url);
		const { items, annotations } = await extractCvText(data);
		const sections = parseCv({ items, annotations });

		if (key !== null) writeCache(key, sections);
		return { ok: true, sections };
	} catch (error) {
		return { ok: false, ...failureOf(error) };
	}
}

/**
 * The `ETag`, or the `Last-Modified` when the server sends no tag, or `null` when the
 * document cannot be validated — in which case the content is still parsed, just not
 * cached, so a failed HEAD never costs the visitor the CV.
 */
async function validatorOf(url: string): Promise<string | null> {
	try {
		const response = await fetch(url, { method: "HEAD", cache: "no-store" });
		if (!response.ok) return null;

		return response.headers.get("etag") ?? response.headers.get("last-modified");
	} catch {
		return null;
	}
}

async function fetchDocument(url: string): Promise<Uint8Array> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`cannot fetch ${CV_NAME}: HTTP ${response.status}`);

	const data = new Uint8Array(await response.arrayBuffer());
	if (data.length === 0) throw new Error(`${CV_NAME} is empty`);

	return data;
}

/** The stored sections, when they were parsed from this exact version of the document. */
function readCache(key: string): readonly CvSection[] | null {
	const entry = readEntry();
	if (entry === null || entry.key !== key) return null;

	return entry.sections;
}

function readEntry(): CacheEntry | null {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw === null) return null;

		const parsed: unknown = JSON.parse(raw);
		const entry = asEntry(parsed);
		if (entry === null) discard();
		return entry;
	} catch {
		// Unreadable storage or a corrupt entry: re-parse rather than trust it.
		discard();
		return null;
	}
}

function writeCache(key: string, sections: readonly CvSection[]): void {
	const payload = JSON.stringify({ key, sections } satisfies CacheEntry);
	if (payload.length > CACHE_LIMIT) return;

	try {
		window.localStorage.setItem(STORAGE_KEY, payload);
	} catch {
		// A full or blocked quota costs a cache miss next time, never the content.
	}
}

function discard(): void {
	try {
		window.localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Nothing to clean up if storage is not reachable.
	}
}

/** A stored entry is trusted only when every section still has a title and a body. */
function asEntry(value: unknown): CacheEntry | null {
	if (typeof value !== "object" || value === null) return null;

	const { key, sections } = value as Partial<Record<keyof CacheEntry, unknown>>;
	if (typeof key !== "string" || !Array.isArray(sections)) return null;

	const valid: CvSection[] = [];
	for (const item of sections) {
		const section = asSection(item);
		if (section === null) return null;
		valid.push(section);
	}

	return { key, sections: valid };
}

function asSection(value: unknown): CvSection | null {
	if (typeof value !== "object" || value === null) return null;

	const { title, body } = value as Partial<Record<keyof CvSection, unknown>>;
	if (typeof title !== "string" || !Array.isArray(body) || !body.every(isString)) return null;

	return { title, body };
}

function isString(value: unknown): boolean {
	return typeof value === "string";
}

function failureOf(error: unknown): { readonly reason: string; readonly line?: string } {
	if (error instanceof CvParseError) return { reason: error.message, line: error.line };

	return { reason: error instanceof Error ? error.message : String(error) };
}
