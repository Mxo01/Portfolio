/**
 * The portrait is the one image the shell draws, and it is fetched at runtime like the CV:
 * `public/portrait.jpg` is decoded on the first `whoami`, cropped to head and shoulders and
 * kept as a small RGB grid, so a later invocation only resamples that grid into glyphs.
 */
export { loadPortrait } from "./load";
export { ART_GAP, ASCII_RAMP, MIN_COLUMNS_WITH_ART, renderPanel, renderPortrait } from "./render";
export type { PanelRequest, PortraitRequest } from "./render";
