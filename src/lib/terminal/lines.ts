import type { Line, Span, Tone } from "./types";

/** One run of text in one register. */
export function span(text: string, tone: Tone = "plain"): Span {
	return { text, tone };
}

/** A line painted entirely in one register. */
export function withTone(tone: Tone, text: string): Line {
	return [span(text, tone)];
}

/** The common case stays a bare string: a missing tone already means `plain`. */
export const plain = (text: string): Line => text;
export const dim = (text: string): Line => withTone("dim", text);
export const heading = (text: string): Line => withTone("heading", text);
export const accent = (text: string): Line => withTone("accent", text);
export const error = (text: string): Line => withTone("error", text);

/** A breath between blocks. */
export const blank = (): Line => "";
