import type { CvInput, CvSection, LinkAnnotation, TextItem } from "@/lib/cv";

/**
 * The CV pipeline's fixtures: the shipped `mario-dimodica-cv.pdf` as pdf.js reports it —
 * one text run per cell, points, origin bottom-left — plus the sections the layout
 * contract reads out of it.
 *
 * The coordinates are the document's own, from `getTextContent()`: they are the input the
 * parser's geometry rules are written against, so a test that invented them would prove
 * nothing about the CV the site actually ships. Each entry is its own constant so a test
 * can take the document apart one block at a time.
 */

const LINE_HEIGHT = 10.9;
const BODY_HEIGHT = 10;
const STACK_HEIGHT = 9;
const MARKER_HEIGHT = 12;
const NAME_HEIGHT = 24.8;
const BULLET_HEIGHT = 6;

/** The baselines the document lays its blocks out on. */
export const BASELINE = {
	profile: 791.2,
	contact: 775.7,
	headline: 746.9,
	experience: 716.5,
	projects: 410.8,
	education: 172.4
} as const;

export function run(
	text: string,
	x: number,
	y: number,
	width: number,
	height: number = LINE_HEIGHT
): TextItem {
	return { text, x, y, width, height };
}

/** The cells that share a baseline: one visual line of the document. */
export type Row = readonly TextItem[];

/** The document's three group markers, as the page prints them. */
export const MARKER_TEXT = {
	experience: "EXPERIENCE",
	projects: "PROJECTS",
	education: "EDUCATION"
} as const;

export const MARKER_ROWS = {
	experience: [run(MARKER_TEXT.experience, 36, BASELINE.experience, 57.4, MARKER_HEIGHT)],
	projects: [run(MARKER_TEXT.projects, 36, BASELINE.projects, 47.2, MARKER_HEIGHT)],
	education: [run(MARKER_TEXT.education, 36, BASELINE.education, 54, MARKER_HEIGHT)]
} as const;

export const HEADER_ROWS: readonly Row[] = [
	[
		run("Mario Di Modica", 36, BASELINE.profile, 174.1, NAME_HEIGHT),
		run("Location: Pisa, Italy", 470.9, BASELINE.profile, 88.4)
	],
	[
		run("LinkedIn", 36, BASELINE.contact, 39.5),
		run("|", 77.7, BASELINE.contact, 3),
		run("GitHub", 82.9, BASELINE.contact, 32.2),
		run("|", 117.3, BASELINE.contact, 3),
		run("Website", 122.5, BASELINE.contact, 36.3),
		run("Email: mariodimodica.01@gmail.com", 267.4, BASELINE.contact, 171.4),
		run("|", 441, BASELINE.contact, 3),
		run("Mobile: +39 331 832 5722", 446.2, BASELINE.contact, 113.1)
	],
	[
		run("Software Engineer", 93.5, BASELINE.headline, 81.6, BODY_HEIGHT),
		run(
			"with deep expertise in Web Development and strong interest in AI integrations.",
			177.1,
			BASELINE.headline,
			324.7,
			BODY_HEIGHT
		)
	]
];

export const ONE_TAG_ROWS: readonly Row[] = [
	[run("OneTag", 46.8, 691.7, 36.2), run("Pisa, Italy", 505.6, 691.7, 43.6)],
	[
		run("Software Engineer", 46.8, 678.1, 74.3, BODY_HEIGHT),
		run("Jul 2025 – Present", 476.2, 678.1, 72.8, BODY_HEIGHT)
	],
	[
		run(
			"Angular, Java Spring Boot, Jest, Cypress, Git, React, Spring MCP AI, Vitest, System Design",
			46.8,
			666.8,
			328.1,
			STACK_HEIGHT
		)
	],
	[
		run("•", 61.5, 655.2, 3.8, BULLET_HEIGHT),
		run(
			"Full ownership of the frontend for the new AdTech Curation platform, driving end-to-end development, seamless",
			70.8,
			655.2,
			465.2,
			BODY_HEIGHT
		)
	],
	[run("functionality, and architectural improvements", 70.8, 641.9, 190.8, BODY_HEIGHT)],
	[
		run("•", 61.5, 629, 3.8, BULLET_HEIGHT),
		run(
			"Brought full-stack system design capabilities, architecting scalable solutions and building custom Model Context",
			70.8,
			629,
			464.6,
			BODY_HEIGHT
		)
	],
	[
		run(
			"Protocol (MCP) servers using Spring AI to integrate AI into core systems",
			70.8,
			616,
			291.5,
			BODY_HEIGHT
		)
	],
	[
		run("•", 61.5, 603.1, 3.8, BULLET_HEIGHT),
		run(
			"Spearheaded a codebase refactor, reducing duplication from ~26% to 3%, raising test coverage from 0% to 85%, and",
			70.8,
			603.1,
			479.1,
			BODY_HEIGHT
		)
	],
	[run("achieving Straight-A SonarQube ratings in under a year", 70.8, 590.1, 226.6, BODY_HEIGHT)]
];

export const NTT_DATA_ROWS: readonly Row[] = [
	[run("NTT DATA", 46.8, 572.6, 45.9), run("Pisa, Italy", 505.6, 572.6, 43.6)],
	[
		run("Software Engineer", 46.8, 559, 74.3, BODY_HEIGHT),
		run("Mar 2024 – Jul 2025", 470.3, 559, 78.8, BODY_HEIGHT)
	],
	[run("Angular, Java Spring Boot, PostgreSQL, MongoDB, Docker", 46.8, 547.7, 214, STACK_HEIGHT)],
	[
		run("•", 61.5, 536, 3.8, BULLET_HEIGHT),
		run(
			"Led frontend development in an English-speaking team for a green computing project focused on carbon emissions",
			70.8,
			536,
			477.1,
			BODY_HEIGHT
		)
	],
	[run("calculation and reduction", 70.8, 522.8, 106.5, BODY_HEIGHT)],
	[
		run("•", 61.5, 509.9, 3.8, BULLET_HEIGHT),
		run(
			"Refactored an application from Angular 2 to Angular 18 with SSR, boosting performance ratings from 20% to 90%",
			70.8,
			509.9,
			465.5,
			BODY_HEIGHT
		)
	]
];

export const SONATRACH_ROWS: readonly Row[] = [
	[run("Sonatrach", 46.8, 491.3, 49.5), run("Siracusa, Italy", 486, 491.3, 63.2)],
	[
		run("Software Engineer Intern", 46.8, 477.8, 100.6, BODY_HEIGHT),
		run("Jul 2023 – Oct 2023", 472.2, 477.8, 76.9, BODY_HEIGHT)
	],
	[run("Angular, ASP.NET Core, Microsoft SQL Server", 46.8, 466.1, 164.9, STACK_HEIGHT)],
	[
		run("•", 61.5, 454.5, 3.8, BULLET_HEIGHT),
		run(
			"Developed a multi-user Web Application to manage and visualize key operational telemetry values from refinery",
			70.8,
			454.5,
			462.6,
			BODY_HEIGHT
		)
	],
	[run("plants", 70.8, 441.2, 26, BODY_HEIGHT)]
];

export const AURUM_ROWS: readonly Row[] = [
	[
		run("Aurum", 46.8, 387.1, 29.7, BODY_HEIGHT),
		run(
			"Angular, Spring Boot, Spring AI MCP, PostgreSQL, Docker, Auth0, Vercel, Hetzner, Caddy",
			138.1,
			387.1,
			349.2,
			BODY_HEIGHT
		)
	],
	[
		run("•", 61.5, 375.2, 3.8, BULLET_HEIGHT),
		run(
			"Architected a full-stack wealth management platform (Spring Boot 4 / Angular 21) with multi-currency tracking, net",
			70.8,
			375.2,
			474.8,
			BODY_HEIGHT
		)
	],
	[
		run(
			"worth analytics, and Auth0 JWT security using a clean domain-driven design",
			70.8,
			362.1,
			315.2,
			BODY_HEIGHT
		)
	],
	[
		run("•", 61.5, 349.3, 3.8, BULLET_HEIGHT),
		run(
			"Integrated a custom MCP server exposing core financial metrics to AI assistants, enabling real-time LLM querying of",
			70.8,
			349.3,
			474.1,
			BODY_HEIGHT
		)
	],
	[run("assets and KPIs", 70.8, 336.2, 63.9, BODY_HEIGHT)]
];

export const FIT_CHECK_ROWS: readonly Row[] = [
	[
		run("FitCheck", 46.8, 320.3, 38.8, BODY_HEIGHT),
		run(
			"Swift, SwiftUI, SwiftData, Apple Intelligence, Open-Meteo API",
			195.9,
			320.3,
			242.9,
			BODY_HEIGHT
		)
	],
	[
		run("•", 61.5, 308.4, 3.8, BULLET_HEIGHT),
		run(
			"Engineered a privacy-first iOS personal stylist app leveraging Apple Intelligence and Vision Framework for daily outfit",
			70.8,
			308.4,
			480.6,
			BODY_HEIGHT
		)
	],
	[run("suggestions based on local weather and wardrobe data", 70.8, 295.4, 227.9, BODY_HEIGHT)],
	[
		run("•", 61.5, 282.5, 3.8, BULLET_HEIGHT),
		run(
			"Built a Digital Wardrobe System in SwiftUI/SwiftData with image segmentation and multi-select gestures, enforcing",
			70.8,
			282.5,
			474,
			BODY_HEIGHT
		)
	],
	[run("strict On-Device Data Sovereignty", 70.8, 269.5, 138.5, BODY_HEIGHT)]
];

export const GYM_BRO_ROWS: readonly Row[] = [
	[
		run("GymBro", 46.8, 253.6, 35.7, BODY_HEIGHT),
		run("React Native, Go, PostgreSQL, Docker", 240.4, 253.6, 150.4, BODY_HEIGHT)
	],
	[
		run("•", 61.5, 241.7, 3.8, BULLET_HEIGHT),
		run(
			"Fitness tracking native app featuring a custom UI component library designed for modern UX and improved",
			70.8,
			241.7,
			443.5,
			BODY_HEIGHT
		)
	],
	[run("performance", 70.8, 228.6, 53.6, BODY_HEIGHT)],
	[
		run("•", 61.5, 215.8, 3.8, BULLET_HEIGHT),
		run(
			"Architected a containerized Go backend connected to PostgreSQL, improving system throughput, scalability, and",
			70.8,
			215.8,
			465.7,
			BODY_HEIGHT
		)
	],
	[run("developer workflow", 70.8, 202.7, 82.8, BODY_HEIGHT)]
];

export const PISA_ROWS: readonly Row[] = [
	[run("University of Pisa", 46.8, 147.5, 84.6), run("Pisa, Italy", 505.6, 147.5, 43.6)],
	[
		run("Bachelor’s degree in Computer Science", 46.8, 133.9, 157.5, BODY_HEIGHT),
		run("Sep 2020 – Oct 2023", 469.3, 133.9, 79.9, BODY_HEIGHT)
	],
	[run("100/110", 46.8, 121.3, 36.3)]
];

export const EXPERIENCE_ROWS: readonly Row[] = [
	MARKER_ROWS.experience,
	...ONE_TAG_ROWS,
	...NTT_DATA_ROWS,
	...SONATRACH_ROWS
];

export const PROJECTS_ROWS: readonly Row[] = [
	MARKER_ROWS.projects,
	...AURUM_ROWS,
	...FIT_CHECK_ROWS,
	...GYM_BRO_ROWS
];

export const EDUCATION_ROWS: readonly Row[] = [MARKER_ROWS.education, ...PISA_ROWS];

/** Every line of the document, top to bottom, in the order `getTextContent()` reports it. */
export const DOCUMENT_ROWS: readonly Row[] = [
	...HEADER_ROWS,
	...EXPERIENCE_ROWS,
	...PROJECTS_ROWS,
	...EDUCATION_ROWS
];

export const CV_ANNOTATIONS: readonly LinkAnnotation[] = [
	{
		url: "https://www.linkedin.com/in/mariodimodica/",
		rect: [35.004, 770.594, 76.465, 786.136]
	},
	{ url: "https://github.com/Mxo01", rect: [81.867, 770.594, 116.074, 786.136] },
	{ url: "https://mariodimodica-portfolio.web.app/", rect: [121.475, 770.594, 159.718, 786.136] },
	{ url: "mailto:mariodimodica.01@gmail.com", rect: [297.41, 770.594, 439.802, 786.136] },
	{ url: "https://aurum-networth.com/", rect: [45.803, 382.471, 77.544, 396.419] }
];

/** The same row re-based: the page's reading order is `y` descending. */
export function at(row: Row, y: number): Row {
	return row.map(item => ({ ...item, y }));
}

/** A document from the rows a test states, flattened into pdf.js' one-run-per-cell list. */
export function documentOf(
	rows: readonly Row[] = DOCUMENT_ROWS,
	annotations: readonly LinkAnnotation[] = CV_ANNOTATIONS
): CvInput {
	return { items: rows.flat(), annotations };
}

/** The lines of the CV's contact block, named so a test can state the block's own shape. */
export const CONTACT_CHIPS = "LinkedIn | GitHub | Website";
export const CONTACT_FIELDS = "Email: mariodimodica.01@gmail.com | Mobile: +39 331 832 5722";
export const LINKEDIN_LINE = "LinkedIn https://www.linkedin.com/in/mariodimodica/";
export const GITHUB_LINE = "GitHub https://github.com/Mxo01";
export const WEBSITE_LINE = "Website https://mariodimodica-portfolio.web.app/";
export const EMAIL_LINE = "Email mailto:mariodimodica.01@gmail.com";

/** What `cat contact` prints: the fields, then the links the PDF hangs off them. */
export const CV_CONTACT_BODY: readonly string[] = [
	CONTACT_CHIPS,
	CONTACT_FIELDS,
	LINKEDIN_LINE,
	GITHUB_LINE,
	WEBSITE_LINE,
	EMAIL_LINE
];

/**
 * The sections the shipped document reads as. The parser and the tree both start here:
 * every entry keeps the PDF's own rows (a headline still carries both columns), the stack
 * stays a row of its own, and each wrapped bullet is one line again.
 */
export const CV_SECTIONS: readonly CvSection[] = [
	{
		title: "Header",
		body: [
			"Mario Di Modica",
			"Location: Pisa, Italy",
			"Software Engineer with deep expertise in Web Development and strong interest in AI integrations."
		]
	},
	{ title: "Contact", body: CV_CONTACT_BODY },
	{ title: "Experience", body: [] },
	{
		title: "OneTag",
		body: [
			"OneTag  Pisa, Italy",
			"Software Engineer  Jul 2025 – Present",
			"Angular, Java Spring Boot, Jest, Cypress, Git, React, Spring MCP AI, Vitest, System Design",
			"• Full ownership of the frontend for the new AdTech Curation platform, driving end-to-end development, seamless functionality, and architectural improvements",
			"• Brought full-stack system design capabilities, architecting scalable solutions and building custom Model Context Protocol (MCP) servers using Spring AI to integrate AI into core systems",
			"• Spearheaded a codebase refactor, reducing duplication from ~26% to 3%, raising test coverage from 0% to 85%, and achieving Straight-A SonarQube ratings in under a year"
		]
	},
	{
		title: "NTT DATA",
		body: [
			"NTT DATA  Pisa, Italy",
			"Software Engineer  Mar 2024 – Jul 2025",
			"Angular, Java Spring Boot, PostgreSQL, MongoDB, Docker",
			"• Led frontend development in an English-speaking team for a green computing project focused on carbon emissions calculation and reduction",
			"• Refactored an application from Angular 2 to Angular 18 with SSR, boosting performance ratings from 20% to 90%"
		]
	},
	{
		title: "Sonatrach",
		body: [
			"Sonatrach  Siracusa, Italy",
			"Software Engineer Intern  Jul 2023 – Oct 2023",
			"Angular, ASP.NET Core, Microsoft SQL Server",
			"• Developed a multi-user Web Application to manage and visualize key operational telemetry values from refinery plants"
		]
	},
	{ title: "Projects", body: [] },
	{
		title: "Aurum",
		body: [
			"Aurum  Angular, Spring Boot, Spring AI MCP, PostgreSQL, Docker, Auth0, Vercel, Hetzner, Caddy",
			"• Architected a full-stack wealth management platform (Spring Boot 4 / Angular 21) with multi-currency tracking, net worth analytics, and Auth0 JWT security using a clean domain-driven design",
			"• Integrated a custom MCP server exposing core financial metrics to AI assistants, enabling real-time LLM querying of assets and KPIs",
			"Aurum https://aurum-networth.com/"
		]
	},
	{
		title: "FitCheck",
		body: [
			"FitCheck  Swift, SwiftUI, SwiftData, Apple Intelligence, Open-Meteo API",
			"• Engineered a privacy-first iOS personal stylist app leveraging Apple Intelligence and Vision Framework for daily outfit suggestions based on local weather and wardrobe data",
			"• Built a Digital Wardrobe System in SwiftUI/SwiftData with image segmentation and multi-select gestures, enforcing strict On-Device Data Sovereignty"
		]
	},
	{
		title: "GymBro",
		body: [
			"GymBro  React Native, Go, PostgreSQL, Docker",
			"• Fitness tracking native app featuring a custom UI component library designed for modern UX and improved performance",
			"• Architected a containerized Go backend connected to PostgreSQL, improving system throughput, scalability, and developer workflow"
		]
	},
	{ title: "Education", body: [] },
	{
		title: "University of Pisa",
		body: [
			"University of Pisa  Pisa, Italy",
			"Bachelor’s degree in Computer Science  Sep 2020 – Oct 2023",
			"100/110"
		]
	}
];
