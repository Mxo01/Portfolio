import { complete } from "@/lib/terminal/completion";
import type { ContentDir, ShellSession } from "@/lib/terminal/types";
import {
	fixtureAmbiguousTree,
	fixtureContext,
	fixtureSession,
	fixtureTree
} from "@/test/fixtures/terminal";

const testSubject = complete;
const root = fixtureTree();
const ambiguous = fixtureAmbiguousTree();

const ALL_COMMANDS: readonly string[] = [
	"cat",
	"cd",
	"clear",
	"help",
	"ls",
	"pwd",
	"theme",
	"tree",
	"welcome",
	"whoami"
];

interface CompleteCase {
	readonly name: string;
	readonly draft: string;
	readonly cwd?: string;
	readonly tree?: ContentDir;
	readonly expected: { readonly value: string; readonly candidates: readonly string[] };
}

function run(kind: Pick<CompleteCase, "draft" | "cwd">): ShellSession {
	return fixtureSession({ draft: kind.draft, cwd: kind.cwd ?? "/" });
}

const COMMAND_CASES: readonly CompleteCase[] = [
	{
		name: "completes a lone command",
		draft: "he",
		expected: { value: "help", candidates: ["help"] }
	},
	{
		name: "widens to what several commands share",
		draft: "c",
		expected: { value: "c", candidates: ["cat", "cd", "clear"] }
	},
	{
		name: "leaves a line no command matches alone",
		draft: "zz",
		expected: { value: "zz", candidates: [] }
	},
	{
		name: "lists every command from an empty line",
		draft: "",
		expected: {
			value: "",
			candidates: ALL_COMMANDS
		}
	}
];

const NODE_CASES: readonly CompleteCase[] = [
	{
		name: "completes a relative path in the first slot",
		draft: "./car",
		expected: { value: "./career", candidates: ["./career/"] }
	},
	{
		name: "leaves a bare name in the first slot alone: it is a command",
		draft: "car",
		expected: { value: "car", candidates: [] }
	},
	{
		name: "opens the level below a listing command",
		draft: "ls car",
		expected: { value: "ls career/", candidates: ["career/"] }
	},
	{
		name: "keeps a directory bare for a command that takes it as typed",
		draft: "cd car",
		expected: { value: "cd career", candidates: ["career/"] }
	},
	{
		name: "keeps a file bare",
		draft: "cat cv",
		expected: { value: "cat cv.pdf", candidates: ["cv.pdf"] }
	},
	{
		name: "expands home to the level below it",
		draft: "cd ~/",
		expected: {
			value: "cd ~/",
			candidates: [
				"~/about/",
				"~/career/",
				"~/contact",
				"~/cv.pdf",
				"~/education/",
				"~/export_cv.sh",
				"~/projects/"
			]
		}
	},
	{
		name: "completes an absolute path",
		draft: "/car",
		expected: { value: "/career", candidates: ["/career/"] }
	},
	{
		name: "replaces the last token and keeps what came before",
		draft: "cat -a car",
		expected: { value: "cat -a career", candidates: ["career/"] }
	},
	{
		name: "replaces a quoted token, keeping the quotes it was typed in",
		draft: 'cat "car"',
		expected: { value: 'cat "career"', candidates: ["career/"] }
	},
	{
		name: "keeps a single-quoted token single-quoted",
		draft: "cat 'car'",
		expected: { value: "cat 'career'", candidates: ["career/"] }
	},
	{
		name: "leaves a quote the visitor has not closed open",
		draft: 'cat "car',
		expected: { value: 'cat "career', candidates: ["career/"] }
	},
	{
		name: "leaves a directory with nothing to complete unchanged",
		draft: "cat about/",
		expected: {
			value: "cat about/",
			candidates: ["about/profile", "about/summary"]
		}
	},
	{
		name: "leaves a name nothing matches alone",
		draft: "cat nope",
		expected: { value: "cat nope", candidates: [] }
	},
	{
		name: "leaves a path through a missing directory alone",
		draft: "cat nope/x",
		expected: { value: "cat nope/x", candidates: [] }
	},
	{
		name: "leaves a path through a file alone",
		draft: "cat cv.pdf/x",
		expected: { value: "cat cv.pdf/x", candidates: [] }
	},
	{
		name: "completes from the current directory",
		draft: "cat prof",
		cwd: "/about",
		expected: { value: "cat profile", candidates: ["profile"] }
	},
	{
		name: "opens a name that is both a directory and a file",
		draft: "cat notes",
		tree: ambiguous,
		expected: { value: "cat notes/", candidates: ["notes.txt", "notes/"] }
	},
	{
		name: "keeps a shared name bare when it names a file",
		draft: "cat readme",
		tree: ambiguous,
		expected: { value: "cat readme", candidates: ["readme", "readme.md"] }
	},
	{
		name: "keeps an ambiguous prefix bare when nothing has that name",
		draft: "cat c",
		expected: { value: "cat c", candidates: ["career/", "contact", "cv.pdf"] }
	},
	{
		name: "lists a directory from a finished listing line",
		draft: "ls ",
		expected: {
			value: "ls ",
			candidates: [
				"about/",
				"career/",
				"contact",
				"cv.pdf",
				"education/",
				"export_cv.sh",
				"projects/"
			]
		}
	},
	{
		name: "leaves a lone file with no directory to open",
		draft: "ls zzz",
		tree: ambiguous,
		expected: { value: "ls zzz", candidates: ["zzz"] }
	}
];

describe("complete", () => {
	it.each(COMMAND_CASES)("$name with the tree loaded", ({ draft, cwd, tree, expected }) => {
		// WHEN
		const completion = testSubject(run({ draft, cwd }), tree ?? root);

		// THEN
		expect(completion).toEqual(expected);
	});

	it.each(COMMAND_CASES)("$name before the CV has loaded", ({ draft, cwd, expected }) => {
		// WHEN
		const completion = testSubject(run({ draft, cwd }), null);

		// THEN
		expect(completion).toEqual(expected);
	});

	it.each(NODE_CASES)("$name", ({ draft, cwd, tree, expected }) => {
		// WHEN
		const completion = testSubject(run({ draft, cwd }), tree ?? root);

		// THEN
		expect(completion).toEqual(expected);
	});

	it("offers only commands for a node token while the tree is missing", () => {
		// WHEN
		const completion = testSubject(fixtureSession({ draft: "cat car" }), null);

		// THEN
		expect(completion).toEqual({ value: "cat car", candidates: [] });
	});

	it("hands the line back untouched when nothing matches", () => {
		// GIVEN
		const session = fixtureSession({ draft: "cat nope" });

		// WHEN
		const completion = testSubject(session, root);

		// THEN
		expect(completion.value).toBe(session.draft);
	});

	it("reads the tree out of the loaded context", () => {
		// GIVEN a context that has arrived
		const context = fixtureContext();

		// WHEN
		const completion = testSubject(fixtureSession({ draft: "cat cv" }), context.root);

		// THEN
		expect(completion.candidates).toEqual(["cv.pdf"]);
	});
});
