import { withTone } from "./lines";
import type { ContentFile, Line, Tone, TreeNode } from "./types";

/**
 * `export_cv.sh` as data: the confession it plays, the admission it prints afterwards, and
 * the one thing it actually does. The view schedules the steps and fires the download;
 * nothing here knows what a timer or a DOM is, so the copy can be read, diffed and painted
 * without a screen.
 *
 * The file itself has no body: the tree gives the node a name and these flags, and running
 * it plays the beats below.
 */

/** What running a script does once the playback has landed. */
export type ScriptAction = "download-cv";

/** One played line, and how long it stays before the next one lands. */
export interface ScriptStep {
	readonly line: Line;
	/** Milliseconds from this line landing to the next; `0` means "as soon as it is painted". */
	readonly delayMs: number;
}

/** Everything the view needs to play an executable: the copy, the pace, the side effect. */
export interface Script {
	readonly steps: readonly ScriptStep[];
	/** What the shell prints after the action: the joke's own admission, never a caption. */
	readonly debrief: readonly Line[];
	readonly action: ScriptAction;
}

/**
 * A file the shell can run: the same file node, plus the script it plays and the fact that
 * it will not be printed.
 *
 * The markers are flags on a `"file"`, not a third `kind`, because everything that already
 * walks the tree — `ls`, `tree`, `cd` — treats a file as a file and keeps working; only the
 * dispatcher asks whether this one can run, and only the reader whether it may be shown.
 */
export interface ExecutableFile extends ContentFile {
	readonly executable: true;
	readonly readable: false;
	readonly script: Script;
}

/** A line of copy before it is given a register. */
interface Beat {
	readonly text: string;
	readonly delayMs: number;
	readonly tone: Tone;
}

/** Progress is a status line; a "found" line is the punchline and wears the accent. */
const PROGRESS: Tone = "dim";
const FOUND: Tone = "accent";

/**
 * The confession, in order. The delays are the gag's timing in milliseconds: the two
 * "found" beats land faster because they are the joke, the virus beats slower because it
 * is the threat. The last step carries no delay — nothing follows it but the download.
 */
const BEATS: readonly Beat[] = [
	{ text: "reading your system files…", delayMs: 600, tone: PROGRESS },
	{ text: "reading your passwords…", delayMs: 700, tone: PROGRESS },
	{ text: "wifi password found!", delayMs: 600, tone: FOUND },
	{ text: "google account access granted!", delayMs: 700, tone: FOUND },
	{ text: "installing a virus…", delayMs: 900, tone: PROGRESS },
	{ text: "almost done…", delayMs: 700, tone: PROGRESS },
	{ text: "just kidding 😂", delayMs: 0, tone: FOUND }
];

/**
 * The admission, line for line as it is printed: the leading empty line is part of it, so
 * the block stands away from the joke above and the emoji stands away from the paragraph.
 */
const DEBRIEF: readonly string[] = [
	"",
	"nothing happened. no files were read, no passwords were touched, no network",
	"requests were made — the only thing that left this page is the CV you asked",
	"for.",
	"",
	"😂"
];

/** The confession, ready to paint. */
export const EXPORT_CV_STEPS: readonly ScriptStep[] = BEATS.map(({ text, tone, delayMs }) => ({
	line: withTone(tone, text),
	delayMs
}));

/** The admission that follows the download: plain prose and the emoji, nothing else. */
export const EXPORT_CV_DEBRIEF: readonly Line[] = DEBRIEF;

/** The whole easter egg, as the command returns it. */
export const EXPORT_CV_SCRIPT: Script = {
	steps: EXPORT_CV_STEPS,
	debrief: EXPORT_CV_DEBRIEF,
	action: "download-cv"
};

/** The window a beat's pause is drawn from: a script that never plays the same way twice. */
const MIN_BEAT_DELAY_MS = 350;
const MAX_BEAT_DELAY_MS = 3000;

/**
 * The pauses a playback actually uses, one per step, drawn from the caller's source of
 * randomness — the domain stays deterministic and a probe can seed it. A beat that means
 * to land at once, `just kidding` above all, keeps its zero. The whole run is therefore
 * bounded by the paced beats at the cap, `MAX_BEAT_DELAY_MS × beats`.
 */
export function scheduleBeats(
	random: () => number,
	steps: readonly ScriptStep[] = EXPORT_CV_STEPS
): readonly number[] {
	return steps.map(step => {
		if (step.delayMs === 0) return 0;

		return Math.floor(MIN_BEAT_DELAY_MS + random() * (MAX_BEAT_DELAY_MS - MIN_BEAT_DELAY_MS + 1));
	});
}

/** Whether this node is one the shell can run. The flag decides, never the file name. */
export function isExecutable(node: TreeNode): node is ExecutableFile {
	return node.kind === "file" && "executable" in node && node.executable === true;
}

/** What running this node plays, or `null` for a file the shell only prints. */
export function scriptFor(node: TreeNode): Script | null {
	return isExecutable(node) ? node.script : null;
}

/**
 * Whether the visitor may print this node. Read off the node's own flag, so a file that
 * refuses to be shown is refused for what it is and not for what it is called.
 */
export function isReadable(node: TreeNode): boolean {
	return node.kind !== "file" || node.readable !== false;
}

/**
 * The shell's one refusal, in its one wording: a file it may not print and a node it may
 * not run say the same sentence, because to the visitor both are the same answer.
 */
export function permissionDenied(target: string): string {
	return `permission denied: ${target}`;
}
