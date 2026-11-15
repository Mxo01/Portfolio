import type { ITerminalOptions } from "@xterm/xterm";

/**
 * The one place the grid is configured.
 *
 * xterm rejects `lineHeight` below 1, so the row can never be shorter than the
 * font's own line box: 0xProto at 16px advances 0.62em (9.92px per column) and
 * lays out a 1.56em line box (24.96px per row). That ratio is the grid, and
 * every consumer measures it rather than assuming it — character art samples by
 * `cellWidth / cellHeight` instead of distorting the terminal to make cells
 * square.
 *
 * The stack after `"0xProto"` only covers the frame before the font loads.
 */
export const TERMINAL_OPTIONS: ITerminalOptions = {
	fontFamily: '"0xProto", ui-monospace, SFMono-Regular, Menlo, monospace',
	fontSize: 16,
	fontWeight: "normal",
	fontWeightBold: "bold",
	lineHeight: 1,
	scrollback: 5000,
	cursorBlink: true,
	screenReaderMode: true
};
