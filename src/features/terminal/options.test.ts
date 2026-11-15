import { describe, expect, it } from "vitest";

import type { ITerminalOptions } from "@xterm/xterm";

import { TERMINAL_OPTIONS } from "@/features/terminal/options";

/**
 * The grid's configuration, as the one place that sets it. Nothing here checks what the
 * view adds on top — the link handler and the block cursor belong to the screen — only
 * that the shared base is the one the layout contract was measured against: a 1.0 line
 * height on 0xProto at 16px, which is the ratio every character-art consumer samples by.
 */

/** The face the grid is measured in, quoted so xterm passes the family through untouched. */
const PRIMARY_FAMILY = '"0xProto"';
/** The last resort in the stack: the frame before the webfont lands, and no font at all. */
const LAST_RESORT_FAMILY = "monospace";
/** 0xProto at 16px advances 0.62em: the advance the portrait's sampling assumes. */
const FONT_SIZE_PX = 16;
/** Rows the visitor can scroll back through: a session's worth, not an unbounded buffer. */
const SCROLLBACK_ROWS = 5000;

function familiesOf(fontFamily: string): readonly string[] {
	return fontFamily.split(",").map(family => family.trim());
}

describe("TERMINAL_OPTIONS", () => {
	it("starts the stack at 0xProto and ends it at the generic monospace", () => {
		const fontFamily = TERMINAL_OPTIONS.fontFamily ?? "";

		const testSubject = familiesOf(fontFamily);

		expect(testSubject[0]).toBe(PRIMARY_FAMILY);
		expect(testSubject.at(-1)).toBe(LAST_RESORT_FAMILY);
		expect(testSubject).not.toContain("");
	});

	it("asks for no line height at all on top of the font's own line box", () => {
		// Exactly 1, not merely above it: the row must stay the font's own line box, and
		// xterm rejects anything below 1 outright.
		expect(TERMINAL_OPTIONS.lineHeight).toBe(1);
	});

	it("never asks for a row shorter than the font's line box", () => {
		const testSubject = TERMINAL_OPTIONS.lineHeight ?? Number.NaN;

		expect(testSubject).toBeGreaterThanOrEqual(1);
	});

	it("lays the grid out at the size the art was measured at", () => {
		expect(TERMINAL_OPTIONS.fontSize).toBe(FONT_SIZE_PX);
	});

	it("uses the regular face for the body and the bold one for emphasis", () => {
		expect(TERMINAL_OPTIONS.fontWeight).toBe("normal");
		expect(TERMINAL_OPTIONS.fontWeightBold).toBe("bold");
	});

	it("keeps a bounded scrollback", () => {
		expect(TERMINAL_OPTIONS.scrollback).toBe(SCROLLBACK_ROWS);
	});

	it("blinks the cursor, the way a waiting shell does", () => {
		expect(TERMINAL_OPTIONS.cursorBlink).toBe(true);
	});

	it("lets a screen reader read the grid", () => {
		expect(TERMINAL_OPTIONS.screenReaderMode).toBe(true);
	});

	it("leaves the cursor shape to the screen, which owns the prompt", () => {
		// The block belongs to the prompt the view prints, not to the shared grid: a base
		// that set it would make every consumer wear the shell's cursor.
		const testSubject: ITerminalOptions = TERMINAL_OPTIONS;

		expect(testSubject.cursorStyle).toBeUndefined();
	});
});
