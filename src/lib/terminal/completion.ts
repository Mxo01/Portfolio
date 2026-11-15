import { COMMANDS } from "./commands";
import { resolve } from "./path";
import { tokenize } from "./tokenize";
import type { ContentDir, ShellSession } from "./types";

const DIRECTORY_SUFFIX = "/";
const SEPARATOR = "/";
const SELF = ".";
const TRAILING_SPACE = /\s$/;
const WHITESPACE = /\s/u;
/** The two ways a visitor may group a token; Tab keeps whichever one they used. */
const QUOTES: ReadonlySet<string> = new Set(["'", '"']);
/** Commands that print a directory's entries, so a lone directory is worth descending into. */
const LISTING_COMMANDS: ReadonlySet<string> = new Set(["ls", "tree"]);
/** A first token written as a path: the tree completes it, the command table does not. */
const PATH_PREFIXES = ["./", "../", "/", "~"] as const;

/** What Tab found: the line to show next, and every text the token could become. */
export interface Completion {
	/** The draft with the token under the cursor replaced by the shared prefix. */
	readonly value: string;
	/** Full replacement texts for that token, sorted. Empty when nothing matches. */
	readonly candidates: readonly string[];
}

/**
 * Tab completion: command names at the first position, node names after it.
 * Only `startsWith` — a fuzzy match would make Tab unpredictable. With no
 * candidate the line is handed back untouched, so Tab never eats what was typed.
 *
 * The line gets a trailing slash only where it opens the next level: several
 * candidates that share a directory, or a listing command whose single match is
 * a directory. `cd projects` and `cat projects` stay as typed, like a real shell.
 *
 * Before the CV has loaded there is no tree to walk, so only commands complete.
 */
export function complete(session: ShellSession, root: ContentDir | null): Completion {
	const tokens = tokenize(session.draft);
	const blank = TRAILING_SPACE.test(session.draft);
	const head = blank ? "" : (tokens[tokens.length - 1] ?? "");
	const position = blank ? tokens.length : tokens.length - 1;

	// A path is a path wherever it sits: `./` in the first slot opens the tree, not `help`.
	if (position <= 0 && !isPathToken(head)) {
		const candidates = commandNames(head);
		if (candidates.length === 0) return { value: session.draft, candidates };

		return { value: completeLine(session.draft, commonPrefix(candidates)), candidates };
	}

	// Before the CV has loaded there is no tree to walk, so only commands complete.
	if (root === null) return { value: session.draft, candidates: [] };

	const candidates = nodeNames(session.cwd, root, head);
	if (candidates.length === 0) return { value: session.draft, candidates };

	const prefix = withoutDirectorySuffix(commonPrefix(candidates));
	const [command = ""] = tokens;
	const replacement = descend(session.cwd, root, command, prefix, candidates.length > 1);

	return { value: completeLine(session.draft, replacement), candidates };
}

/** True for `./`, `../`, `/` and `~` — and false for a name that merely starts with dots. */
function isPathToken(token: string): boolean {
	return PATH_PREFIXES.some(prefix => token.startsWith(prefix));
}

/** Longest prefix shared by every candidate; the empty string when they share none. */
function commonPrefix(values: readonly string[]): string {
	const [first = ""] = values;
	let prefix = first;

	for (const value of values) {
		while (prefix.length > 0 && !value.startsWith(prefix)) prefix = prefix.slice(0, -1);
	}

	return prefix;
}

/** Drops the directory mark the candidates carry; the caller decides whether it goes back. */
function withoutDirectorySuffix(value: string): string {
	return value.endsWith(DIRECTORY_SUFFIX) ? value.slice(0, -1) : value;
}

/**
 * Adds the slash back when there is a level to open: an ambiguous completion that
 * already names a directory, or a listing command aimed at one. A file, or a lone
 * directory the command can take as typed, stays bare.
 */
function descend(
	cwd: string,
	root: ContentDir,
	command: string,
	prefix: string,
	ambiguous: boolean
): string {
	if (prefix.length === 0) return prefix;
	if (!ambiguous && !LISTING_COMMANDS.has(command)) return prefix;

	const target = resolve(cwd, prefix, root);
	if (!target.ok || target.node.kind !== "dir") return prefix;

	return `${prefix}${DIRECTORY_SUFFIX}`;
}

/** Where the token under the cursor sits in the draft, and the quote it was opened with. */
interface TokenSpan {
	/** Index of the token's first character, its opening quote included. */
	readonly start: number;
	/** The quote the token was opened with, or `null` when it was written bare. */
	readonly quote: string | null;
}

/** The line with the token under the cursor swapped for its completion. */
function completeLine(draft: string, replacement: string): string {
	const { start, quote } = tokenSpan(draft);
	const prefix = draft.slice(0, start);

	if (quote === null) return `${prefix}${replacement}`;

	const closed = draft.length > start + 1 && draft.endsWith(quote);
	return `${prefix}${quote}${replacement}${closed ? quote : ""}`;
}

/**
 * The span the token under the cursor occupies. It cannot be found by matching the
 * token's text: completion works on the decoded token, so `cat "car"` hands back `car`
 * and the quotes are no longer in it — appending the candidate there would merge the two
 * into `cat "car"career`. Quoting decides where the token starts and what it is wrapped
 * in, and the wrapping is kept as typed: `"car"` completes to `"career"`, an unclosed
 * `"car` to `"career`, so Tab never eats a character the visitor wrote.
 */
function tokenSpan(draft: string): TokenSpan {
	let start = 0;
	let open: string | null = null;

	for (let index = 0; index < draft.length; index += 1) {
		const char = draft.charAt(index);

		if (open !== null) {
			if (char === open) open = null;
			continue;
		}

		if (QUOTES.has(char)) {
			open = char;
			continue;
		}

		if (WHITESPACE.test(char)) start = index + 1;
	}

	const quote = draft.charAt(start);

	return { start, quote: QUOTES.has(quote) ? quote : null };
}

function commandNames(head: string): readonly string[] {
	return Object.keys(COMMANDS)
		.filter(name => name.startsWith(head))
		.sort();
}

function nodeNames(cwd: string, root: ContentDir, head: string): readonly string[] {
	const slash = head.lastIndexOf(SEPARATOR);
	const directory = slash >= 0 ? head.slice(0, slash + 1) : "";
	const prefix = head.slice(slash + 1);
	const resolved = resolve(cwd, directory.length > 0 ? directory : SELF, root);

	if (!resolved.ok || resolved.node.kind !== "dir") return [];

	return resolved.node.children
		.filter(node => node.name.startsWith(prefix))
		.map(node => `${directory}${node.name}${node.kind === "dir" ? DIRECTORY_SUFFIX : ""}`)
		.sort();
}
