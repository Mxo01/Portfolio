import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ITheme } from "@xterm/xterm";

import { THEMES, applyBodyBackground, persistTheme, readTheme } from "@/features/terminal/theme";
import type { Theme } from "@/features/terminal/theme";

/** The key the choice is remembered under; a rename would silently forget every visit. */
const STORAGE_KEY = "portfolio-theme";
/** What `body` wears when the palette cannot name a background at all. */
const FALLBACK_BACKGROUND = "#07070a";
/** A hex colour, six digits, lowercase: the only shape either palette uses. */
const HEX = /^#[0-9a-f]{6}$/;
/** Every slot xterm reads, ANSI names included. */
const SLOTS = [
	"background",
	"foreground",
	"cursor",
	"cursorAccent",
	"selectionBackground",
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white",
	"brightBlack",
	"brightRed",
	"brightGreen",
	"brightYellow",
	"brightBlue",
	"brightMagenta",
	"brightCyan",
	"brightWhite"
] as const satisfies readonly (keyof ITheme)[];

const PALETTES = ["dark", "light"] as const satisfies readonly Theme[];

/** A storage double that records its calls: no test writes to the browser's own storage. */
interface StorageDouble {
	readonly storage: Storage;
	readonly getItem: ReturnType<typeof vi.fn>;
	readonly setItem: ReturnType<typeof vi.fn>;
}

function storageDouble(initial: Readonly<Record<string, string>> = {}): StorageDouble {
	const entries = new Map(Object.entries(initial));
	const getItem = vi.fn((key: string) => entries.get(key) ?? null);
	const setItem = vi.fn((key: string, value: string) => {
		entries.set(key, value);
	});

	const storage: Storage = {
		get length() {
			return entries.size;
		},
		clear: () => entries.clear(),
		key: index => [...entries.keys()][index] ?? null,
		removeItem: key => entries.delete(key),
		getItem,
		setItem
	};

	return { storage, getItem, setItem };
}

beforeEach(() => {
	vi.stubGlobal("localStorage", storageDouble().storage);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	document.body.removeAttribute("style");
	document.documentElement.removeAttribute("style");
});

describe("THEMES", () => {
	it.each(PALETTES)("defines every slot of the %s palette", palette => {
		const testSubject: ITheme = THEMES[palette];

		for (const slot of SLOTS) {
			expect(testSubject[slot], slot).toMatch(HEX);
		}
	});

	it("keeps the two palettes apart", () => {
		const dark = THEMES.dark;
		const light = THEMES.light;

		expect(dark.background).not.toBe(light.background);
		expect(dark.foreground).not.toBe(light.foreground);
		expect(dark.cursor).not.toBe(light.cursor);
		expect(dark.selectionBackground).not.toBe(light.selectionBackground);
	});

	it("keeps the muted grey out of the foreground", () => {
		for (const palette of PALETTES) {
			expect(THEMES[palette].brightBlack, palette).not.toBe(THEMES[palette].foreground);
		}
	});
});

describe("readTheme", () => {
	const cases: readonly {
		readonly name: string;
		readonly stored: string | null;
		readonly theme: Theme;
	}[] = [
		{ name: "the remembered dark", stored: "dark", theme: "dark" },
		{ name: "the remembered light", stored: "light", theme: "light" },
		{ name: "nothing remembered", stored: null, theme: "dark" },
		{ name: "a palette that no longer exists", stored: "solarized", theme: "dark" }
	];

	it.each(cases)("reads $name", ({ stored, theme }) => {
		const double = storageDouble(stored === null ? {} : { [STORAGE_KEY]: stored });
		vi.stubGlobal("localStorage", double.storage);

		const testSubject = readTheme();

		expect(testSubject).toBe(theme);
		expect(double.getItem).toHaveBeenCalledWith(STORAGE_KEY);
	});

	it("falls back to the designed default when storage is blocked", () => {
		const double = storageDouble();
		double.getItem.mockImplementation(() => {
			throw new Error("storage is disabled in this context");
		});
		vi.stubGlobal("localStorage", double.storage);

		const testSubject = readTheme();

		expect(testSubject).toBe("dark");
	});
});

describe("persistTheme", () => {
	it.each(PALETTES)("remembers the %s palette under the shell's own key", theme => {
		const double = storageDouble();
		vi.stubGlobal("localStorage", double.storage);

		persistTheme(theme);

		expect(double.setItem).toHaveBeenCalledWith(STORAGE_KEY, theme);
	});

	it("survives a storage quota that refuses the write", () => {
		const double = storageDouble();
		double.setItem.mockImplementation(() => {
			throw new Error("the quota is full");
		});
		vi.stubGlobal("localStorage", double.storage);

		expect(() => persistTheme("light")).not.toThrow();
	});

	it("round-trips through the same storage", () => {
		vi.stubGlobal("localStorage", storageDouble().storage);

		persistTheme("light");

		expect(readTheme()).toBe("light");
	});
});

describe("applyBodyBackground", () => {
	it.each(PALETTES)("paints the %s palette on the page", theme => {
		applyBodyBackground(theme);

		expect(document.body.style.backgroundColor).toBe(THEMES[theme].background);
		expect(document.documentElement.style.colorScheme).toBe(theme);
	});

	it("falls back to near-black when the palette names no background", () => {
		const background = THEMES.dark.background;

		Object.defineProperty(THEMES.dark, "background", { value: undefined, configurable: true });

		try {
			applyBodyBackground("dark");

			expect(document.body.style.backgroundColor).toBe(FALLBACK_BACKGROUND);
		} finally {
			Object.defineProperty(THEMES.dark, "background", { value: background, configurable: true });
		}
	});
});
