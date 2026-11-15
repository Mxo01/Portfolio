import type { ITheme } from "@xterm/xterm";

import type { ShellContext } from "@/lib/terminal/types";

/** The two palettes the shell can wear. The domain only ever sees this name. */
export type Theme = ShellContext["theme"];

const STORAGE_KEY = "portfolio-theme";
const DEFAULT_THEME: Theme = "dark";
const FALLBACK_BACKGROUND = "#07070a";

/**
 * The terminal is the whole site, so its palette is the brand palette: ANSI yellow
 * is gold (heading, accent), bright black is the muted grey (`dim`), red is `error`.
 * The tone → slot map lives in `ansi.ts`; the colours live here and nowhere else, so
 * a theme flip recolours every register at once and no writer knows a hex value.
 * Both themes are designed, not one inverted.
 *
 * The prompt reads two registers out of that map and needs no colour of its own: `success`
 * prints 32 and `info` 36, so the arrow and the command word wear 32 and the path 36. The
 * slot names are xterm's, not the hues: 32 carries orange (`#f0913f`, `#9e4a10`) and 36 a
 * brown (`#b89372`, `#5c3a1d`), so every value here is chosen by contrast against its own
 * background — 8.46:1 and 7.14:1 on near-black, 5.37:1 and 8.90:1 on cream, all above AA.
 * A literal brown (`#6b4423`) is only 2.37:1 on `#07070a`, which is why the dark theme
 * wears the tan end of the family and the light one the deep end.
 *
 * The two warm registers also have to stay apart from the reds and the gold they sit
 * between: orange is a whole Lab hue away from `error` (62° against 38°, ΔE00 17.9 dark
 * and 10.4 light) and lighter and fuller than the gold of a heading or a hint (ΔE00 14.5
 * in both themes). 32 and 36 stay plain in `ansi.ts` for that reason — bold would land on
 * the bright pair, which is tuned for glow on black and is weaker than the plain slot on
 * paper, so `brightGreen` and `brightCyan` keep the stock hues no tone ever asks for.
 */
export const THEMES: Readonly<Record<Theme, ITheme>> = {
	dark: {
		background: "#07070a",
		foreground: "#f4efe4",
		cursor: "#e8b861",
		cursorAccent: "#07070a",
		// Warm charcoal under cream text: the selection reads as a highlight without
		// swallowing the glyphs it covers.
		selectionBackground: "#3a3322",
		black: "#07070a",
		red: "#ff6b52",
		// The arrow and the command token, in orange: 32 is a slot name, not a hue.
		green: "#f0913f",
		yellow: "#e8b861",
		blue: "#7fa8ff",
		magenta: "#c9a2ff",
		// The path, in the light end of brown — the only end that survives this background.
		cyan: "#b89372",
		white: "#f4efe4",
		brightBlack: "#7f7a72",
		brightRed: "#ff8f7a",
		brightGreen: "#b6e08f",
		brightYellow: "#f6d998",
		brightBlue: "#9dc0ff",
		brightMagenta: "#dcbcff",
		brightCyan: "#8fdcd5",
		brightWhite: "#fffdf8"
	},
	light: {
		background: "#f5f0e6",
		foreground: "#171308",
		cursor: "#8a6420",
		cursorAccent: "#f5f0e6",
		// The amber of the accent, washed out: visible on paper, still lighter than ink.
		selectionBackground: "#e2d3b2",
		black: "#171308",
		red: "#b03a24",
		// Same orange, pushed down until it clears AA on cream: 5.37:1.
		green: "#9e4a10",
		yellow: "#8a6420",
		blue: "#2f5aa8",
		magenta: "#6b3fa0",
		// The path, in the deep end of brown: 8.90:1 on cream.
		cyan: "#5c3a1d",
		white: "#4a4438",
		brightBlack: "#6b6155",
		brightRed: "#c94b32",
		brightGreen: "#4e8239",
		brightYellow: "#6d4d17",
		brightBlue: "#3a6bc4",
		brightMagenta: "#8250bd",
		brightCyan: "#277f79",
		brightWhite: "#171308"
	}
};

/** Dark on the first visit: the site has one designed default. */
export function readTheme(): Theme {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		return stored === "light" || stored === "dark" ? stored : DEFAULT_THEME;
	} catch {
		// Storage can be blocked (private mode, embedded webview): keep the default.
		return DEFAULT_THEME;
	}
}

export function persistTheme(theme: Theme): void {
	try {
		window.localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// A blocked storage quota must never break the shell.
	}
}

function backgroundOf(theme: Theme): string {
	return THEMES[theme].background ?? FALLBACK_BACKGROUND;
}

/**
 * `body` is painted with the terminal background so no seam shows around the
 * canvas — the terminal is the page, not a panel inside it.
 */
export function applyBodyBackground(theme: Theme): void {
	document.body.style.backgroundColor = backgroundOf(theme);
	document.documentElement.style.colorScheme = theme;
}
