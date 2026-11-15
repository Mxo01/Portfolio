import { filesIn, resolvePath, resolve } from "@/lib/terminal/path";
import type { PathResolution } from "@/lib/terminal/path";
import type { ContentDir } from "@/lib/terminal/types";
import { fixtureDeepTree, fixtureTree } from "@/test/fixtures/terminal";

const testSubject = resolve;
const resolveNode = resolvePath;
const root = fixtureTree();
/** The depth cases: the projection builds no directory below its groups. */
const deep = fixtureDeepTree();

/** The groups whose entries the projection writes as files, never as directories. */
const ENTRY_GROUPS: readonly string[] = ["/career", "/projects"];

interface PathCase {
	readonly name: string;
	readonly cwd: string;
	readonly target: string;
	readonly expected: PathResolution;
	readonly tree?: ContentDir;
}

function found(path: string, tree: ContentDir = root): PathResolution {
	const node = resolvePath("/", path, tree);
	if (node === null) throw new Error(`fixture is missing ${path}`);
	return { ok: true, node };
}

function missing(source: string): PathResolution {
	return { ok: false, error: `no such file or directory: ${source}` };
}

function notADirectory(path: string): PathResolution {
	return { ok: false, error: `not a directory: ${path}` };
}

const CASES: readonly PathCase[] = [
	{ name: "the root", cwd: "/", target: "/", expected: found("/") },
	{ name: "the root through a tilde", cwd: "/career", target: "~", expected: found("/") },
	{
		name: "home from anywhere",
		cwd: "/notes/2024",
		target: "~/contact",
		expected: found("/contact", deep),
		tree: deep
	},
	{ name: "the current directory", cwd: "/about", target: ".", expected: found("/about") },
	{ name: "the root's own parent", cwd: "/", target: "..", expected: found("/") },
	{
		name: "an absolute path from elsewhere",
		cwd: "/projects",
		target: "/career/aurum",
		expected: found("/career/aurum")
	},
	{ name: "a trailing slash is ignored", cwd: "/", target: "/career/", expected: found("/career") },
	{
		name: "a bare name read from the current directory",
		cwd: "/career",
		target: "aurum",
		expected: found("/career/aurum")
	},
	{ name: "a file", cwd: "/", target: "/cv.pdf", expected: found("/cv.pdf") },
	{
		name: "an empty target is the current directory",
		cwd: "/career",
		target: "",
		expected: found("/career")
	},
	{
		name: "collapsed dots inside a path",
		cwd: "/",
		target: "/career/./aurum",
		expected: found("/career/aurum")
	},
	{
		name: "a path that walks back through a name",
		cwd: "/",
		target: "/career/../projects",
		expected: found("/projects")
	},
	{
		name: "climbing past the root on an absolute path",
		cwd: "/",
		target: "/career/../..",
		expected: found("/")
	},
	{
		name: "surrounding whitespace is trimmed",
		cwd: "/",
		target: "  career  ",
		expected: found("/career")
	},
	{
		name: "a current directory that does not exist starts from the root",
		cwd: "/nope",
		target: "contact",
		expected: found("/contact")
	},
	{
		name: "a current directory below a file starts from the root",
		cwd: "/cv.pdf/x",
		target: "contact",
		expected: found("/contact")
	},
	{ name: "a name that is not there", cwd: "/", target: "/nope", expected: missing("/nope") },
	{
		name: "a bare name the current directory does not hold",
		cwd: "/career",
		target: "summary",
		expected: missing("summary")
	},
	{
		name: "a path that continues past a file",
		cwd: "/",
		target: "/cv.pdf/x",
		expected: notADirectory("/cv.pdf")
	},
	{
		name: "a parent hop taken from a file",
		cwd: "/",
		target: "/cv.pdf/..",
		expected: notADirectory("/cv.pdf")
	},
	{
		name: "a nested path whose middle is missing",
		cwd: "/",
		target: "/nope/x",
		expected: missing("/nope/x")
	}
];

const UP_CASES: readonly PathCase[] = [
	{ name: "`..` above the root stays at the root", cwd: "/", target: "..", expected: found("/") },
	{
		name: "a sibling reached through the parent",
		cwd: "/notes/2024",
		target: "../today",
		expected: found("/notes/today", deep),
		tree: deep
	},
	{
		name: "climbing past the root from a working directory",
		cwd: "/notes/2024",
		target: "../../../contact",
		expected: found("/contact", deep),
		tree: deep
	}
];

describe("resolve", () => {
	it.each(CASES)("$name", ({ cwd, target, expected, tree }) => {
		// WHEN
		const resolution = testSubject(cwd, target, tree ?? root);

		// THEN
		expect(resolution).toEqual(expected);
	});
});

describe("resolvePath", () => {
	it.each(CASES)("$name", ({ cwd, target, expected, tree }) => {
		// WHEN
		const node = resolveNode(cwd, target, tree ?? root);

		// THEN
		expect(node === null ? null : node.path).toEqual(expected.ok ? expected.node.path : null);
	});
});

describe("filesIn", () => {
	const cases: readonly {
		readonly name: string;
		readonly cwd: string;
		readonly target: string;
		readonly expected: readonly string[];
		readonly tree?: ContentDir;
	}[] = [
		{
			name: "a directory of files",
			cwd: "/",
			target: "/about",
			expected: ["/about/profile", "/about/summary"]
		},
		{
			name: "a group of entry files",
			cwd: "/",
			target: "/career",
			expected: ["/career/aurum", "/career/fitcheck"]
		},
		{
			name: "a directory reached from the working directory",
			cwd: "/notes",
			target: "2024",
			expected: ["/notes/2024/june"],
			tree: deep
		},
		{
			name: "a directory holding a directory and a file",
			cwd: "/",
			target: "/notes",
			expected: ["/notes/today"],
			tree: deep
		},
		{ name: "a file", cwd: "/", target: "/cv.pdf", expected: [] },
		{ name: "a path that is not there", cwd: "/", target: "/nope", expected: [] }
	];

	it.each(cases)("lists the files of $name", ({ cwd, target, expected, tree }) => {
		// WHEN
		const testSubject = filesIn(cwd, target, tree ?? root);

		// THEN only the files it holds, and nothing when it is not a directory
		expect(testSubject.map(node => node.path)).toEqual(expected);
	});
});

describe("walking up", () => {
	it("resolves `..` from a nested working directory to its parent", () => {
		// WHEN
		const resolution = testSubject("/notes/2024", "..", deep);

		// THEN
		expect(resolution).toEqual(found("/notes", deep));
	});

	it("resolves a path that climbs out of the working directory", () => {
		// WHEN
		const resolution = testSubject("/about", "../contact", root);

		// THEN
		expect(resolution).toEqual(found("/contact"));
	});

	it.each(UP_CASES)("$name", ({ cwd, target, expected, tree }) => {
		// WHEN
		const resolution = testSubject(cwd, target, tree ?? root);

		// THEN
		expect(resolution).toEqual(expected);
	});
});

describe("the fixture tree", () => {
	it("holds every career and project entry as a file, as the projection builds it", () => {
		// GIVEN the groups the projection fills with entry files
		const directories = ENTRY_GROUPS.flatMap(group => {
			const node = resolvePath("/", group, root);
			if (node === null || node.kind !== "dir") throw new Error(`no group ${group}`);

			return node.children.filter(child => child.kind === "dir").map(child => child.path);
		});

		// THEN nothing below them is a directory, so a case cannot lean on a shape the real tree lacks
		expect(directories).toEqual([]);
	});
});
