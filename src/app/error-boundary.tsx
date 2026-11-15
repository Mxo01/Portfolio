import { Component } from "react";
import type { CSSProperties, ReactNode } from "react";

/** The whole fallback. The terminal is the page, so a crash can say one plain thing. */
const BROKEN_MESSAGE = "something broke — reload";

const FALLBACK: CSSProperties = {
	height: "100%",
	padding: "1.5rem",
	background: "#07070a",
	color: "#e6e6e6",
	fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
	fontSize: "0.875rem",
	lineHeight: 1.6
};

export interface ErrorBoundaryProps {
	readonly children: ReactNode;
}

export interface ErrorBoundaryState {
	/** Kept only to know a render failed; the message is fixed by design. */
	readonly error: Error | null;
}

/**
 * Last line of defence around the terminal: React already logs the cause to the
 * console, so the boundary owns the visible message and nothing else.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
		return { error: error instanceof Error ? error : new Error(String(error)) };
	}

	render() {
		if (this.state.error !== null) {
			return <main style={FALLBACK}>{BROKEN_MESSAGE}</main>;
		}

		return this.props.children;
	}
}
