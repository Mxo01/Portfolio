import type { ContentDir, ContentFile, TreeNode } from "./types";

const SEPARATOR = "/";
const TILDE = "~";
const PARENT = "..";
const SELF = ".";

/** A resolution that keeps its reason, so commands can say what is wrong. */
export type PathResolution =
	{ readonly ok: true; readonly node: TreeNode } | { readonly ok: false; readonly error: string };

/** A place in the tree: the node itself and its ancestors, root first, so `..` can climb. */
interface Position {
	readonly current: TreeNode;
	readonly ancestors: readonly TreeNode[];
}

/**
 * Resolves `target` against `cwd` inside the virtual tree: absolute paths from
 * `/`, `~` from home, `.`/`..` collapsed, a trailing slash ignored, and a bare
 * name read relative to the current directory. Never throws, never mutates.
 */
export function resolve(cwd: string, target: string, root: ContentDir): PathResolution {
	const source = target.trim();
	const fromHome = source === TILDE || source.startsWith(`${TILDE}${SEPARATOR}`);
	const absolute = fromHome || source.startsWith(SEPARATOR);
	const start: Position = absolute ? { current: root, ancestors: [] } : positionOf(cwd, root);
	const parts = fromHome ? segments(source.slice(TILDE.length)) : segments(source);

	return walk(start, parts, source);
}

/** The node a path points at, or `null` when nothing lives there. */
export function resolvePath(cwd: string, target: string, root: ContentDir): TreeNode | null {
	const resolved = resolve(cwd, target, root);
	return resolved.ok ? resolved.node : null;
}

/**
 * The files directly inside the directory `target` names, in the order the tree states them.
 * A target that is not a directory — missing, or a file — holds no files: a reader asks for
 * entries, so an absent directory is an empty list rather than a failure to report.
 */
export function filesIn(cwd: string, target: string, root: ContentDir): readonly ContentFile[] {
	const node = resolvePath(cwd, target, root);
	if (node === null || node.kind !== "dir") return [];

	return node.children.filter((child): child is ContentFile => child.kind === "file");
}

/**
 * Walks `parts` from `start`, one node at a time. `..` pops the ancestors this position
 * carries — the real chain from the root down to the working directory, not only the
 * segments this lookup happens to cross — so `resolve("/career/aurum", "..")` lands on
 * `/career` and a hop above the root stays at the root.
 */
function walk(start: Position, parts: readonly string[], source: string): PathResolution {
	const ancestors = [...start.ancestors];
	let current = start.current;

	for (const part of parts) {
		if (current.kind !== "dir") return { ok: false, error: `not a directory: ${current.path}` };

		if (part === PARENT) {
			const parent = ancestors.pop();
			if (parent !== undefined) current = parent;
			continue;
		}

		const child = current.children.find(node => node.name === part);
		if (child === undefined) return missing(source);
		ancestors.push(current);
		current = child;
	}

	return { ok: true, node: current };
}

/**
 * Where a relative path starts: the node `path` names, plus its ancestors. A path that
 * does not resolve — a `cwd` left behind by a deleted node — starts from the root.
 */
function positionOf(path: string, root: ContentDir): Position {
	const ancestors: TreeNode[] = [];
	let current: TreeNode = root;

	for (const part of segments(path)) {
		if (current.kind !== "dir") return { current: root, ancestors: [] };

		const child: TreeNode | undefined = current.children.find(node => node.name === part);
		if (child === undefined) return { current: root, ancestors: [] };

		ancestors.push(current);
		current = child;
	}

	return { current, ancestors };
}

function segments(path: string): readonly string[] {
	return path.split(SEPARATOR).filter(part => part.length > 0 && part !== SELF);
}

function missing(source: string): PathResolution {
	return { ok: false, error: `no such file or directory: ${source}` };
}
