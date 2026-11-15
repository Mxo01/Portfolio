import { resolveKey } from "@/lib/terminal/keymap";
import type { KeyAction, KeyChord } from "@/lib/terminal/keymap";

const testSubject = resolveKey;

const NO_MODIFIERS = { ctrl: false, meta: false, alt: false, shift: false } as const;

function chord(overrides: Partial<KeyChord>): KeyChord {
	return {
		key: "",
		ctrl: false,
		meta: false,
		alt: false,
		shift: false,
		hasSelection: false,
		menuOpen: false,
		mode: "prompt",
		...overrides
	};
}

const MODIFIERS: readonly { readonly label: string; readonly chord: Partial<KeyChord> }[] = [
	{ label: "no modifier", chord: NO_MODIFIERS },
	{ label: "ctrl", chord: { ctrl: true } },
	{ label: "cmd", chord: { meta: true } },
	{ label: "alt", chord: { alt: true } },
	{ label: "shift", chord: { shift: true } },
	{ label: "ctrl+shift", chord: { ctrl: true, shift: true } },
	{ label: "ctrl+alt", chord: { ctrl: true, alt: true } },
	{ label: "cmd+shift", chord: { meta: true, shift: true } }
];

const ANY_KEY: readonly string[] = [
	"c",
	"C",
	"tab",
	"Tab",
	"escape",
	"Escape",
	"backspace",
	"Backspace",
	"enter",
	"arrowup",
	"a",
	" "
];

const SCRIPT_CASES = ANY_KEY.flatMap(key =>
	MODIFIERS.map(modifier => ({
		name: `${key} with ${modifier.label}`,
		key,
		chord: chord({
			...modifier.chord,
			key,
			mode: "script",
			hasSelection: true,
			menuOpen: true
		})
	}))
);

interface ActionCase {
	readonly name: string;
	readonly chord: KeyChord;
	readonly expected: KeyAction | null;
}

const ACTION_CASES: readonly ActionCase[] = [
	{
		name: "ctrl+c over a selection copies",
		chord: chord({ key: "c", ctrl: true, hasSelection: true }),
		expected: "copy"
	},
	{
		name: "cmd+c over a selection copies",
		chord: chord({ key: "c", meta: true, hasSelection: true }),
		expected: "copy"
	},
	{
		name: "ctrl+C over a selection copies",
		chord: chord({ key: "C", ctrl: true, hasSelection: true }),
		expected: "copy"
	},
	{
		name: "ctrl+c with nothing selected interrupts",
		chord: chord({ key: "c", ctrl: true }),
		expected: "cancel"
	},
	{
		name: "cmd+c with nothing selected interrupts",
		chord: chord({ key: "c", meta: true }),
		expected: "cancel"
	},
	{
		name: "ctrl+alt+c is not the shell's",
		chord: chord({ key: "c", ctrl: true, alt: true, hasSelection: true }),
		expected: "none"
	},
	{
		name: "ctrl+shift+c keeps devtools open",
		chord: chord({ key: "c", ctrl: true, shift: true, hasSelection: true }),
		expected: "none"
	},
	{
		name: "cmd+alt+c is not the shell's",
		chord: chord({ key: "c", meta: true, alt: true }),
		expected: "none"
	},
	{ name: "a bare c is typing", chord: chord({ key: "c" }), expected: "none" },
	{ name: "alt+c is not the shell's", chord: chord({ key: "c", alt: true }), expected: "none" },
	{ name: "tab completes", chord: chord({ key: "tab" }), expected: "complete" },
	{ name: "Tab completes", chord: chord({ key: "Tab" }), expected: "complete" },
	{
		name: "shift+tab walks an open menu back",
		chord: chord({ key: "tab", shift: true, menuOpen: true }),
		expected: "complete-back"
	},
	{
		name: "shift+tab means nothing with no menu",
		chord: chord({ key: "tab", shift: true }),
		expected: "none"
	},
	{
		name: "ctrl+tab belongs to the browser",
		chord: chord({ key: "tab", ctrl: true }),
		expected: "none"
	},
	{
		name: "cmd+tab belongs to the system",
		chord: chord({ key: "tab", meta: true }),
		expected: "none"
	},
	{
		name: "alt+tab belongs to the browser",
		chord: chord({ key: "tab", alt: true }),
		expected: "none"
	},
	{
		name: "escape closes a menu",
		chord: chord({ key: "escape", menuOpen: true }),
		expected: "dismiss"
	},
	{
		name: "escape with no menu is the browser's",
		chord: chord({ key: "escape" }),
		expected: "none"
	},
	{
		name: "ctrl+escape still closes a menu",
		chord: chord({ key: "escape", ctrl: true, menuOpen: true }),
		expected: "dismiss"
	},
	{
		name: "a plain backspace is the line editor's",
		chord: chord({ key: "backspace" }),
		expected: "none"
	},
	{
		name: "a shifted backspace is not the shell's",
		chord: chord({ key: "backspace", shift: true }),
		expected: "none"
	},
	{
		name: "cmd+backspace empties the line",
		chord: chord({ key: "backspace", meta: true }),
		expected: "clear-line"
	},
	{
		name: "ctrl+backspace deletes a word",
		chord: chord({ key: "backspace", ctrl: true }),
		expected: "delete-word"
	},
	{
		name: "alt+backspace deletes a word",
		chord: chord({ key: "backspace", alt: true }),
		expected: "delete-word"
	},
	{
		name: "cmd wins over ctrl on backspace",
		chord: chord({ key: "backspace", meta: true, ctrl: true }),
		expected: "clear-line"
	},
	{
		name: "Backspace keeps the same meaning",
		chord: chord({ key: "Backspace", ctrl: true }),
		expected: "delete-word"
	},
	{ name: "enter is not a chord", chord: chord({ key: "enter" }), expected: "none" },
	{ name: "an arrow is not a chord", chord: chord({ key: "arrowup" }), expected: "none" },
	{ name: "a space is not a chord", chord: chord({ key: " " }), expected: "none" }
];

describe("resolveKey", () => {
	it.each(SCRIPT_CASES)("resolves $name to null while a script plays", ({ chord: keyChord }) => {
		// WHEN
		const action = testSubject(keyChord);

		// THEN
		expect(action).toBeNull();
	});

	it.each(ACTION_CASES)("$name", ({ chord: keyChord, expected }) => {
		// WHEN
		const action = testSubject(keyChord);

		// THEN
		expect(action).toBe(expected);
	});
});
