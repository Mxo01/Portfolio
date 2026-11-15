import type { ContentDir } from "@/lib/terminal/types";
import { CV_SECTIONS } from "@/test/fixtures/cv";
import * as content from "./index";
import { buildContent } from "./tree";

/** The module under test is the barrel the terminal mounts its content from. */
const testSubject = content;

/** The root the shell resolves every path from. */
const HOME = "/";

describe("the content barrel", () => {
	it("re-exports the projection itself, not a wrapper around it", () => {
		expect(testSubject.buildContent).toBe(buildContent);
	});

	it("publishes the projection and nothing else", () => {
		expect(Object.keys(testSubject)).toEqual(["buildContent"]);
	});

	it("mounts the same root the projection builds", () => {
		const root: ContentDir = testSubject.buildContent(CV_SECTIONS);

		expect(root).toEqual(buildContent(CV_SECTIONS));
	});

	it("names that root as the shell's home", () => {
		const root = testSubject.buildContent(CV_SECTIONS);

		expect(root).toMatchObject({ kind: "dir", name: HOME, path: HOME });
		expect(root.children.map(child => child.path)).toEqual([
			"/about",
			"/career",
			"/education",
			"/projects",
			"/contact",
			"/cv.pdf",
			"/export_cv.sh"
		]);
	});
});
