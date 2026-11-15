import { execute } from "@/lib/terminal/execute";
import { dim, error } from "@/lib/terminal/lines";
import { EXPORT_CV_SCRIPT } from "@/lib/terminal/script-data";
import type { Line, ShellContext, ShellResult, ShellSession } from "@/lib/terminal/types";
import { fixtureContext, fixtureDir, fixtureFile, fixtureSession } from "@/test/fixtures/terminal";

const testSubject = execute;

const UNKNOWN_HINT = "type 'help'";
const OPERATOR_HINT = "run one command at a time";
const SCRIPT_TOKEN = "export_cv.sh";
const SCRIPT_MODE = "script" as const;

function failure(message: string): readonly Line[] {
	return [error(message), dim(UNKNOWN_HINT)];
}

function onlyLine(result: ShellResult): Line | undefined {
	return result.lines[0];
}

function withContext(
	line: string,
	session: ShellSession,
	ctx: ShellContext = fixtureContext()
): ShellResult {
	return testSubject(line, session, ctx);
}

describe("execute", () => {
	it.each([
		{ name: "an empty line", input: "" },
		{ name: "a line of spaces", input: "   " }
	])("prints nothing for $name", ({ input }) => {
		// WHEN
		const result = withContext(input, fixtureSession());

		// THEN
		expect(result.lines).toEqual([]);
		expect(result.session.draft).toBe("");
		expect(result.session.historyIndex).toBeNull();
	});

	it("records an empty line nowhere", () => {
		// WHEN
		const result = withContext("   ", fixtureSession());

		// THEN
		expect(result.session.history).toEqual([]);
	});

	it("runs the command the line names", () => {
		// GIVEN
		const session = fixtureSession({ cwd: "/career" });

		// WHEN
		const result = withContext("pwd", session);

		// THEN
		expect(result.lines).toEqual(["/career"]);
	});

	it("records the command on the session", () => {
		// WHEN
		const result = withContext("pwd", fixtureSession());

		// THEN
		expect(result.session.history).toEqual(["pwd"]);
	});

	it("settles the line: empty draft, off the history, menu closed", () => {
		// GIVEN a line typed over a browse position
		const session = fixtureSession({ history: ["pwd"], historyIndex: 0, draft: "pwd" });

		// WHEN
		const result = withContext("pwd", session);

		// THEN
		expect(result.session).toEqual({
			...session,
			draft: "",
			historyIndex: null,
			history: ["pwd"]
		});
	});

	it("refuses a name the table and the tree both lack", () => {
		// WHEN
		const result = withContext("nope", fixtureSession());

		// THEN
		expect(result.lines).toEqual(failure("unknown command: nope"));
	});

	it("prefers the command table over a node of the same name", () => {
		// GIVEN a tree that also holds a file called `pwd`
		const shadowed = fixtureDir("/", [fixtureFile("/pwd", [])]);

		// WHEN
		const result = withContext("pwd", fixtureSession(), fixtureContext({ root: shadowed }));

		// THEN
		expect(result.lines).toEqual(["/"]);
	});

	it("reads a bare name as a file when no command claims it", () => {
		// WHEN
		const result = withContext("cv.pdf", fixtureSession());

		// THEN
		expect(result.lines).toEqual([error("permission denied: cv.pdf")]);
	});

	it("refuses a directory as a program", () => {
		// WHEN
		const result = withContext("career", fixtureSession());

		// THEN
		expect(result.lines).toEqual([error("permission denied: career")]);
	});

	it.each([
		{ name: "written from the root", input: "/export_cv.sh" },
		{ name: "written from here", input: "./export_cv.sh" },
		{ name: "written as a bare name", input: SCRIPT_TOKEN }
	])("runs the executable $name", ({ input }) => {
		// WHEN
		const result = withContext(input, fixtureSession());

		// THEN
		expect(result.script).toBe(EXPORT_CV_SCRIPT);
		expect(result.session.mode).toBe(SCRIPT_MODE);
		expect(result.lines).toEqual([]);
	});

	it("keeps the executable session's history", () => {
		// WHEN
		const result = withContext(`./${SCRIPT_TOKEN}`, fixtureSession());

		// THEN
		expect(result.session.history).toEqual([`./${SCRIPT_TOKEN}`]);
	});

	it.each([
		{ name: "a path that is not there", input: "./nope", message: "no such file: ./nope" },
		{ name: "an absolute path that is not there", input: "/nope", message: "no such file: /nope" },
		{ name: "a file addressed as a path", input: "/cv.pdf", message: "permission denied: /cv.pdf" },
		{ name: "the current directory", input: ".", message: "permission denied: ." }
	])("answers $name from the filesystem alone", ({ input, message }) => {
		// WHEN
		const result = withContext(input, fixtureSession());

		// THEN
		expect(result.lines).toEqual([error(message)]);
	});

	it("does not fall back to the command table for a path", () => {
		// GIVEN a tree without the executable
		const bare = fixtureDir("/", []);

		// WHEN
		const result = withContext(`./help`, fixtureSession(), fixtureContext({ root: bare }));

		// THEN
		expect(result.lines).toEqual([error("no such file: ./help")]);
	});

	it("keeps the working directory a command moved to", () => {
		// WHEN
		const result = withContext("cd career", fixtureSession());

		// THEN
		expect(result.session.cwd).toBe("/career");
	});

	describe("a line carrying more than the command reads", () => {
		const extra: readonly {
			readonly name: string;
			readonly line: string;
			readonly usage: string;
		}[] = [
			{ name: "help", line: "help cd ls", usage: "help <command>" },
			{ name: "ls", line: "ls career projects", usage: "ls [path]" },
			{ name: "cd", line: "cd career projects", usage: "cd <path>" },
			{ name: "cat", line: "cat cv.pdf about", usage: "cat <path>" },
			{ name: "tree", line: "tree .", usage: "tree" },
			{ name: "pwd", line: "pwd -P", usage: "pwd" },
			{ name: "whoami", line: "whoami now", usage: "whoami" },
			{ name: "theme", line: "theme light", usage: "theme" },
			{ name: "welcome", line: "welcome again", usage: "welcome" },
			{ name: "clear", line: "clear all", usage: "clear" }
		];

		it.each(extra)("refuses $name with its usage line", ({ name, line, usage }) => {
			// WHEN
			const result = withContext(line, fixtureSession());

			// THEN the refusal names the command, and the way to type it comes under it
			expect(result.lines).toEqual([error(`${name}: too many arguments`), dim(`usage: ${usage}`)]);
		});

		it("runs nothing and keeps the working directory it had", () => {
			// GIVEN
			const session = fixtureSession({ cwd: "/" });

			// WHEN a second path is the canonical case: two directories, one command
			const result = withContext("cd career projects", session);

			// THEN the line is on the history, and the shell did not half of it
			expect(result.session).toEqual({ ...session, history: ["cd career projects"] });
			expect(result.session.cwd).toBe("/");
		});
	});

	describe("a line chaining commands", () => {
		const chained: readonly {
			readonly name: string;
			readonly line: string;
			readonly operator: string;
		}[] = [
			{ name: "and", line: "cd career && ls", operator: "&&" },
			{ name: "or", line: "cd career || ls", operator: "||" },
			{ name: "pipe", line: "ls | cat", operator: "|" },
			{ name: "semicolon", line: "pwd ; ls", operator: ";" },
			{ name: "redirect", line: "tree > out", operator: ">" },
			{ name: "append", line: "tree >> out", operator: ">>" },
			{ name: "background", line: "pwd &", operator: "&" },
			{ name: "variable", line: "cd $HOME", operator: "$HOME" }
		];

		it.each(chained)("refuses $name with the operator it found", ({ line, operator }) => {
			// WHEN
			const result = withContext(line, fixtureSession());

			// THEN
			expect(result.lines).toEqual([
				error(`unsupported operator: ${operator}`),
				dim(OPERATOR_HINT)
			]);
		});

		it("runs no part of the line, the first command included", () => {
			// GIVEN
			const session = fixtureSession({ cwd: "/" });

			// WHEN
			const result = withContext("cd career && ls", session);

			// THEN nothing moved, and nothing was listed
			expect(result.session.cwd).toBe("/");
			expect(result.session.history).toEqual(["cd career && ls"]);
		});

		it("keeps an operator inside quotes a literal argument", () => {
			// WHEN
			const result = withContext('cat "a && b"', fixtureSession());

			// THEN the token is one file name, so the tree answers it and no operator was read
			expect(result.lines).toEqual([error("no such file or directory: a && b"), dim(UNKNOWN_HINT)]);
		});
	});

	describe("before the CV has loaded", () => {
		it.each([{ name: "a path", input: "./career", message: "no such file: ./career" }])(
			"reports $name as missing",
			({ input, message }) => {
				// WHEN
				const result = withContext(input, fixtureSession(), fixtureContext({ root: null }));

				// THEN
				expect(result.lines).toEqual([error(message)]);
			}
		);

		it("declares a bare file unknown, because the tree cannot be walked", () => {
			// WHEN
			const result = withContext("cv.pdf", fixtureSession(), fixtureContext({ root: null }));

			// THEN
			expect(result.lines).toEqual(failure("unknown command: cv.pdf"));
		});

		it("still runs a command that needs no tree", () => {
			// WHEN
			const result = withContext("pwd", fixtureSession(), fixtureContext({ root: null }));

			// THEN
			expect(onlyLine(result)).toBe("/");
		});
	});
});
