import { buildContent } from "@/lib/content/tree";
import { COMMANDS, portraitLine } from "@/lib/terminal/commands";
import type { Command } from "@/lib/terminal/commands";
import { welcomeLines } from "@/lib/terminal/content";
import { execute } from "@/lib/terminal/execute";
import { accent, dim, error, plain, span } from "@/lib/terminal/lines";
import { fileAt } from "@/lib/terminal/output";
import type {
	ContentDir,
	Line,
	ShellContext,
	ShellResult,
	ShellSession,
	Span
} from "@/lib/terminal/types";
import {
	ACME,
	ACME_SLUG,
	BANNER_ROWS,
	CASE_STUDY_LABEL,
	CLOSED_PERIOD,
	CV_LOCATION,
	CV_SECTIONS,
	PORTFOLIO,
	PORTFOLIO_SLUG,
	spansOf,
	textsOf
} from "@/test/fixtures/render";
import {
	FIXTURE_COLUMNS,
	MISSING_REASON,
	fixtureContext,
	fixtureDeepTree,
	fixtureDir,
	fixtureSession,
	fixtureTree
} from "@/test/fixtures/terminal";

const testSubject = COMMANDS;
const needsPortrait = portraitLine;

/** The registry in declaration order, which is the order the usage table prints. */
const COMMAND_NAMES: readonly string[] = [
	"help",
	"ls",
	"cd",
	"cat",
	"tree",
	"pwd",
	"whoami",
	"theme",
	"welcome",
	"clear"
];
const NAMES_SORTED: readonly string[] = [...COMMAND_NAMES].sort();

/**
 * Names the shell deliberately does not have: this registry is the whole command set, with
 * no alias and no legacy unix command borrowed to look busy.
 */
const ABSENT_NAMES: readonly string[] = ["neofetch", "chmod", "exit", "man", "who", "id", "me"];

/** The page's own words, as `help` prints them. */
const USAGE_LABEL = "Usage:";
const ALL_LABEL = "All commands:";
const MORE_LABEL = "More information:";
const FOOTER = "help <command>";
const INDENT = "  ";
const ROW_GAP = " ";
const LIST_GAP = ", ";
const BLANK = "";
const HELP_HINT = "type 'help'";
const EMPTY_DIRECTORY = "(empty)";

/** The screens a case paints on: the fixture's own, one that cannot hold a table, two narrower. */
const WIDE = FIXTURE_COLUMNS;
const COSY = 38;
const NARROW = 20;
/** Narrower than any word on the page, so the description column collapses onto the indent. */
const TIGHT = 3;

/** The tree's own names, so a case states only the command it is about. */
const HOME = "/";
const CV_PATH = "/cv.pdf";
const PROFILE_PATH = "/about/profile";
const EXECUTABLE_PATH = "/export_cv.sh";
const EXECUTABLE_NAME = "export_cv.sh";
const MISSING_PATH = "/nope";
const MISSING_MESSAGE = `no such file or directory: ${MISSING_PATH}`;
const EMAIL = "mario@example.com";

/** The entries the projection gives the two category directories, as their file names. */
const BETA_SLUG = "beta-srl";
const TERMINAL_SLUG = "terminal";
/** What the CV states for the two entries these cases print. */
const ACME_STACK = "TypeScript, React, Node.js";
const PORTFOLIO_STACK = "TypeScript, React";
/** The document's own separators, as the CV renderer draws them. */
const FIELD_SEPARATOR = " · ";
const BULLET_LEAD = "  • ";

/** The page's first table row: the label and the blank row above the table. */
const TABLE_START = 2;

/** Where the invocation column ends: the widest invocation, the indent and one gap. */
const WIDEST_USAGE = Math.max(...COMMAND_NAMES.map(name => commandOf(name).usage.length));
const DESCRIPTION_COLUMN = INDENT.length + WIDEST_USAGE + ROW_GAP.length;

interface RunOptions {
	readonly session?: ShellSession;
	readonly ctx?: ShellContext;
}

function commandOf(name: string): Command {
	const command = testSubject[name];
	if (command === undefined) throw new Error(`the registry has no ${name}`);
	return command;
}

function run(name: string, args: readonly string[] = [], options: RunOptions = {}): ShellResult {
	const session = options.session ?? fixtureSession();
	const ctx = options.ctx ?? fixtureContext();
	return commandOf(name).run(session, args, ctx);
}

function texts(lines: readonly Line[]): readonly string[] {
	return textsOf(lines);
}

function printed(
	name: string,
	args: readonly string[] = [],
	options: RunOptions = {}
): readonly string[] {
	return texts(run(name, args, options).lines);
}

/** The block a section label opens: the lines between it and the next label. */
function blockAfter(lines: readonly Line[], label: string, until: string): readonly Line[] {
	const shown = texts(lines);
	return lines.slice(shown.indexOf(label) + 2, shown.indexOf(until) - 1);
}

/** The consecutive lines under a row's lead that are indented to `column`. */
function descriptionUnder(
	lines: readonly string[],
	from: number,
	column: number
): readonly string[] {
	const indent = " ".repeat(column);
	const described: string[] = [];

	for (const text of lines.slice(from)) {
		if (!text.startsWith(indent)) break;
		described.push(text.trim());
	}

	return described;
}

describe("the registry", () => {
	it("is the whole command set, in the order the usage table prints", () => {
		// WHEN / THEN no alias, no extra entry, no missing one
		expect(Object.keys(testSubject)).toEqual([...COMMAND_NAMES]);
	});

	it.each(COMMAND_NAMES)("states %s's invocation as its own name first", name => {
		const { usage } = commandOf(name);

		// THEN the table can slice the arguments off by the name alone
		expect(usage === name || usage.startsWith(`${name} `)).toBe(true);
	});

	it.each(COMMAND_NAMES)("documents %s with a summary and a detail", name => {
		const { summary, detail } = commandOf(name);

		expect(summary.length).toBeGreaterThan(0);
		expect(detail.length).toBeGreaterThan(0);
	});

	it.each(ABSENT_NAMES)("has no %s", name => {
		// THEN the name cannot be typed, tab-completed or documented
		expect(testSubject[name]).toBeUndefined();
	});

	it("needs no portrait except for whoami", () => {
		// WHEN / THEN the one command that loads an image says so, and only it
		expect(COMMAND_NAMES.filter(name => commandOf(name).needsPortrait === true)).toEqual([
			"whoami"
		]);
	});
});

describe("a name no command claims", () => {
	it.each(ABSENT_NAMES)("answers %s as an unknown command, with the way back", name => {
		// WHEN
		const result = execute(name, fixtureSession(), fixtureContext());

		// THEN
		expect(result.lines).toEqual([error(`unknown command: ${name}`), dim(HELP_HINT)]);
	});
});

describe("help — the page", () => {
	const page = (columns: number = WIDE): readonly string[] =>
		printed("help", [], { ctx: fixtureContext({ columns }) });

	it("opens with the usage label, then a blank row", () => {
		// WHEN
		const lines = run("help").lines;

		// THEN
		expect(texts(lines).slice(0, 2)).toEqual([USAGE_LABEL, BLANK]);
		expect(spansOf(lines[0] ?? "")).toEqual([span(USAGE_LABEL, "dim")]);
	});

	it("prints one row per command, in declaration order", () => {
		// WHEN
		const rows = page().slice(TABLE_START, TABLE_START + COMMAND_NAMES.length);

		// THEN each row is the invocation in one column and its summary in the next
		rows.forEach((row, index) => {
			const name = COMMAND_NAMES[index] ?? "";

			expect(row.slice(0, DESCRIPTION_COLUMN).trimEnd()).toBe(`${INDENT}${commandOf(name).usage}`);
			expect(row.slice(DESCRIPTION_COLUMN)).toBe(commandOf(name).summary);
		});
	});

	it("computes the invocation column from the widest invocation", () => {
		// GIVEN the row that sets the width
		const rows = page().slice(TABLE_START, TABLE_START + COMMAND_NAMES.length);
		const widest = COMMAND_NAMES.reduce(
			(longest, name) =>
				commandOf(name).usage.length > commandOf(longest).usage.length ? name : longest,
			COMMAND_NAMES[0] ?? ""
		);

		// THEN the column is that row, the indent and exactly one gap, never a fixed width
		expect(widest).toBe("help");
		expect(DESCRIPTION_COLUMN).toBe(
			INDENT.length + commandOf(widest).usage.length + ROW_GAP.length
		);
		expect(
			(rows[COMMAND_NAMES.indexOf(widest)] ?? "").slice(
				INDENT.length + commandOf(widest).usage.length,
				DESCRIPTION_COLUMN
			)
		).toBe(ROW_GAP);
	});

	it("paints the command name in the accent and its arguments plain", () => {
		// WHEN
		const row = run("help").lines[TABLE_START + COMMAND_NAMES.indexOf("cat")] ?? "";

		// THEN
		expect(spansOf(row).slice(0, 3)).toEqual([
			span(INDENT),
			span("cat", "accent"),
			span(" <path>")
		]);
	});

	it("labels its three sections in the muted register", () => {
		// WHEN
		const lines = run("help").lines;
		const shown = texts(lines);

		// THEN
		for (const label of [USAGE_LABEL, ALL_LABEL, MORE_LABEL]) {
			expect(spansOf(lines[shown.indexOf(label)] ?? "")).toEqual([span(label, "dim")]);
		}
	});

	it("prints the names alone as one sorted index, separated by commas", () => {
		// WHEN
		const index = blockAfter(run("help").lines, ALL_LABEL, MORE_LABEL);

		// THEN one row, every name once, alphabetically
		expect(texts(index)).toEqual([`${INDENT}${NAMES_SORTED.join(LIST_GAP)}`]);
	});

	it("writes every name of the index in the accent", () => {
		// GIVEN
		const expected: readonly Span[] = [
			span(INDENT),
			...NAMES_SORTED.flatMap((name, index): readonly Span[] => [
				...(index === 0 ? [] : [span(LIST_GAP)]),
				span(name, "accent")
			])
		];

		// WHEN / THEN
		expect(blockAfter(run("help").lines, ALL_LABEL, MORE_LABEL)).toEqual([expected]);
	});

	it("closes with the more-information pointer, then a blank row", () => {
		// WHEN
		const lines = run("help").lines;

		// THEN
		expect(texts(lines).slice(-4)).toEqual([MORE_LABEL, BLANK, `${INDENT}${FOOTER}`, BLANK]);
		expect(spansOf(lines.at(-2) ?? "")).toEqual([
			span(INDENT),
			span("help", "accent"),
			span(" <command>")
		]);
	});

	it("wraps the index on its commas when the screen is narrow", () => {
		// WHEN
		const index = texts(
			blockAfter(
				run("help", [], { ctx: fixtureContext({ columns: NARROW }) }).lines,
				ALL_LABEL,
				MORE_LABEL
			)
		);

		// THEN more than one row, each one a run of whole names inside the screen
		expect(index.length).toBeGreaterThan(1);
		for (const row of index) {
			expect(row.length).toBeLessThanOrEqual(NARROW);
			expect(
				row
					.trim()
					.split(LIST_GAP)
					.every(name => COMMAND_NAMES.includes(name))
			).toBe(true);
		}

		// AND together they are every command, exactly once
		expect(index.flatMap(row => row.trim().split(LIST_GAP)).sort()).toEqual([...NAMES_SORTED]);
	});

	it("moves a description under its row when the screen cannot hold both columns", () => {
		// WHEN
		const shown = printed("help", [], { ctx: fixtureContext({ columns: COSY }) });

		// THEN the widest row is the invocation alone, and its summary starts below it
		expect(shown[TABLE_START]).toBe(`${INDENT}${commandOf("help").usage}`);
		expect(descriptionUnder(shown, TABLE_START + 1, DESCRIPTION_COLUMN).join(" ")).toBe(
			commandOf("help").summary
		);

		// AND a row that still fits keeps its summary beside it
		expect(shown.some(text => text.endsWith(` ${commandOf("theme").summary}`))).toBe(true);
	});

	it("narrows the invocation column to nothing when no description fits beside it", () => {
		// WHEN
		const shown = printed("help", [], { ctx: fixtureContext({ columns: NARROW }) });

		// THEN the column collapses to the indent and one gap
		expect(shown[TABLE_START]).toBe(`${INDENT}${commandOf("help").usage}`);
		expect(descriptionUnder(shown, TABLE_START + 1, INDENT.length + ROW_GAP.length).join(" ")).toBe(
			commandOf("help").summary
		);
	});

	it("keeps every invocation whole on a screen narrower than a word", () => {
		// WHEN
		const shown = printed("help", [], { ctx: fixtureContext({ columns: TIGHT }) });

		// THEN the description column has nowhere to go, so the summary stacks under the indent
		expect(shown.slice(TABLE_START + 1, TABLE_START + 1 + 4)).toEqual(
			commandOf("help")
				.summary.split(" ")
				.map(word => `${INDENT}${word}`)
		);

		// AND no invocation is cut to make room: every row leads with its whole usage, then its
		// summary one word at a time, at the indent the collapsed column gives it
		const expected = COMMAND_NAMES.flatMap(name => [
			`${INDENT}${commandOf(name).usage}`,
			...commandOf(name)
				.summary.split(" ")
				.map(word => `${INDENT}${word}`)
		]);
		expect(shown.slice(TABLE_START, shown.indexOf(ALL_LABEL) - 1)).toEqual(expected);
	});

	it("prints one name per row when the screen cannot hold a list", () => {
		// WHEN
		const index = texts(
			blockAfter(
				run("help", [], { ctx: fixtureContext({ columns: TIGHT }) }).lines,
				ALL_LABEL,
				MORE_LABEL
			)
		);

		// THEN
		expect(index).toEqual(NAMES_SORTED.map(name => `${INDENT}${name}`));
	});
});

describe("help — one command", () => {
	it.each(COMMAND_NAMES)("explains %s: its invocation, its summary", name => {
		// WHEN
		const shown = printed("help", [name]);

		// THEN
		expect(shown[0]).toBe(`help ${name}`);
		expect(shown[2]).toBe(`${INDENT}${commandOf(name).usage}`);
		expect(shown[3]).toBe(`${INDENT}${commandOf(name).summary}`);
	});

	it("names the command, then the invocation and its summary, then a blank row", () => {
		// WHEN
		const lines = run("help", ["cat"]).lines;

		// THEN
		expect(spansOf(lines[0] ?? "")).toEqual([span("help cat", "dim")]);
		expect(spansOf(lines[1] ?? "")).toEqual([]);
		expect(spansOf(lines[2] ?? "")).toEqual([span(INDENT), span(commandOf("cat").usage, "accent")]);
		expect(spansOf(lines[3] ?? "")).toEqual([span(INDENT), span(commandOf("cat").summary)]);
		expect(spansOf(lines[4] ?? "")).toEqual([]);
	});

	it("wraps the detail under the invocation, one indent in", () => {
		// WHEN
		const detail = texts(run("help", ["cat"]).lines.slice(5, -1));

		// THEN every line is indented and the words are the command's own sentence, unbroken
		expect(detail.length).toBeGreaterThan(1);
		expect(detail.every(text => text.startsWith(INDENT))).toBe(true);
		expect(detail.map(text => text.trim()).join(" ")).toBe(commandOf("cat").detail);
	});

	it("wraps the summary under the invocation's own hanging indent", () => {
		// WHEN the screen is too narrow for the whole summary on one row
		const shown = printed("help", ["cat"], { ctx: fixtureContext({ columns: NARROW }) });

		// THEN it breaks where the width says, and every row keeps the same indent
		expect(shown.slice(3, 5)).toEqual([`${INDENT}print a file: CV,`, `${INDENT}role or project`]);
	});

	it("ends the page with a blank row", () => {
		// WHEN / THEN
		expect(run("help", ["cat"]).lines.at(-1)).toEqual([]);
	});

	it("answers a name it does not document with its own refusal", () => {
		// WHEN
		const lines = run("help", ["nope"]).lines;

		// THEN the shell's one wording for a missing thing, and the way back to the page
		expect(lines).toEqual([error("no help for nope"), dim(`${HELP_HINT} to see what is here`)]);
	});
});

describe("welcome", () => {
	it("reprints the splash the boot printed, from the tree's own document", () => {
		// GIVEN the document the projection read
		const root = fixtureTree();
		const document = fileAt(root, CV_PATH);
		if (document === null) throw new Error(`the fixture tree has no ${CV_PATH}`);

		// WHEN
		const result = run("welcome", [], { ctx: fixtureContext({ root }) });

		// THEN the splash builder gets the same sections the boot gave it
		expect(result.lines).toEqual(welcomeLines(document.sections, WIDE));
		expect(texts(result.lines).slice(0, BANNER_ROWS.length)).toEqual([...BANNER_ROWS]);
	});

	it("changes no session state and asks the view for nothing", () => {
		// GIVEN a session mid-edit
		const session = fixtureSession({
			cwd: "/career",
			history: ["pwd"],
			historyIndex: 0,
			draft: "x"
		});

		// WHEN
		const result = run("welcome", [], { session });

		// THEN
		expect(result.session).toBe(session);
		expect(result.clear).toBeUndefined();
		expect(result.toggleTheme).toBeUndefined();
		expect(result.script).toBeUndefined();
	});

	it("says the document is missing when the tree has no cv.pdf", () => {
		// GIVEN a tree without the document
		const bare = fixtureDir(HOME, []);

		// WHEN / THEN
		expect(run("welcome", [], { ctx: fixtureContext({ root: bare }) }).lines).toEqual([
			error(`missing ${CV_PATH}`)
		]);
	});

	it("prints the reason when the content has not arrived", () => {
		// WHEN / THEN
		expect(run("welcome", [], { ctx: fixtureContext({ root: null }) }).lines).toEqual([
			error(`content unavailable: ${MISSING_REASON}`)
		]);
	});
});

describe("cat", () => {
	it("prints a file as the CV states it", () => {
		// WHEN
		const result = run("cat", [PROFILE_PATH]);

		// THEN the field's label in the muted column, its value plain
		expect(result.lines).toEqual([[span("Name  ", "dim"), span("Mario")]]);
		expect(result.session).toEqual(fixtureSession());
	});

	it("prints a directory's entries instead, one block each", () => {
		// WHEN
		const shown = printed("cat", ["/about"]);

		// THEN
		expect(shown).toEqual(["Mario", BLANK, "Summary", "Builds things"]);
	});

	it("refuses a file it may not print, in the shell's one wording", () => {
		// WHEN / THEN the node refuses, not the name
		expect(run("cat", [EXECUTABLE_PATH]).lines).toEqual([
			error(`permission denied: ${EXECUTABLE_NAME}`)
		]);
	});

	it("reports a path the tree does not hold", () => {
		// WHEN / THEN
		expect(run("cat", [MISSING_PATH]).lines).toEqual([error(MISSING_MESSAGE), dim(HELP_HINT)]);
	});

	it("asks for a path when it is given none", () => {
		// WHEN / THEN the hint here is how to find a path, not how to find help
		expect(run("cat").lines).toEqual([
			error("usage: cat <path>"),
			dim("type 'ls' to see what is here")
		]);
	});

	it("prints the reason when the content has not arrived", () => {
		// WHEN / THEN
		expect(run("cat", [PROFILE_PATH], { ctx: fixtureContext({ root: null }) }).lines).toEqual([
			error(`content unavailable: ${MISSING_REASON}`)
		]);
	});
});

describe("the tree the projection builds", () => {
	const projected = buildContent(CV_SECTIONS);
	const ctx = fixtureContext({ root: projected });

	it("lists each category's entries as files rather than as directories", () => {
		// WHEN
		const career = printed("ls", ["/career"], { ctx });
		const projects = printed("ls", ["/projects"], { ctx });

		// THEN one plain name per entry, in the document's own order, with no slash
		expect(career).toEqual([plain(ACME_SLUG), plain(BETA_SLUG)]);
		expect(projects).toEqual([plain(PORTFOLIO_SLUG), plain(TERMINAL_SLUG)]);
	});

	it("prints a career entry file as the entry the document states", () => {
		// WHEN
		const shown = printed("cat", [`/career/${ACME_SLUG}`], { ctx });

		// THEN the name beside its city, the role and period, then the stack, then the bullets
		expect(shown[0]?.startsWith(ACME)).toBe(true);
		expect(shown[0]?.endsWith(CV_LOCATION)).toBe(true);
		expect(shown[1]).toBe(`Senior Engineer${FIELD_SEPARATOR}${CLOSED_PERIOD}`);
		expect(shown[2]).toBe(ACME_STACK);
		expect(shown[3]).toBe(`${BULLET_LEAD}Led the platform rewrite`);
	});

	it("prints a project entry file with its link label and never its address", () => {
		// WHEN
		const shown = printed("cat", [`/projects/${PORTFOLIO_SLUG}`], { ctx });

		// THEN the name, the stack, the bullet, then the link the document labelled
		expect(shown.slice(0, 2)).toEqual([PORTFOLIO, PORTFOLIO_STACK]);
		expect(shown.at(-1)).toBe(CASE_STUDY_LABEL);
		expect(shown.some(text => text.includes("https://"))).toBe(false);
	});
});

describe("cd", () => {
	/** A tree with a level to descend into: the fixture's groups hold files only. */
	const deep = fixtureDeepTree();

	const moved: readonly {
		readonly name: string;
		readonly cwd: string;
		readonly args: readonly string[];
		readonly expected: string;
		readonly tree?: ContentDir;
	}[] = [
		{ name: "a bare name from the root", cwd: HOME, args: ["career"], expected: "/career" },
		{
			name: "a nested relative path",
			cwd: HOME,
			args: ["notes/2024"],
			expected: "/notes/2024",
			tree: deep
		},
		{
			name: "the parent directory",
			cwd: "/notes/2024",
			args: [".."],
			expected: "/notes",
			tree: deep
		},
		{ name: "home as a tilde", cwd: "/career/aurum", args: ["~"], expected: HOME },
		{ name: "an absolute path", cwd: "/career", args: ["/education"], expected: "/education" },
		{ name: "the current directory", cwd: "/career", args: ["."], expected: "/career" },
		{ name: "no argument at all", cwd: "/career", args: [], expected: HOME }
	];

	it.each(moved)("moves to $name, printing nothing", ({ cwd, args, expected, tree }) => {
		// GIVEN
		const session = fixtureSession({ cwd });

		// WHEN
		const result = run("cd", args, {
			session,
			...(tree === undefined ? {} : { ctx: fixtureContext({ root: tree }) })
		});

		// THEN
		expect(result.session).toEqual({ ...session, cwd: expected });
		expect(result.lines).toEqual([]);
	});

	const refused: readonly {
		readonly name: string;
		readonly args: readonly string[];
		readonly message: string;
	}[] = [
		{ name: "a file", args: [CV_PATH], message: `not a directory: ${CV_PATH}` },
		{
			name: "a path through a file",
			args: [`${CV_PATH}/x`],
			message: `not a directory: ${CV_PATH}`
		},
		{ name: "a path that is not there", args: [MISSING_PATH], message: MISSING_MESSAGE }
	];

	it.each(refused)("refuses $name and stays put", ({ args, message }) => {
		// GIVEN
		const session = fixtureSession({ cwd: HOME });

		// WHEN
		const result = run("cd", args, { session });

		// THEN
		expect(result.lines).toEqual([error(message), dim(HELP_HINT)]);
		expect(result.session).toEqual(session);
	});

	it("prints the reason when the content has not arrived", () => {
		// WHEN / THEN
		expect(run("cd", [HOME], { ctx: fixtureContext({ root: null }) }).lines).toEqual([
			error(`content unavailable: ${MISSING_REASON}`)
		]);
	});
});

describe("ls", () => {
	it("lists a group's entries as files, with no slash", () => {
		// WHEN / THEN the projection puts one file per entry directly under the group
		expect(run("ls", ["/career"]).lines).toEqual([plain("aurum"), plain("fitcheck")]);
	});

	it("marks a directory with a trailing slash", () => {
		// GIVEN a tree with a level to descend into
		const root = fixtureDeepTree();

		// WHEN
		const lines = run("ls", ["/notes"], { ctx: fixtureContext({ root }) }).lines;

		// THEN the directory carries the slash and the accent; the file does neither
		expect(lines).toEqual([accent("2024/"), plain("today")]);
	});

	it("lists the current directory when it is given none", () => {
		// WHEN / THEN the root's entries, in the order the CV states them
		expect(printed("ls")).toEqual([
			"about/",
			"career/",
			"education/",
			"projects/",
			"contact",
			"cv.pdf",
			"export_cv.sh"
		]);
	});

	it("prints a file alone", () => {
		// WHEN / THEN
		expect(run("ls", [CV_PATH]).lines).toEqual([plain("cv.pdf")]);
	});

	it("says a directory is empty when it holds nothing", () => {
		// GIVEN
		const root = fixtureDir(HOME, [fixtureDir("/empty", [])]);

		// WHEN / THEN
		expect(run("ls", ["/empty"], { ctx: fixtureContext({ root }) }).lines).toEqual([
			dim(EMPTY_DIRECTORY)
		]);
	});

	it("reports a path the tree does not hold", () => {
		// WHEN / THEN
		expect(run("ls", [MISSING_PATH]).lines).toEqual([error(MISSING_MESSAGE), dim(HELP_HINT)]);
	});

	it("prints the reason when the content has not arrived", () => {
		// WHEN / THEN
		expect(run("ls", [HOME], { ctx: fixtureContext({ root: null }) }).lines).toEqual([
			error(`content unavailable: ${MISSING_REASON}`)
		]);
	});
});

describe("tree", () => {
	it("prints the whole filesystem, root first, in the CV's order", () => {
		// WHEN
		const shown = printed("tree");

		// THEN
		expect(shown[0]).toBe(HOME);
		expect(shown).toContain("├── about/");
		expect(shown).toContain("│   ├── profile");
		expect(shown.at(-1)).toBe(`└── ${EXECUTABLE_NAME}`);
	});

	it("prints the reason when the content has not arrived", () => {
		// WHEN / THEN
		expect(run("tree", [], { ctx: fixtureContext({ root: null }) }).lines).toEqual([
			error(`content unavailable: ${MISSING_REASON}`)
		]);
	});
});

describe("pwd", () => {
	it("prints the working directory as its absolute path", () => {
		// WHEN
		const result = run("pwd", [], { session: fixtureSession({ cwd: "/career" }) });

		// THEN a bare plain line, not a toned one
		expect(result.lines).toEqual(["/career"]);
	});
});

describe("whoami", () => {
	it("prints the CV's facts, the name opening the panel", () => {
		// WHEN
		const lines = run("whoami").lines;

		// THEN
		expect(spansOf(lines[0] ?? "")).toEqual([span("Mario", "heading")]);
	});

	it("keeps each address behind its label, never in the text", () => {
		// WHEN
		const lines = run("whoami").lines;
		const row = lines.find(line => texts([line])[0]?.endsWith(EMAIL) === true);

		// THEN
		expect(row).toBeDefined();
		expect(spansOf(row ?? "").at(-1)).toEqual({
			text: EMAIL,
			tone: "plain",
			href: `mailto:${EMAIL}`
		});
	});

	it("changes no session state and asks the view for nothing", () => {
		// GIVEN
		const session = fixtureSession({ cwd: "/career" });

		// WHEN
		const result = run("whoami", [], { session });

		// THEN
		expect(result.session).toBe(session);
		expect(result.clear).toBeUndefined();
		expect(result.toggleTheme).toBeUndefined();
	});

	it("prints the reason when the content has not arrived", () => {
		// WHEN / THEN
		expect(run("whoami", [], { ctx: fixtureContext({ root: null }) }).lines).toEqual([
			error(`content unavailable: ${MISSING_REASON}`)
		]);
	});
});

describe("portraitLine", () => {
	it.each([
		{ name: "whoami", line: "whoami", expected: true },
		{ name: "whoami with padding around it", line: "  whoami  ", expected: true },
		{ name: "whoami with an argument", line: "whoami -a", expected: true },
		{ name: "a command with no portrait", line: "pwd", expected: false },
		{ name: "an unknown command", line: "neofetch", expected: false },
		{ name: "an empty line", line: "", expected: false }
	])("answers $expected for $name", ({ line, expected }) => {
		// WHEN / THEN
		expect(needsPortrait(line)).toBe(expected);
	});
});

describe("theme", () => {
	it("flips the dark palette and says so", () => {
		// GIVEN
		const session = fixtureSession({ cwd: "/career" });

		// WHEN
		const result = run("theme", [], { session, ctx: fixtureContext({ theme: "dark" }) });

		// THEN
		expect(result.session).toBe(session);
		expect(result).toEqual({ session, lines: [dim("theme: light")], toggleTheme: true });
	});

	it("flips the light palette back", () => {
		// WHEN
		const result = run("theme", [], { ctx: fixtureContext({ theme: "light" }) });

		// THEN
		expect(result.lines).toEqual([dim("theme: dark")]);
		expect(result.toggleTheme).toBe(true);
	});
});

describe("clear", () => {
	it("asks for the scrollback to be wiped and prints nothing", () => {
		// GIVEN
		const session = fixtureSession({ cwd: "/career" });

		// WHEN
		const result = run("clear", [], { session });

		// THEN
		expect(result).toEqual({ session, lines: [], clear: true });
	});
});
