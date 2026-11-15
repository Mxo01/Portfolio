import { EXPORT_CV_SCRIPT } from "@/lib/terminal/script-data";
import type { ExecutableFile } from "@/lib/terminal/script-data";
import type {
	CellMetrics,
	CompletionMenu,
	ContentDir,
	ContentFile,
	ContentSection,
	PortraitGrid,
	ShellContext,
	ShellSession,
	ShellTheme,
	Span,
	TreeNode
} from "@/lib/terminal/types";

/**
 * Fixtures for the terminal core: a small copy of the virtual filesystem, a session, a
 * context and the two moments `experienceTotals` is asked about. Everything here is a
 * builder, so a test states only the one field its case is about.
 */

/** The screen the shell is painting in the fixtures: wide enough that nothing wraps. */
export const FIXTURE_COLUMNS = 100;

/** One cell of that screen, in CSS pixels. The shell never assumes either number. */
export const FIXTURE_CELL: CellMetrics = { width: 8, height: 16 };

/** Why the tree is missing, when a case wants the not-yet-loaded arm. */
export const MISSING_REASON = "still loading";

/** A fixed moment: 15 June 2024. The clock is never read in a test. */
export const JUNE_2024 = new Date(2024, 5, 15);

const ROOT_PATH = "/";
const SEPARATOR = "/";
const EMPTY = 0;
const DAY_OF_MONTH = 15;

/** A moment in a month, so only the month of `now` ever matters. */
export function moment(year: number, month: number): Date {
	return new Date(year, month - 1, DAY_OF_MONTH);
}

function leaf(path: string): string {
	const parts = path.split(SEPARATOR).filter(part => part.length > EMPTY);
	return parts[parts.length - 1] ?? path;
}

/** A file of the fixture tree; `name` is the path's last segment, as the projection sets it. */
export function fixtureFile(
	path: string,
	sections: readonly ContentSection[] = [],
	options: { readonly readable?: boolean } = {}
): ContentFile {
	return { kind: "file", name: leaf(path), path, sections, ...options };
}

/** A directory of the fixture tree. */
export function fixtureDir(path: string, children: readonly TreeNode[]): ContentDir {
	return { kind: "dir", name: leaf(path), path, children };
}

/** The one executable the shell has: `export_cv.sh`, playing the shipped script. */
export function fixtureExecutable(path = `${ROOT_PATH}export_cv.sh`): ExecutableFile {
	return {
		kind: "file",
		name: leaf(path),
		path,
		sections: [],
		executable: true,
		readable: false,
		script: EXPORT_CV_SCRIPT
	};
}

function section(title: string, body: readonly string[] = []): ContentSection {
	return { title, body };
}

/**
 * The tree as the CV projection builds it: three category directories holding their entries
 * as files, the contact block, the document itself and the easter-egg executable at the
 * root. An entry is one file under its group — never a directory with a field file in it —
 * because that is what `buildContent` produces.
 */
export function fixtureTree(): ContentDir {
	return fixtureDir(ROOT_PATH, [
		fixtureDir("/about", [
			fixtureFile("/about/profile", [section("Name", ["Mario"])]),
			fixtureFile("/about/summary", [section("Summary", ["Builds things"])])
		]),
		fixtureDir("/career", [
			fixtureFile("/career/aurum", [
				section("Name", ["Aurum"]),
				section("Role", ["Full-stack engineer"])
			]),
			fixtureFile("/career/fitcheck", [
				section("Name", ["Fitcheck"]),
				section("Role", ["Frontend engineer"])
			])
		]),
		fixtureDir("/education", [
			fixtureFile("/education/degree", [
				section("Name", ["University"]),
				section("Grade", ["110/110"])
			])
		]),
		fixtureDir("/projects", [
			fixtureFile("/projects/portfolio", [section("Summary", ["This site"])])
		]),
		fixtureFile("/contact", [section("Email", ["mario@example.com"])]),
		fixtureFile("/cv.pdf", [section("Name", ["Mario"])]),
		fixtureExecutable()
	]);
}

/**
 * A tree with depth, which the projection never builds: a directory holding a directory and
 * a file, two levels below the root. Cases about descending, `..` from a nested working
 * directory or a directory that lists only its files state their depth here instead of
 * borrowing a shape the real tree does not have.
 */
export function fixtureDeepTree(): ContentDir {
	return fixtureDir(ROOT_PATH, [
		fixtureDir("/notes", [
			fixtureDir("/notes/2024", [
				fixtureFile("/notes/2024/june", [section("Summary", ["a note"])])
			]),
			fixtureFile("/notes/today", [section("Summary", ["a note"])])
		]),
		fixtureFile("/contact", [section("Email", ["mario@example.com"])])
	]);
}

/**
 * A tree with the three shapes a completion prefix can land on: a pair that shares a
 * directory name, a pair that shares a file name, and a nested level to descend into.
 */
export function fixtureAmbiguousTree(): ContentDir {
	return fixtureDir(ROOT_PATH, [
		fixtureDir("/notes", [fixtureFile("/notes/today", [section("Summary", ["a note"])])]),
		fixtureFile("/notes.txt", [section("Summary", ["a note"])]),
		fixtureFile("/readme", [section("Summary", ["the readme"])]),
		fixtureFile("/readme.md", [section("Summary", ["the readme"])]),
		fixtureFile("/zzz", [section("Summary", ["alone"])])
	]);
}

/** A session on a given directory, with the history and draft a case needs. */
export function fixtureSession(overrides: Partial<ShellSession> = {}): ShellSession {
	return { cwd: ROOT_PATH, history: [], historyIndex: null, draft: "", ...overrides };
}

/** A completion menu as Tab leaves it open: every candidate, showing the first. */
export function fixtureMenu(
	candidates: readonly string[],
	head: string,
	index = 0
): CompletionMenu {
	return { candidates, head, index };
}

export interface ContextOverrides {
	readonly root?: ContentDir | null;
	readonly reason?: string;
	readonly theme?: ShellTheme;
	readonly columns?: number;
	readonly cell?: CellMetrics;
	readonly portrait?: PortraitGrid | null;
}

/** A shell context, loaded and unloaded: `root: null` is the not-yet-arrived arm. */
export function fixtureContext(overrides: ContextOverrides = {}): ShellContext {
	const root = overrides.root === undefined ? fixtureTree() : overrides.root;
	const base = {
		theme: overrides.theme ?? ("dark" as const),
		columns: overrides.columns ?? FIXTURE_COLUMNS,
		cell: overrides.cell ?? FIXTURE_CELL,
		portrait: overrides.portrait ?? null
	};

	return root === null
		? { root: null, reason: overrides.reason ?? MISSING_REASON, ...base }
		: { root, ...base };
}

/** A span written as a tuple, so a case reads as `[text, tone]`. */
export function fixtureSpan(text: string, tone?: Span["tone"]): Span {
	return tone === undefined ? { text } : { text, tone };
}
