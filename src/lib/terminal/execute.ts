import { COMMANDS } from "./commands";
import type { Command } from "./commands";
import { remember } from "./history";
import { dim, error } from "./lines";
import { resolve } from "./path";
import { isExecutable, permissionDenied } from "./script-data";
import { tokenize } from "./tokenize";
import type { ShellContext, ShellResult, ShellSession, TreeNode } from "./types";

/** A first token the visitor pointed at by path rather than by command name. */
const PATH_PREFIXES = [".", "/"] as const;
/** While a script plays the line editor is closed: the mode is what says so. */
const SCRIPT_MODE = "script" as const;
const UNKNOWN_HINT = "type 'help'";
/**
 * What a real shell would read as an operator joining, piping or redirecting commands.
 * This one implements none of them, so a line carrying one is refused rather than halved.
 */
const OPERATORS: ReadonlySet<string> = new Set(["&&", "||", "|", ";", ">", ">>", "&"]);
/** Nothing here expands a variable, so a token that names one is an operator too. */
const VARIABLE_PREFIX = "$";
const OPERATOR_HINT = "run one command at a time";

/**
 * One Enter press. The view has already painted the prompt and the line it sent,
 * so this returns only what the command prints. The session always comes back on
 * an empty draft, off the history, with the line recorded.
 *
 * The first token is dispatched in one order: a token written as a path (`.`/`/` prefix)
 * goes straight to the filesystem; otherwise the command table answers; a name the table
 * does not have is tried as a file before it is declared unknown, which is how a bare
 * `export_cv.sh` runs. Whatever resolves to a file the shell cannot run is refused in
 * the shell's own words. A path that resolves to nothing is missing, not unknown.
 *
 * A line carries one command and nothing else: an argument written as a shell operator is
 * refused before anything runs, so a chained or mistyped line never executes half of itself.
 */
export function execute(input: string, session: ShellSession, ctx: ShellContext): ShellResult {
	const typed = input.trim();
	const settled = { draft: "", historyIndex: null, history: remember(session.history, typed) };

	if (typed.length === 0) return { session: { ...session, ...settled }, lines: [] };

	const [name = "", ...args] = tokenize(typed);
	const operator = args.find(isOperator);
	if (operator !== undefined) {
		return {
			session: { ...session, ...settled },
			lines: [error(`unsupported operator: ${operator}`), dim(OPERATOR_HINT)]
		};
	}

	const outcome = isPath(name)
		? pathOutcome(name, session, ctx)
		: nameOutcome(name, args, session, ctx);

	return { ...outcome, session: { ...outcome.session, ...settled } };
}

/**
 * True for an argument this shell cannot honour. Quoted text is already one plain token by
 * the time it gets here, so `cat "a && b"` names a file and only a bare token trips this.
 */
function isOperator(token: string): boolean {
	return OPERATORS.has(token) || token.startsWith(VARIABLE_PREFIX);
}

/** True for a token the visitor wrote as a path: relative to here, or from the root. */
function isPath(token: string): boolean {
	return PATH_PREFIXES.some(prefix => token.startsWith(prefix));
}

/** A token written as a path: the filesystem answers, and nothing falls back to `help`. */
function pathOutcome(token: string, session: ShellSession, ctx: ShellContext): ShellResult {
	const resolved = ctx.root === null ? null : resolve(session.cwd, token, ctx.root);
	if (resolved === null || !resolved.ok) return missing(token, session);

	return applied(resolved.node, token, session);
}

/** A bare name: the command table first, then the filesystem, then `unknown command`. */
function nameOutcome(
	name: string,
	args: readonly string[],
	session: ShellSession,
	ctx: ShellContext
): ShellResult {
	const command = COMMANDS[name];
	if (command !== undefined) return commandOutcome(name, command, args, session, ctx);

	const resolved = ctx.root === null ? null : resolve(session.cwd, name, ctx.root);
	if (resolved !== null && resolved.ok) return applied(resolved.node, name, session);

	return {
		session,
		lines: [error(`unknown command: ${name}`), dim(UNKNOWN_HINT)]
	};
}

/**
 * A command's own outcome, unless the line gave it more than it reads: a command states its
 * arity, and an argument it would ignore is a refusal with its invocation instead.
 */
function commandOutcome(
	name: string,
	command: Command,
	args: readonly string[],
	session: ShellSession,
	ctx: ShellContext
): ShellResult {
	if (args.length > command.arity) {
		return {
			session,
			lines: [error(`${name}: too many arguments`), dim(`usage: ${command.usage}`)]
		};
	}

	return command.run(session, args, ctx);
}

/**
 * A node the visitor asked to run. Only the executable flag matters: the dispatcher never
 * reads a file name. Anything else in the tree is refused, because a file that prints is
 * not a program — in the one wording the reader refuses a file with.
 */
function applied(node: TreeNode, token: string, session: ShellSession): ShellResult {
	if (!isExecutable(node)) return { session, lines: [error(permissionDenied(token))] };

	return { session: { ...session, mode: SCRIPT_MODE }, lines: [], script: node.script };
}

/** A path the tree does not hold: the same words `cd` and `cat` already use. */
function missing(token: string, session: ShellSession): ShellResult {
	return { session, lines: [error(`no such file: ${token}`)] };
}
