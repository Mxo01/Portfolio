import { HOME_PATH } from "@/lib/terminal/constants";
import { emptySession, withDraft } from "@/lib/terminal/session";
import { fixtureSession } from "@/test/fixtures/terminal";

const testSubject = emptySession;
const edit = withDraft;

const DRAFT = "cat cv";

describe("emptySession", () => {
	it("starts at home with nothing typed and nothing remembered", () => {
		// WHEN
		const session = testSubject();

		// THEN
		expect(session).toEqual({
			cwd: HOME_PATH,
			history: [],
			historyIndex: null,
			draft: ""
		});
	});

	it("hands every call its own history", () => {
		// WHEN
		const first = testSubject();
		const second = testSubject();

		// THEN
		expect(first.history).not.toBe(second.history);
	});
});

describe("withDraft", () => {
	it("writes the line and leaves history browsing", () => {
		// GIVEN a session browsing its history
		const session = fixtureSession({ history: ["pwd", "ls"], historyIndex: 1, draft: "ls" });

		// WHEN
		const next = edit(session, DRAFT);

		// THEN
		expect(next).toEqual({ ...session, draft: DRAFT, historyIndex: null });
	});

	it("keeps the working directory and the history", () => {
		// GIVEN
		const session = fixtureSession({ cwd: "/career", history: ["pwd"] });

		// WHEN
		const next = edit(session, DRAFT);

		// THEN
		expect(next.cwd).toBe("/career");
		expect(next.history).toEqual(["pwd"]);
	});
});
