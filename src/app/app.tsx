import type { CSSProperties } from "react";

import { TerminalScreen } from "@/features/terminal";

/** The published root, base prefix included, so the PDF resolves in dev and on Pages. */
const CV_URL = `${import.meta.env.BASE_URL}cv/mario-dimodica-cv.pdf`;

/**
 * The terminal paints a canvas, not headings: the document's only heading is this
 * one, kept in the accessibility tree and out of the grid.
 */
const VISUALLY_HIDDEN: CSSProperties = {
	position: "absolute",
	width: 1,
	height: 1,
	margin: -1,
	padding: 0,
	overflow: "hidden",
	clipPath: "inset(50%)",
	whiteSpace: "nowrap",
	border: 0
};

/** Plain text for a browser that ran no JavaScript: the facts, one per line. */
const NO_SCRIPT_SUMMARY = `Mario Di Modica — Software Engineer, Pisa, Italy.
Email: mariodimodica.01@gmail.com
GitHub: https://github.com/Mxo01
CV: ${CV_URL}`;

/**
 * The whole document. Nothing renders around the terminal: no header, no footer,
 * no navigation, no toggle — the heading and the no-script fallback are the only
 * things the shell cannot say for itself.
 */
export function App() {
	return (
		<>
			<h1 style={VISUALLY_HIDDEN}>Mario Di Modica — Software Engineer</h1>
			<noscript>{NO_SCRIPT_SUMMARY}</noscript>
			<TerminalScreen cvUrl={CV_URL} />
		</>
	);
}
