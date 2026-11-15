import { HISTORY_LIMIT } from "./constants";
import type { ShellSession } from "./types";

/**
 * `↑`: one entry older, the newest first. The contract has no slot for the line
 * being edited, so stepping back onto the history drops it instead of stashing it.
 */
export function historyUp(session: ShellSession): ShellSession {
	const { history } = session;
	if (history.length === 0) return session;

	const index =
		session.historyIndex === null ? history.length - 1 : Math.max(0, session.historyIndex - 1);
	const entry = history[index];
	if (entry === undefined) return session;

	return { ...session, historyIndex: index, draft: entry };
}

/** `↓`: one entry newer; past the newest one the prompt is empty again. */
export function historyDown(session: ShellSession): ShellSession {
	if (session.historyIndex === null) return session;

	const index = session.historyIndex + 1;
	const entry = session.history[index];
	if (entry === undefined) return { ...session, historyIndex: null, draft: "" };

	return { ...session, historyIndex: index, draft: entry };
}

/** Records a command, skipping a repeat of the previous one and capping the list. */
export function remember(history: readonly string[], command: string): readonly string[] {
	const entry = command.trim();
	if (entry.length === 0 || history[history.length - 1] === entry) return history;

	const next = [...history, entry];
	return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}
