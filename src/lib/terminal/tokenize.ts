const QUOTES = new Set(["'", '"']);
const ESCAPE = "\\";
const WHITESPACE = /\s/;

/**
 * Splits a command line the way a POSIX shell roughly does: whitespace
 * separates, `'…'` and `"…"` group, and `\` takes the next character literally.
 * An unbalanced quote runs to the end of the line: tokenizing must never throw
 * while the visitor is still typing.
 */
export function tokenize(input: string): readonly string[] {
	const tokens: string[] = [];

	let current = "";
	let started = false;
	let quote: string | null = null;
	let index = 0;

	while (index < input.length) {
		const char = input.charAt(index);
		const next = input.charAt(index + 1);
		const hasNext = next.length > 0;

		if (quote !== null) {
			if (char === ESCAPE && quote === '"' && hasNext) {
				current += next;
				index += 2;
				continue;
			}
			if (char === quote) {
				quote = null;
				index += 1;
				continue;
			}
			current += char;
			index += 1;
			continue;
		}

		if (QUOTES.has(char)) {
			quote = char;
			started = true;
			index += 1;
			continue;
		}

		if (char === ESCAPE && hasNext) {
			current += next;
			started = true;
			index += 2;
			continue;
		}

		if (WHITESPACE.test(char)) {
			if (started) tokens.push(current);
			current = "";
			started = false;
			index += 1;
			continue;
		}

		current += char;
		started = true;
		index += 1;
	}

	if (started) tokens.push(current);

	return tokens;
}
