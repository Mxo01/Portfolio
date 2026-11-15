import { tokenize } from "@/lib/terminal/tokenize";

const testSubject = tokenize;

interface TokenCase {
	readonly name: string;
	readonly input: string;
	readonly expected: readonly string[];
}

const NO_TOKENS: readonly string[] = [];
const EMPTY_TOKEN: readonly string[] = [""];

const CASES: readonly TokenCase[] = [
	{ name: "an empty line", input: "", expected: NO_TOKENS },
	{ name: "whitespace only", input: "   ", expected: NO_TOKENS },
	{ name: "one word", input: "ls", expected: ["ls"] },
	{
		name: "several words on any whitespace",
		input: "  cd \t projects  ",
		expected: ["cd", "projects"]
	},
	{ name: "flags stay whole", input: "ls -la", expected: ["ls", "-la"] },
	{
		name: "a single-quoted group keeps its space",
		input: "cd 'my docs'",
		expected: ["cd", "my docs"]
	},
	{
		name: "a double-quoted group keeps its space",
		input: 'echo "hello world"',
		expected: ["echo", "hello world"]
	},
	{
		name: "an escaped quote inside double quotes",
		input: '"say \\"hi\\""',
		expected: ['say "hi"']
	},
	{ name: "a backslash inside single quotes is literal", input: "'a\\b'", expected: ["a\\b"] },
	{ name: "an unbalanced double quote runs to the end", input: 'ls "foo', expected: ["ls", "foo"] },
	{
		name: "an unbalanced single quote runs to the end",
		input: "cd 'my docs",
		expected: ["cd", "my docs"]
	},
	{ name: "an empty quoted token is still a token", input: "''", expected: EMPTY_TOKEN },
	{ name: "quotes concatenate with the bare text around them", input: 'a" "b', expected: ["a b"] },
	{ name: "a trailing backslash is literal", input: "ls \\", expected: ["ls", "\\"] },
	{ name: "an escape at the end of double quotes is literal", input: '"a\\', expected: ["a\\"] },
	{ name: "a single quote inside double quotes is literal", input: '"it\'s"', expected: ["it's"] },
	{
		name: "a double quote inside single quotes is literal",
		input: "'say \"hi\"'",
		expected: ['say "hi"']
	},
	{ name: "an escaped space is one token", input: "cd my\\ docs", expected: ["cd", "my docs"] },
	{
		name: "an escaped word character loses the backslash",
		input: "echo \\$HOME",
		expected: ["echo", "$HOME"]
	},
	{ name: "an empty token survives between words", input: "a '' b", expected: ["a", "", "b"] }
];

describe("tokenize", () => {
	it.each(CASES)("$name", ({ input, expected }) => {
		// WHEN
		const tokens = testSubject(input);

		// THEN
		expect(tokens).toEqual(expected);
	});

	it("never throws while a quote is still open", () => {
		// GIVEN a half-typed line
		const halfTyped = 'cat "the';

		// WHEN
		const tokens = testSubject(halfTyped);

		// THEN
		expect(tokens).toEqual(["cat", "the"]);
	});
});
