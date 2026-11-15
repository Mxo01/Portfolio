import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen } from "@testing-library/react";

import { App } from "@/app/app";

/** What the screen under test was handed; the screen itself is another file's proof. */
const screenProps = vi.hoisted(() => [] as { readonly cvUrl: string }[]);

vi.mock("@/features/terminal", () => ({
	TerminalScreen: (props: { readonly cvUrl: string }) => {
		screenProps.push(props);
		return createElement("div", { "data-testid": "terminal-screen" });
	}
}));

/**
 * The document around the grid. The terminal is the page, so this file is the only thing
 * React renders beside the canvas: the heading a screen reader reads, the fallback a
 * browser without JavaScript prints, and the one asset URL the app — not the view — owns.
 */

/**
 * Under vitest `BASE_URL` is `/`; the deployed build prefixes it with the Pages path, so
 * the URL is asserted through the same base rather than through a frozen string.
 */
const CV_PATH = `${import.meta.env.BASE_URL}cv/mario-dimodica-cv.pdf`;
const CONTACT_FACTS = [
	"Mario Di Modica — Software Engineer, Pisa, Italy.",
	"Email: mariodimodica.01@gmail.com",
	"GitHub: https://github.com/Mxo01"
];

function renderApp(): void {
	render(createElement(App));
}

beforeEach(() => {
	screenProps.length = 0;
});

describe("App", () => {
	it("renders the document's only heading", () => {
		renderApp();

		const testSubject = screen.getByRole("heading", { level: 1 });

		expect(testSubject).toHaveTextContent("Mario Di Modica — Software Engineer");
	});

	it("keeps that heading out of the grid", () => {
		renderApp();

		const testSubject = screen.getByRole("heading", { level: 1 });

		expect(testSubject).toHaveStyle({ position: "absolute", clipPath: "inset(50%)" });
	});

	it("prints the facts for a browser that ran no JavaScript", () => {
		renderApp();

		const testSubject = document.querySelector("noscript");

		expect(testSubject).not.toBeNull();
		for (const fact of CONTACT_FACTS) {
			expect(testSubject?.textContent).toContain(fact);
		}
	});

	it("points the no-script fallback at the same published CV", () => {
		renderApp();

		const testSubject = document.querySelector("noscript");

		expect(testSubject?.textContent).toContain(CV_PATH);
	});

	it("hands the screen the published CV URL", () => {
		renderApp();

		const testSubject = screenProps.at(-1);

		expect(testSubject).toEqual({ cvUrl: CV_PATH });
		expect(screen.getByTestId("terminal-screen")).toBeInTheDocument();
	});

	it("renders nothing around the terminal", () => {
		renderApp();

		// No header, footer, navigation or toggle: the heading and the fallback are all the
		// shell cannot say for itself.
		expect(screen.queryByRole("banner")).toBeNull();
		expect(screen.queryByRole("contentinfo")).toBeNull();
		expect(screen.queryByRole("navigation")).toBeNull();
		expect(screen.queryByRole("button")).toBeNull();
	});
});
