import { HOME_PATH } from "./constants";
import type { ShellSession } from "./types";

/** A fresh shell: home, no history, no line being edited. */
export function emptySession(): ShellSession {
	return { cwd: HOME_PATH, history: [], historyIndex: null, draft: "" };
}

/**
 * Editing the line leaves history browsing: the arrow keys walk `history`, the
 * keyboard edits `draft`, and only one of the two is ever in charge.
 */
export function withDraft(session: ShellSession, draft: string): ShellSession {
	return { ...session, draft, historyIndex: null };
}
