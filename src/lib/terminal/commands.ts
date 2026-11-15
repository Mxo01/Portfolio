import { renderPanel } from "@/lib/portrait";

import { HOME_PATH } from "./constants";
import { unavailableLines, welcomeLines } from "./content";
import { accent, dim, error, plain, span } from "./lines";
import { fileAt, fileLines, listingLines, treeLines, whoamiDetails } from "./output";
import { resolve } from "./path";
import { isReadable, permissionDenied } from "./script-data";
import { tokenize } from "./tokenize";
import type { Line, ShellContext, ShellResult, ShellSession, Span } from "./types";

const HELP_HINT = "type 'help'";
const EMPTY_DIRECTORY = "(empty)";
/**
 * The tree's copy of the document the projection read. `welcome` hands its sections back to
 * the splash builder, which is the same input the boot gave it, so the two blocks agree.
 */
const DOCUMENT_PATH = "/cv.pdf";

/** The `help` page, in the rhythm of `npm --help`: usage table, index, footer. */
const USAGE_LABEL = "Usage:";
const ALL_LABEL = "All commands:";
const MORE_LABEL = "More information:";
const INDENT = "  ";
const ROW_GAP = " ";
const LIST_GAP = ", ";
/** The index reads as a column; past this it stops being one. */
const INDEX_WIDTH = 80;
/** A description narrower than this is not worth putting beside anything. */
const MINIMUM_DESCRIPTION = 20;
const WORD_RUN = /\s+/;

/** One command: how it is typed, what it says in `help`, and its pure implementation. */
export interface Command {
	/** The invocation as typed: the name first, then its arguments, in their own brackets. */
	readonly usage: string;
	/** The one line the usage table and `help <command>` print beside the invocation. */
	readonly summary: string;
	/** The sentence `help <command>` prints under the summary. */
	readonly detail: string;
	/**
	 * How many arguments the command reads. A line carrying more is refused whole by the
	 * dispatcher, so an unread argument is never silently dropped.
	 */
	readonly arity: number;
	/**
	 * What the line cannot produce on its own: the view loads it before `execute`, so the
	 * command stays synchronous and only the first call pays for the fetch.
	 */
	readonly needsPortrait?: boolean;
	readonly run: (session: ShellSession, args: readonly string[], ctx: ShellContext) => ShellResult;
}

/** A row of the usage table: what to type, and what it does. */
interface HelpRow {
	readonly name: string;
	/** The arguments as typed, leading space included, so a row is one concatenation. */
	readonly args: string;
	readonly description: string;
}

/** One command with its table row: what `help <command>` needs. */
interface Documented {
	readonly row: HelpRow;
	readonly command: Command;
}

/** `whoami`: the CV's facts beside a portrait loaded on the first call. */
const WHOAMI: Command = {
	usage: "whoami",
	summary: "who I am, with a face",
	detail:
		"Projects the CV's own facts — name, role, city, contact links, current role, education — beside a portrait drawn in characters, loaded on the first call. Too narrow for both, it prints the facts alone.",
	arity: 0,
	needsPortrait: true,
	run: (session, _args, ctx) => {
		const { root } = ctx;
		if (root === null) return result(session, unavailableLines(ctx.reason));

		return result(
			session,
			renderPanel({
				portrait: ctx.portrait,
				columns: ctx.columns,
				cell: ctx.cell,
				theme: ctx.theme,
				detailsFor: columns => whoamiDetails(root, columns)
			})
		);
	}
};

/**
 * Adding a command is one entry here: `help`, the index and Tab read the same table, and
 * the declaration order is the order the usage table prints.
 */
export const COMMANDS: Readonly<Record<string, Command>> = {
	help: {
		usage: "help <command>",
		summary: "show a command's details",
		detail:
			"Prints every command with its invocation, then the names alone as an index. With a name, explains that one command and nothing else.",
		arity: 1,
		run: (session, args, ctx) => {
			const name = args[0];
			if (name === undefined) return result(session, helpLines(ctx.columns));

			const documented = documentedCommand(name);
			if (documented === null) {
				return result(session, [
					error(`no help for ${name}`),
					dim(`${HELP_HINT} to see what is here`)
				]);
			}

			return result(session, commandHelp(documented, ctx.columns));
		}
	},
	ls: {
		usage: "ls [path]",
		summary: "list a directory",
		detail:
			"Lists one directory's entries, the current one by default. Directories carry a trailing slash; a file prints alone.",
		arity: 1,
		run: (session, args, ctx) => {
			if (ctx.root === null) return result(session, unavailableLines(ctx.reason));

			const resolved = resolve(session.cwd, args[0] ?? ".", ctx.root);
			if (!resolved.ok) return failure(session, resolved.error);

			const { node } = resolved;
			const children = node.kind === "dir" ? node.children : [node];
			if (children.length === 0) return result(session, [dim(EMPTY_DIRECTORY)]);

			return result(
				session,
				children.map(child => (child.kind === "dir" ? accent(`${child.name}/`) : plain(child.name)))
			);
		}
	},
	cd: {
		usage: "cd <path>",
		summary: "change directory",
		detail:
			"Moves through the virtual filesystem. No argument goes home; `~`, `.`, `..` and absolute paths all resolve.",
		arity: 1,
		run: (session, args, ctx) => {
			if (ctx.root === null) return result(session, unavailableLines(ctx.reason));

			const target = args[0] ?? HOME_PATH;
			const resolved = resolve(session.cwd, target, ctx.root);
			if (!resolved.ok) return failure(session, resolved.error);
			if (resolved.node.kind !== "dir") return failure(session, `not a directory: ${target}`);

			return { session: { ...session, cwd: resolved.node.path }, lines: [] };
		}
	},
	cat: {
		usage: "cat <path>",
		summary: "print a file: CV, role or project",
		detail:
			"Prints a file as the CV states it. On a directory it prints that category's entries instead, one block each.",
		arity: 1,
		run: (session, args, ctx) => {
			if (ctx.root === null) return result(session, unavailableLines(ctx.reason));

			const target = args[0];
			if (target === undefined) {
				return failure(session, "usage: cat <path>", "type 'ls' to see what is here");
			}

			const resolved = resolve(session.cwd, target, ctx.root);
			if (!resolved.ok) return failure(session, resolved.error);

			const { node } = resolved;
			// A file may refuse to be read, and the node is what says so.
			if (!isReadable(node)) return result(session, [error(permissionDenied(node.name))]);

			return result(
				session,
				node.kind === "dir" ? listingLines(node, ctx.columns) : fileLines(node, ctx.columns)
			);
		}
	},
	tree: {
		usage: "tree",
		summary: "print the whole filesystem",
		detail: "Prints every file and directory, in the order the CV states them.",
		arity: 0,
		run: (session, _args, ctx) => {
			if (ctx.root === null) return result(session, unavailableLines(ctx.reason));

			return result(session, treeLines(ctx.root));
		}
	},
	pwd: {
		usage: "pwd",
		summary: "print the working directory",
		detail: "Prints the current directory's absolute path.",
		arity: 0,
		run: session => result(session, [plain(session.cwd)])
	},
	whoami: WHOAMI,
	theme: {
		usage: "theme",
		summary: "switch dark and light",
		detail: "Flips the terminal palette and remembers the choice for the next visit.",
		arity: 0,
		run: (session, _args, ctx) => ({
			session,
			lines: [dim(`theme: ${ctx.theme === "dark" ? "light" : "dark"}`)],
			toggleTheme: true
		})
	},
	welcome: {
		usage: "welcome",
		summary: "print the welcome splash",
		detail:
			"Reprints the block the boot prints: the banner, the name and city, the summary sentence, then the ways in. A screen too narrow for the banner shows the rest alone.",
		arity: 0,
		run: (session, _args, ctx) => {
			if (ctx.root === null) return result(session, unavailableLines(ctx.reason));

			const document = fileAt(ctx.root, DOCUMENT_PATH);
			if (document === null) return result(session, [error(`missing ${DOCUMENT_PATH}`)]);

			return result(session, welcomeLines(document.sections, ctx.columns));
		}
	},
	clear: {
		usage: "clear",
		summary: "wipe the scrollback",
		detail: "Clears the screen and homes the cursor. Ctrl+L does the same.",
		arity: 0,
		run: session => ({ session, lines: [], clear: true })
	}
};

/**
 * Whether running this line needs the portrait. The view asks before it calls `execute`,
 * which is how the fetch stays off the boot path and every command stays synchronous.
 */
export function portraitLine(line: string): boolean {
	const [name = ""] = tokenize(line.trim());
	return COMMANDS[name]?.needsPortrait === true;
}

/** The `help` page: usage table, index, footer. The blank lines are part of it. */
function helpLines(columns: number): readonly Line[] {
	const rows = helpRows();
	const column = tableColumn(rows, columns);

	return [
		[span(USAGE_LABEL, "dim")],
		[],
		...rows.flatMap(row => tableRow(row, columns, column)),
		[],
		[span(ALL_LABEL, "dim")],
		[],
		...indexLines(columns),
		[],
		[span(MORE_LABEL, "dim")],
		[],
		[span(INDENT), span("help", "accent"), span(" <command>")],
		[]
	];
}

/**
 * One command explained: the invocation, then the summary and the sentence, both wrapped
 * under the same hanging indent so neither can run off a narrow screen.
 */
function commandHelp({ row, command }: Documented, columns: number): readonly Line[] {
	const width = Math.max(1, Math.min(columns, INDEX_WIDTH));

	return [
		[span(`help ${row.name}`, "dim")],
		[],
		[span(INDENT), span(`${row.name}${row.args}`, "accent")],
		...wrapped(row.description, width - INDENT.length).map((line): Line => [
			span(INDENT),
			span(line)
		]),
		[],
		...wrapped(command.detail, width - INDENT.length).map((line): Line => [
			span(INDENT),
			span(line)
		]),
		[]
	];
}

/**
 * The usage table's rows, in declaration order: every command with the invocation and the
 * summary `help <command>` repeats.
 */
function helpRows(): readonly HelpRow[] {
	return Object.entries(COMMANDS).map(([name, command]) => rowOf(name, command));
}

/** One table row: the name as typed, its arguments after it, and the summary beside it. */
function rowOf(name: string, command: Command): HelpRow {
	return { name, args: command.usage.slice(name.length), description: command.summary };
}

/**
 * One command by name, alias included, or `null` when there is nothing to document. The row
 * is derived from the command itself: it is the same row the usage table prints, and the
 * registry is the one place both read it from.
 */
function documentedCommand(name: string): Documented | null {
	const command = COMMANDS[name];
	return command === undefined ? null : { row: rowOf(name, command), command };
}

/**
 * The width of the invocation column: the widest row, narrowed only when the screen cannot
 * hold both columns. Never wider than the data, never narrow enough to hide the table.
 */
function tableColumn(rows: readonly HelpRow[], columns: number): number {
	const widest = rows.reduce(
		(width, { name, args }) => Math.max(width, name.length + args.length),
		0
	);
	const usable = columns - INDENT.length - ROW_GAP.length - MINIMUM_DESCRIPTION;

	return Math.max(0, Math.min(widest, usable));
}

/**
 * One usage row. The description sits beside the invocation when it fits; when it cannot,
 * it moves to the lines below, aligned at the same column, and the command name is never
 * cut to make room.
 */
function tableRow(row: HelpRow, columns: number, column: number): readonly Line[] {
	const invocation = `${row.name}${row.args}`;
	const lead: readonly Span[] = [
		span(INDENT),
		span(row.name, "accent"),
		...(row.args.length === 0 ? [] : [span(row.args)])
	];

	// Every command states a summary of its own, so a row always has something to put beside it.
	/* v8 ignore next -- the registry documents no command without a summary */
	if (row.description.length === 0) return [lead];

	const shouldered = INDENT.length + column + ROW_GAP.length + row.description.length;
	if (column >= invocation.length && shouldered <= columns) {
		const padding = " ".repeat(column - invocation.length + ROW_GAP.length);
		return [[...lead, span(padding), span(row.description)]];
	}

	return [lead, ...describedBelow(row.description, columns, column)];
}

/** A description pushed under its row, aligned at the table's description column. */
function describedBelow(description: string, columns: number, column: number): readonly Line[] {
	const aligned = INDENT.length + column + ROW_GAP.length;
	const start = aligned < columns ? aligned : INDENT.length;
	const width = Math.max(1, columns - start);

	return wrapped(description, width).map((line): Line => [span(" ".repeat(start)), span(line)]);
}

/** The names alone, comma separated, wrapped at the index width on the commas. */
function indexLines(columns: number): readonly Line[] {
	const width = Math.min(INDEX_WIDTH, columns);
	const names = Object.keys(COMMANDS).sort();
	const lines: string[] = [];
	let line = "";

	for (const name of names) {
		const candidate = line.length === 0 ? name : `${line}${LIST_GAP}${name}`;
		if (INDENT.length + candidate.length <= width) {
			line = candidate;
			continue;
		}

		if (line.length > 0) lines.push(line);
		line = name;
	}

	// The loop always leaves a name in `line`: the list it walks is the registry's own keys.
	/* v8 ignore next -- a list of no names is a registry with no commands */
	if (line.length > 0) lines.push(line);

	return lines.map(text => [
		span(INDENT),
		...text
			.split(LIST_GAP)
			.flatMap((name, index): readonly Span[] => [
				...(index === 0 ? [] : [span(LIST_GAP)]),
				span(name, "accent")
			])
	]);
}

/** Greedy wrap on word boundaries, at `width` characters. */
function wrapped(text: string, width: number): readonly string[] {
	const limit = Math.max(1, width);
	const lines: string[] = [];
	let line = "";

	for (const word of text.split(WORD_RUN).filter(part => part.length > 0)) {
		const candidate = line.length === 0 ? word : `${line} ${word}`;
		if (candidate.length <= limit) {
			line = candidate;
			continue;
		}

		if (line.length > 0) lines.push(line);
		line = word;
	}

	// Every caller wraps a sentence it was handed, so the accumulator is never left empty.
	/* v8 ignore next -- an empty sentence has no line to close */
	if (line.length > 0) lines.push(line);
	return lines;
}

function result(session: ShellSession, lines: readonly Line[]): ShellResult {
	return { session, lines };
}

function failure(session: ShellSession, message: string, hint: string = HELP_HINT): ShellResult {
	return result(session, [error(message), dim(hint)]);
}
