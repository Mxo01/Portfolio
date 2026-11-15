import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function createMediaQueryList(query: string, matches: boolean): MediaQueryList {
	const listeners = new Set<(event: MediaQueryListEvent) => void>();

	const add = (listener: ((event: MediaQueryListEvent) => void) | null) => {
		if (listener) listeners.add(listener);
	};
	const remove = (listener: ((event: MediaQueryListEvent) => void) | null) => {
		if (listener) listeners.delete(listener);
	};

	return {
		matches,
		media: query,
		onchange: null,
		addListener: add,
		removeListener: remove,
		addEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) =>
			add(listener as (event: MediaQueryListEvent) => void),
		removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject | null) =>
			remove(listener as (event: MediaQueryListEvent) => void),
		dispatchEvent: () => true
	};
}

// happy-dom has no layout engine: every query reports a match only for reduced
// motion, so tests exercise the motion-free branch deterministically.
window.matchMedia = (query: string) => createMediaQueryList(query, query === REDUCED_MOTION_QUERY);

afterEach(() => {
	cleanup();
});
