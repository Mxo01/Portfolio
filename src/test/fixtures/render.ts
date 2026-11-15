import type {
	ContentDir,
	ContentFile,
	ContentSection,
	Line,
	ShellContext,
	ShellSession,
	Span,
	TreeNode
} from "@/lib/terminal/types";

/**
 * The renderers' fixtures: a plausible CV in the shape `parseCv` produces, the banner as its
 * own transcription, and the small builders the renderer tests need to reach a branch the
 * projection never produces on purpose.
 *
 * The CV is the document the tree projects: `Header` and `Contact` first, then the three
 * group markers, each followed by its entries. Every period is closed, so the total and the
 * current entry do not depend on the calendar the test runs on — the open-period variant is
 * an explicit `cvSections()` call.
 */

export const CV_NAME = "Mario Di Modica";
export const CV_ROLE = "Software Engineer";
export const CV_LOCATION = "Pisa, Italy";
export const CV_EMAIL = "mario@example.com";
export const CV_MOBILE = "+39 000 000 0000";
export const GITHUB_URL = "https://github.com/mario";
export const SITE_URL = "https://mario.example";
export const CASE_STUDY_URL = "https://mario.example/portfolio";
export const CASE_STUDY_LABEL = "Case study";

export const ACME = "Acme Corp";
export const BETA = "Beta Srl";
export const PORTFOLIO = "Portfolio";
export const TERMINAL = "Terminal";
export const UNIVERSITY = "University of Pisa";
export const ACME_SLUG = "acme-corp";
export const PORTFOLIO_SLUG = "portfolio";
export const UNIVERSITY_SLUG = "university-of-pisa";

/** A closed period: the entry ended, so no total here moves with today's date. */
export const CLOSED_PERIOD = "Jan 2020 – Dec 2023";
export const BETA_PERIOD = "Mar 2018 – Dec 2019";
/** An entry still running: the one the splash reads the role, company and stack from. */
export const OPEN_PERIOD = "Jan 2024 – Present";
/** A period `experienceTotals` cannot read: it contributes neither a total nor a current entry. */
export const UNREADABLE_PERIOD = "sometime";

/** The calendar moment the open-period variants are read against. */
export const FIXED_NOW = new Date(2026, 0, 15);

/** Months the two closed entries cover, and the total the splash prints for them. */
export const CLOSED_TOTAL = "5y 10m";
/** The same career with the newest entry still running, read at `FIXED_NOW`. */
export const OPEN_TOTAL = "3y 11m";

/** One named block, as the projection emits it. */
export function section(title: string, body: readonly string[] = []): ContentSection {
	return { title, body };
}

export function file(
	name: string,
	path: string,
	sections: readonly ContentSection[] = []
): ContentFile {
	return { kind: "file", name, path, sections };
}

export function dir(name: string, path: string, children: readonly TreeNode[] = []): ContentDir {
	return { kind: "dir", name, path, children };
}

export interface CvPeriods {
	readonly acme?: string;
	readonly beta?: string;
}

/** The CV the shell projects. Overrides exist so a test can move one field at a time. */
export function cvSections(periods: CvPeriods = {}): readonly ContentSection[] {
	return [
		section("Header", [CV_NAME, CV_LOCATION, `${CV_ROLE}  building calm systems`]),
		section("Contact", [
			`Email: ${CV_EMAIL}`,
			`Mobile: ${CV_MOBILE}`,
			`GitHub ${GITHUB_URL}`,
			`Website ${SITE_URL}`
		]),
		section("Experience"),
		section(ACME, [
			`${ACME}   ${CV_LOCATION}`,
			`Senior Engineer   ${periods.acme ?? CLOSED_PERIOD}`,
			"TypeScript, React, Node.js",
			"• Led the platform rewrite",
			"• Cut the build to under a minute on every branch"
		]),
		section(BETA, [
			`${BETA}   ${CV_LOCATION}`,
			`Engineer   ${periods.beta ?? BETA_PERIOD}`,
			"Java, Spring Boot",
			"• Shipped the billing service"
		]),
		section("Projects"),
		section(PORTFOLIO, [
			`${PORTFOLIO}   TypeScript, React`,
			"• Built a terminal that renders the CV",
			`${CASE_STUDY_LABEL} ${CASE_STUDY_URL}`,
			`${PORTFOLIO} ${SITE_URL}`
		]),
		section(TERMINAL, [`${TERMINAL}   TypeScript`, "• Replaced the Angular site with a shell"]),
		section("Education"),
		section(UNIVERSITY, [
			`${UNIVERSITY}   ${CV_LOCATION}`,
			"MSc Computer Engineering   Sep 2014 – Jul 2017",
			"110/110"
		])
	];
}

export const CV_SECTIONS: readonly ContentSection[] = cvSections();

/** The same CV with its newest entry still running. */
export const OPEN_SECTIONS: readonly ContentSection[] = cvSections({ acme: OPEN_PERIOD });

/** A CV whose every period this shell cannot read. */
export const UNDATED_SECTIONS: readonly ContentSection[] = cvSections({
	acme: UNREADABLE_PERIOD,
	beta: UNREADABLE_PERIOD
});

/** The CV without the sections a case does not have. */
export function without(
	sections: readonly ContentSection[],
	...titles: readonly string[]
): readonly ContentSection[] {
	return sections.filter(candidate => !titles.includes(candidate.title));
}

/**
 * The banner, transcribed here on purpose: the splash hides the art below this block's
 * literal width, so the test needs its own copy of the bytes rather than the module's.
 */
export const BANNER_ROWS: readonly string[] = [
	"  __  __          _____  _____ ____",
	" |  \\/  |   /\\   |  __ \\|_   _/ __ \\",
	" | \\  / |  /  \\  | |__) | | || |  | |",
	" | |\\/| | / /\\ \\ |  _  /  | || |  | |",
	" | |  | |/ ____ \\| | \\ \\ _| || |__| |",
	" |_|  |_/_/    \\_\\_|  \\_\\_____\\____/"
];

/** The widest the banner gets: what the splash needs before it prints the art. */
export const BANNER_WIDTH = Math.max(...BANNER_ROWS.map(row => row.length));
/** The splash's own margin past the banner. */
export const BANNER_MARGIN = 2;
/** The first screen that holds the banner with its margin. */
export const BANNER_MINIMUM_COLUMNS = BANNER_WIDTH + BANNER_MARGIN;

/** A line's visible text, whichever arm it is. */
export function lineText(line: Line): string {
	return typeof line === "string" ? line : line.map(run => run.text).join("");
}

export function textsOf(lines: readonly Line[]): readonly string[] {
	return lines.map(lineText);
}

/** A line's runs, with a bare string read as the one plain run it is. */
export function spansOf(line: Line): readonly Span[] {
	return typeof line === "string" ? [{ text: line, tone: "plain" }] : line;
}

export const HOME = "/";

export function session(cwd: string = HOME): ShellSession {
	return { cwd, history: [], historyIndex: null, draft: "" };
}

export const CELL = { width: 8, height: 16 } as const;

/**
 * What a caller may change in each arm, derived from the contract so the builder cannot
 * drift from it. The arm itself — the tree, or the reason there is none — is never an
 * override, so a loading context cannot be handed a tree and a loaded one cannot lose it.
 */
type LoadedOverrides = Partial<Omit<ShellContext, "root">>;
type LoadingOverrides = Partial<Omit<ShellContext, "root" | "reason">>;

/** The context a command is handed once the document is in. */
export function shellContext(root: ContentDir, overrides: LoadedOverrides = {}): ShellContext {
	return { root, theme: "dark", columns: 80, cell: CELL, portrait: null, ...overrides };
}

/** The context a command is handed before the document is in. */
export function loadingContext(reason: string, overrides: LoadingOverrides = {}): ShellContext {
	return {
		root: null,
		reason,
		theme: "dark",
		columns: 80,
		cell: CELL,
		portrait: null,
		...overrides
	};
}
