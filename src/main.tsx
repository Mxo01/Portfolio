import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/styles/fonts.css";

import { App } from "@/app/app";
import { ErrorBoundary } from "@/app/error-boundary";
// After the app, so this lands beside the xterm stylesheet it adjusts.
import "@/styles/terminal.css";

const container = document.getElementById("root");

if (!container) throw new Error("Root container missing");

/*
 * One mount, one boundary, no providers: the terminal keeps its own state and its
 * own theme, so there is nothing to hand down the tree.
 */
createRoot(container).render(
	<StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</StrictMode>
);
