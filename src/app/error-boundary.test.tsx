import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@testing-library/react";

import { ErrorBoundary } from "@/app/error-boundary";
import type { ErrorBoundaryState } from "@/app/error-boundary";

/**
 * The last line of defence around the terminal. React already logs the cause, so the
 * boundary owns exactly one thing: a plain sentence instead of a blank page.
 */

/** The whole fallback, as designed: one line, no stack, no retry. */
const BROKEN_MESSAGE = "something broke — reload";
const CHILD_TEXT = "the grid";
const CRASH_MESSAGE = "the grid could not be laid out";
/** The dark palette's background: the fallback sits on the terminal, not on a card. */
const DARK_BACKGROUND = "#07070a";
/** The grid's own stack, for the frame before any webfont lands. */
const MONO_STACK = "ui-monospace, SFMono-Regular, Menlo, monospace";

/** A child that fails on render: the one shape a boundary exists for. */
function Boom(): never {
	throw new Error(CRASH_MESSAGE);
}

function renderInBoundary(child: ReactNode): void {
	render(<ErrorBoundary>{child}</ErrorBoundary>);
}

beforeEach(() => {
	// React prints the caught error and its stack; the boundary's own output is what is under test.
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
	it("renders its children when nothing throws", () => {
		renderInBoundary(<p>{CHILD_TEXT}</p>);

		const testSubject = screen.getByText(CHILD_TEXT);

		expect(testSubject).toBeInTheDocument();
		expect(screen.queryByRole("main")).toBeNull();
	});

	it("renders the one plain sentence when a child throws", () => {
		renderInBoundary(<Boom />);

		const testSubject = screen.getByRole("main");

		expect(testSubject).toHaveTextContent(BROKEN_MESSAGE);
	});

	it("says nothing else: no stack and no retry", () => {
		renderInBoundary(<Boom />);

		const testSubject = screen.getByRole("main");

		expect(testSubject.textContent).toBe(BROKEN_MESSAGE);
		expect(screen.queryByText(CHILD_TEXT)).toBeNull();
	});

	it("leaves the fallback wearing the terminal's own type", () => {
		renderInBoundary(<Boom />);

		const testSubject = screen.getByRole("main");

		// The dark palette's own background and the grid's mono stack: the fallback is the
		// terminal with nothing in it, not app chrome.
		expect(testSubject.style.backgroundColor).toBe(DARK_BACKGROUND);
		expect(testSubject.style.fontFamily).toBe(MONO_STACK);
		expect(testSubject.style.height).toBe("100%");
	});
});

describe("getDerivedStateFromError", () => {
	const cases: readonly {
		readonly name: string;
		readonly thrown: unknown;
		readonly message: string;
	}[] = [
		{ name: "an Error", thrown: new Error(CRASH_MESSAGE), message: CRASH_MESSAGE },
		{ name: "a bare string", thrown: CRASH_MESSAGE, message: CRASH_MESSAGE },
		{ name: "an object with no message", thrown: { code: 500 }, message: "[object Object]" }
	];

	it.each(cases)("keeps $name as an Error", ({ thrown, message }) => {
		const testSubject: ErrorBoundaryState = ErrorBoundary.getDerivedStateFromError(thrown);

		expect(testSubject.error).toBeInstanceOf(Error);
		expect(testSubject.error?.message).toBe(message);
	});

	it("does not alias the Error it was handed", () => {
		const thrown = new Error(CRASH_MESSAGE);

		const testSubject = ErrorBoundary.getDerivedStateFromError(thrown);

		expect(testSubject.error).toBe(thrown);
	});
});
