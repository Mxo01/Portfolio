import {
	backspace,
	cancel,
	clearLine,
	closeMenu,
	completeDraft,
	cycleDraft,
	deleteWord,
	emptyEditor,
	historyDown,
	historyUp,
	submit,
	typeText
} from "@/features/terminal/line-editor";
import type { EditorState } from "@/features/terminal/line-editor";
import type { ShellSession } from "@/lib/terminal/types";
import { fixtureContext, fixtureMenu, fixtureSession, fixtureTree } from "@/test/fixtures/terminal";

const root = fixtureTree();
const context = fixtureContext();

const DRAFT = "cat cv";
const HISTORY: readonly string[] = ["pwd", "ls career"];

function editorOn(session: Partial<ShellSession> = {}, stashedDraft = ""): EditorState {
	return { session: fixtureSession(session), stashedDraft };
}

describe("emptyEditor", () => {
	it("starts at the tree root with nothing typed and nothing stashed", () => {
		// WHEN
		const editor = emptyEditor();

		// THEN
		expect(editor).toEqual({
			session: { cwd: "/", history: [], historyIndex: null, draft: "" },
			stashedDraft: ""
		});
	});
});

describe("typeText", () => {
	it("adds nothing for an empty piece of text", () => {
		// GIVEN
		const editor = emptyEditor();

		// WHEN
		const next = typeText(editor, "");

		// THEN
		expect(next).toBe(editor);
	});

	it("appends the text and leaves history browsing", () => {
		// GIVEN a browse position and an open menu
		const editor = editorOn({
			history: HISTORY,
			historyIndex: 1,
			draft: "ls",
			completion: fixtureMenu(["ls"], "l", 0)
		});

		// WHEN
		const next = typeText(editor, " career");

		// THEN
		expect(next.session.draft).toBe("ls career");
		expect(next.session.historyIndex).toBeNull();
		expect(next.session.completion).toBeUndefined();
	});
});

describe("backspace", () => {
	it("does nothing on an empty draft", () => {
		// GIVEN
		const editor = editorOn();

		// WHEN
		const next = backspace(editor);

		// THEN
		expect(next).toBe(editor);
	});

	it("drops the last character", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT });

		// WHEN
		const next = backspace(editor);

		// THEN
		expect(next.session.draft).toBe("cat c");
	});

	it("closes an open menu", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT, completion: fixtureMenu(["cv.pdf"], "cv") });

		// WHEN
		const next = backspace(editor);

		// THEN
		expect(next.session.completion).toBeUndefined();
	});
});

describe("deleteWord", () => {
	it.each([
		{ name: "the word behind the cursor", draft: DRAFT, expected: "cat " },
		{ name: "the word and the whitespace after it", draft: "cat cv ", expected: "cat " },
		{ name: "a run of spaces alone", draft: "   ", expected: "" },
		{ name: "an emoji as one character", draft: "hi 😂", expected: "hi " },
		{ name: "an accented word without cutting it", draft: "café", expected: "" }
	])("deletes $name", ({ draft, expected }) => {
		// GIVEN
		const editor = editorOn({ draft });

		// WHEN
		const next = deleteWord(editor);

		// THEN
		expect(next.session.draft).toBe(expected);
	});

	it("hands an empty draft back unchanged", () => {
		// GIVEN
		const editor = editorOn();

		// WHEN
		const next = deleteWord(editor);

		// THEN
		expect(next).toBe(editor);
	});

	it("closes an open menu", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT, completion: fixtureMenu(["cv.pdf"], "cv") });

		// WHEN
		const next = deleteWord(editor);

		// THEN
		expect(next.session.completion).toBeUndefined();
	});
});

describe("clearLine", () => {
	it("does nothing when there is no line and no menu", () => {
		// GIVEN
		const editor = editorOn({ history: HISTORY });

		// WHEN
		const next = clearLine(editor);

		// THEN
		expect(next).toBe(editor);
	});

	it("empties the draft and keeps the history", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT, history: HISTORY });

		// WHEN
		const next = clearLine(editor);

		// THEN
		expect(next.session.draft).toBe("");
		expect(next.session.history).toEqual(HISTORY);
	});

	it("closes a menu left on an empty draft", () => {
		// GIVEN
		const editor = editorOn({ completion: fixtureMenu(["cv.pdf"], "cv") });

		// WHEN
		const next = clearLine(editor);

		// THEN
		expect(next.session.completion).toBeUndefined();
	});
});

describe("closeMenu", () => {
	it("does nothing when no menu is open", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT });

		// WHEN
		const next = closeMenu(editor);

		// THEN
		expect(next).toBe(editor);
	});

	it("drops the menu and leaves the line as it is", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT, completion: fixtureMenu(["cv.pdf"], "cv") });

		// WHEN
		const next = closeMenu(editor);

		// THEN
		expect(next.session.completion).toBeUndefined();
		expect(next.session.draft).toBe(DRAFT);
	});
});

describe("cancel", () => {
	it("drops the line, the browse position, the menu and the stashed draft", () => {
		// GIVEN
		const editor = editorOn(
			{
				draft: DRAFT,
				history: HISTORY,
				historyIndex: 1,
				completion: fixtureMenu(["cv.pdf"], "cv")
			},
			"half typed"
		);

		// WHEN
		const next = cancel(editor);

		// THEN
		expect(next).toEqual({
			session: { ...editor.session, draft: "", historyIndex: null, completion: undefined },
			stashedDraft: ""
		});
	});
});

describe("historyUp", () => {
	it("does nothing with an empty history", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT });

		// WHEN
		const next = historyUp(editor);

		// THEN
		expect(next).toBe(editor);
	});

	it("steps back onto the newest entry and stashes the line being typed", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT, history: HISTORY });

		// WHEN
		const next = historyUp(editor);

		// THEN
		expect(next.session.draft).toBe(HISTORY[1]);
		expect(next.session.historyIndex).toBe(1);
		expect(next.stashedDraft).toBe(DRAFT);
	});

	it("keeps the stashed line while it walks further back", () => {
		// GIVEN a session already on the newest entry
		const editor = editorOn({ draft: HISTORY[1], history: HISTORY, historyIndex: 1 }, DRAFT);

		// WHEN
		const next = historyUp(editor);

		// THEN
		expect(next.session.draft).toBe(HISTORY[0]);
		expect(next.session.historyIndex).toBe(0);
		expect(next.stashedDraft).toBe(DRAFT);
	});

	it("stays on the oldest entry", () => {
		// GIVEN
		const editor = editorOn({ draft: HISTORY[0], history: HISTORY, historyIndex: 0 }, DRAFT);

		// WHEN
		const next = historyUp(editor);

		// THEN
		expect(next.session.historyIndex).toBe(0);
	});

	it("closes an open menu", () => {
		// GIVEN
		const editor = editorOn({ history: HISTORY, completion: fixtureMenu(["cv.pdf"], "cv") });

		// WHEN
		const next = historyUp(editor);

		// THEN
		expect(next.session.completion).toBeUndefined();
	});
});

describe("historyDown", () => {
	it("does nothing on the draft", () => {
		// GIVEN
		const editor = editorOn({ draft: DRAFT, history: HISTORY });

		// WHEN
		const next = historyDown(editor);

		// THEN
		expect(next).toBe(editor);
	});

	it("steps forward one entry", () => {
		// GIVEN
		const editor = editorOn({ draft: HISTORY[0], history: HISTORY, historyIndex: 0 }, DRAFT);

		// WHEN
		const next = historyDown(editor);

		// THEN
		expect(next.session.draft).toBe(HISTORY[1]);
		expect(next.session.historyIndex).toBe(1);
	});

	it("restores the stashed line past the newest entry", () => {
		// GIVEN
		const editor = editorOn({ draft: HISTORY[1], history: HISTORY, historyIndex: 1 }, DRAFT);

		// WHEN
		const next = historyDown(editor);

		// THEN
		expect(next.session.draft).toBe(DRAFT);
		expect(next.session.historyIndex).toBeNull();
		expect(next.stashedDraft).toBe("");
	});
});

describe("submit", () => {
	it("runs the line and settles the editor", () => {
		// GIVEN
		const editor = editorOn(
			{ cwd: "/career", draft: "pwd", completion: fixtureMenu(["pwd"], "p") },
			"half typed"
		);

		// WHEN
		const submission = submit(editor, context);

		// THEN
		expect(submission.result.lines).toEqual(["/career"]);
		expect(submission.editor.session.draft).toBe("");
		expect(submission.editor.session.history).toEqual(["pwd"]);
		expect(submission.editor.session.completion).toBeUndefined();
		expect(submission.editor.stashedDraft).toBe("");
	});
});

describe("completeDraft", () => {
	it("lists nothing and closes the menu when nothing matches", () => {
		// GIVEN an open menu over a token that has since stopped matching
		const editor = editorOn({ draft: "cat zzz", completion: fixtureMenu(["cv.pdf"], "cv") });

		// WHEN
		const step = completeDraft(editor, root);

		// THEN
		expect(step.listed).toEqual([]);
		expect(step.editor.session.completion).toBeUndefined();
	});

	it("hands the editor back when nothing matches and no menu was open", () => {
		// GIVEN
		const editor = editorOn({ draft: "cat zzz" });

		// WHEN
		const step = completeDraft(editor, root);

		// THEN
		expect(step.editor).toBe(editor);
	});

	it("inserts a lone candidate whole, with the slash that opens its level", () => {
		// GIVEN
		const editor = editorOn({ draft: "cat car" });

		// WHEN
		const step = completeDraft(editor, root);

		// THEN
		expect(step.editor.session.draft).toBe("cat career/");
		expect(step.editor.session.completion).toBeUndefined();
		expect(step.listed).toEqual([]);
	});

	it("opens the menu on the first candidate and lists them once", () => {
		// GIVEN
		const editor = editorOn({ draft: "cat c" });

		// WHEN
		const step = completeDraft(editor, root);

		// THEN
		expect(step.editor.session.draft).toBe("cat career/");
		expect(step.editor.session.completion).toEqual(
			fixtureMenu(["career/", "contact", "cv.pdf"], "c", 0)
		);
		expect(step.listed).toEqual(["career/", "contact", "cv.pdf"]);
	});

	it("replaces the menu that was already open", () => {
		// GIVEN an open menu on an older token
		const editor = editorOn({ draft: "cat c", completion: fixtureMenu(["cv.pdf"], "cv", 2) });

		// WHEN
		const step = completeDraft(editor, root);

		// THEN
		expect(step.editor.session.completion).toEqual(
			fixtureMenu(["career/", "contact", "cv.pdf"], "c", 0)
		);
	});

	it("completes a command on an empty line, opening the menu on the first of them", () => {
		// GIVEN a fresh editor and nothing typed
		const editor = emptyEditor();

		// WHEN
		const step = completeDraft(editor, root);

		// THEN the line becomes the first command and the menu lists all of them
		expect(step.editor.session.draft).toBe(step.listed[0]);
		expect(step.listed.length).toBeGreaterThan(1);
		expect(step.editor.session.completion).toEqual(fixtureMenu(step.listed, "", 0));
	});

	it("completes no node while the tree is missing", () => {
		// GIVEN
		const editor = editorOn({ draft: "cat car" });

		// WHEN
		const step = completeDraft(editor, null);

		// THEN
		expect(step.listed).toEqual([]);
		expect(step.editor.session.draft).toBe("cat car");
	});
});

describe("cycleDraft", () => {
	const CANDIDATES: readonly string[] = ["career/", "contact", "cv.pdf"];

	function cyclingMenu(index: number, draft = "cat career/"): EditorState {
		return editorOn({ draft, completion: fixtureMenu(CANDIDATES, "c", index) });
	}

	it("does nothing when no menu is open", () => {
		// GIVEN
		const editor = editorOn({ draft: "cat c" });

		// WHEN
		const step = cycleDraft(editor, "next");

		// THEN
		expect(step.editor).toBe(editor);
		expect(step.listed).toEqual([]);
	});

	it("walks forward through the candidates", () => {
		// WHEN
		const step = cycleDraft(cyclingMenu(0), "next");

		// THEN
		expect(step.editor.session.draft).toBe("cat contact");
		expect(step.editor.session.completion).toEqual(fixtureMenu(CANDIDATES, "c", 1));
		expect(step.listed).toEqual([]);
	});

	it("wraps forward past the last candidate", () => {
		// WHEN
		const step = cycleDraft(cyclingMenu(2, "cat cv.pdf"), "next");

		// THEN
		expect(step.editor.session.draft).toBe("cat career/");
		expect(step.editor.session.completion).toEqual(fixtureMenu(CANDIDATES, "c", 0));
	});

	it("walks back through the candidates", () => {
		// WHEN
		const step = cycleDraft(cyclingMenu(1, "cat contact"), "previous");

		// THEN
		expect(step.editor.session.draft).toBe("cat career/");
		expect(step.editor.session.completion).toEqual(fixtureMenu(CANDIDATES, "c", 0));
	});

	it("wraps back before the first candidate", () => {
		// WHEN
		const step = cycleDraft(cyclingMenu(0), "previous");

		// THEN
		expect(step.editor.session.draft).toBe("cat cv.pdf");
		expect(step.editor.session.completion).toEqual(fixtureMenu(CANDIDATES, "c", 2));
	});

	it("closes the menu when the token has been edited past it", () => {
		// GIVEN a menu opened on `c`, with the line since changed
		const editor = editorOn({ draft: "cat zzz", completion: fixtureMenu(CANDIDATES, "c", 0) });

		// WHEN
		const step = cycleDraft(editor, "next");

		// THEN
		expect(step.editor.session.completion).toBeUndefined();
		expect(step.editor.session.draft).toBe("cat zzz");
		expect(step.listed).toEqual([]);
	});

	it("closes the menu when a space leaves no token under the cursor", () => {
		// GIVEN
		const editor = editorOn({ draft: "cat ", completion: fixtureMenu(CANDIDATES, "c", 0) });

		// WHEN
		const step = cycleDraft(editor, "next");

		// THEN
		expect(step.editor.session.completion).toBeUndefined();
	});
});
