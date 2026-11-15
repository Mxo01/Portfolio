import {
	BASELINE,
	CONTACT_CHIPS,
	CONTACT_FIELDS,
	CV_ANNOTATIONS,
	CV_CONTACT_BODY,
	CV_SECTIONS,
	DOCUMENT_ROWS,
	EDUCATION_ROWS,
	EMAIL_LINE,
	EXPERIENCE_ROWS,
	GITHUB_LINE,
	HEADER_ROWS,
	LINKEDIN_LINE,
	MARKER_ROWS,
	MARKER_TEXT,
	ONE_TAG_ROWS,
	PROJECTS_ROWS,
	AURUM_ROWS,
	WEBSITE_LINE,
	at,
	documentOf,
	run
} from "@/test/fixtures/cv";
import type { Row } from "@/test/fixtures/cv";
import { CvParseError, parseCv } from "./parse";
import type { LinkAnnotation } from "./parse";

const testSubject = parseCv;

/** The periods and roles a minimal document states for itself. */
const PERIOD = "Jul 2025 – Present";
const ROLE = "Software Engineer";
const OTHER_ROLE = "Senior Software Engineer";

const CERTIFICATIONS = "CERTIFICATIONS";
const ORPHAN = "orphan";
const STACK = "TypeScript, Node";

/** Baselines a custom block states its entries on, each clear of its neighbours. */
const CUSTOM = { headline: 700, role: 690, stack: 680, line: 670 } as const;
const SECOND_ENTRY = 650;
const THIRD_ENTRY = 610;
const PROJECT_CUSTOM = { headline: 400, line: 390 } as const;

/** Two cells on one baseline: the document's `Company` / `City, Country` shape. */
function columns(left: string, right: string, y: number): Row {
	return [run(left, 46.8, y, 120), run(right, 505.6, y, 60)];
}

/** One cell on one baseline: a stack, a bullet, a stray line. */
function line(text: string, y: number): Row {
	return [run(text, 46.8, y, 120)];
}

function textOf(row: Row): string {
	return row[0]?.text ?? "";
}

/** The last line of a block: the line a count failure names. */
function lastOf(rows: readonly Row[]): string {
	return textOf(rows[rows.length - 1] ?? []);
}

/** One experience entry: headline, role line, then whatever body the case needs. */
function experienceEntry(title: string, y: number, body: readonly Row[]): readonly Row[] {
	return [
		columns(title, "Pisa, Italy", y),
		columns(ROLE, PERIOD, y - 10),
		...body.map((row, index) => shift(row, y - 20 - index * 10))
	];
}

function shift(row: Row, y: number): Row {
	return at(row, y);
}

function bullet(text: string, y: number): Row {
	return [run(`• ${text}`, 61.5, y, 400)];
}

describe("parseCv", () => {
	it("reads the shipped document into its sections", () => {
		// GIVEN the CV this site publishes, as pdf.js reports it
		// WHEN the layout contract reads it
		// THEN every section, field and bullet is the document's own text
		expect(testSubject(documentOf())).toEqual(CV_SECTIONS);
	});

	it("keeps the document's order whatever order the runs arrive in", () => {
		const { items, annotations } = documentOf();

		expect(testSubject({ items: [...items].reverse(), annotations })).toEqual(CV_SECTIONS);
	});

	it("drops blank runs instead of reading them as lines", () => {
		const { items, annotations } = documentOf();
		const blanks = [run("   ", 0, CUSTOM.headline, 10), run("", 36, CUSTOM.role, 10)];

		expect(testSubject({ items: [...blanks, ...items], annotations })).toEqual(CV_SECTIONS);
	});

	it("reads a document with no link annotations as sections with no links", () => {
		const { items } = documentOf();

		const sections = testSubject({ items });

		expect(sections[1]?.body).toEqual([CONTACT_CHIPS, CONTACT_FIELDS]);
		expect(sections.find(section => section.title === "Aurum")?.body).toEqual(
			CV_SECTIONS.find(section => section.title === "Aurum")?.body.filter(
				line => !line.includes("https://")
			)
		);
	});

	it("states no contact block when the header carries none", () => {
		const rows = [
			...HEADER_ROWS.filter(row => textOf(row) !== "LinkedIn"),
			...EXPERIENCE_ROWS,
			...PROJECTS_ROWS,
			...EDUCATION_ROWS
		];

		const [header, contact] = testSubject(documentOf(rows, []));

		expect(header?.body).toEqual([
			"Mario Di Modica",
			"Location: Pisa, Italy",
			"Software Engineer with deep expertise in Web Development and strong interest in AI integrations."
		]);
		expect(contact).toEqual({ title: "Contact", body: [] });
	});
});

interface AnnotationCase {
	readonly case: string;
	readonly annotations: readonly LinkAnnotation[];
	readonly rows?: readonly Row[];
	readonly body: readonly string[];
}

const ANNOTATION_BOTTOM = 770.594;
const ANNOTATION_TOP = 786.136;
const COLON_ROW: Row = [run(":", 36, BASELINE.contact - 6, 5)];
/** A label two annotations claim: the second keeps the word and loses the address. */
const LINKEDIN_LABEL_ONLY = "LinkedIn";

describe("parseCv annotations", () => {
	const annotationCases: readonly AnnotationCase[] = [
		{
			case: "attaches each link to the label it covers",
			annotations: CV_ANNOTATIONS,
			body: CV_CONTACT_BODY
		},
		{
			case: "orders one line's links by where each starts",
			annotations: [...CV_ANNOTATIONS].reverse(),
			body: CV_CONTACT_BODY
		},
		{
			case: "keeps the label and drops the target when one link covers two fields",
			annotations: [
				{
					url: "https://www.linkedin.com/in/mariodimodica/",
					rect: [35.004, 770.594, 76.465, 786.136]
				},
				{ url: "https://github.com/Mxo01", rect: [81.867, 770.594, 116.074, 786.136] },
				{
					url: "https://mariodimodica-portfolio.web.app/",
					rect: [121.475, 770.594, 159.718, 786.136]
				},
				{
					url: "mailto:mariodimodica.01@gmail.com",
					rect: [260, ANNOTATION_BOTTOM, 560, ANNOTATION_TOP]
				}
			],
			body: [CONTACT_CHIPS, CONTACT_FIELDS, LINKEDIN_LINE, GITHUB_LINE, WEBSITE_LINE, "Email"]
		},
		{
			case: "keeps the label and drops the target when one label is claimed twice",
			annotations: [
				...CV_ANNOTATIONS,
				{
					url: "https://example.test/duplicate",
					rect: [45.004, ANNOTATION_BOTTOM, 70, ANNOTATION_TOP]
				}
			],
			body: [
				CONTACT_CHIPS,
				CONTACT_FIELDS,
				LINKEDIN_LINE,
				LINKEDIN_LABEL_ONLY,
				GITHUB_LINE,
				WEBSITE_LINE,
				EMAIL_LINE
			]
		},
		{
			case: "drops a link no line of text sits under",
			annotations: [...CV_ANNOTATIONS, { url: "https://example.test/", rect: [0, 0, 10, 10] }],
			body: CV_CONTACT_BODY
		},
		{
			case: "drops a link that covers no cell",
			annotations: [
				...CV_ANNOTATIONS,
				{ url: "https://example.test/", rect: [0, ANNOTATION_BOTTOM, 10, ANNOTATION_TOP] }
			],
			body: CV_CONTACT_BODY
		},
		{
			case: "drops a box too short to be a rectangle",
			annotations: [
				...CV_ANNOTATIONS,
				{ url: "https://example.test/", rect: [35.004, ANNOTATION_BOTTOM] }
			],
			body: CV_CONTACT_BODY
		},
		{
			case: "drops a label no cell states",
			annotations: [
				...CV_ANNOTATIONS,
				{
					url: "https://example.test/",
					rect: [34, ANNOTATION_BOTTOM - 5, 45, ANNOTATION_TOP - 5]
				}
			],
			rows: [...HEADER_ROWS, COLON_ROW, ...EXPERIENCE_ROWS, ...PROJECTS_ROWS, ...EDUCATION_ROWS],
			body: CV_CONTACT_BODY
		}
	];

	it.each(annotationCases)("$case", ({ annotations, rows, body }) => {
		const sections = testSubject(documentOf(rows ?? DOCUMENT_ROWS, annotations));

		expect(sections[1]?.body).toEqual(body);
	});
});

interface Refusal {
	readonly case: string;
	readonly rows: readonly Row[];
	readonly message: string;
	readonly line: string;
}

/** The document with one block of rows taken out, by identity. */
function without(rows: readonly Row[], drop: readonly Row[]): readonly Row[] {
	return rows.filter(row => !drop.includes(row));
}

const refusals: readonly Refusal[] = [
	{
		case: "refuses a document with no experience section",
		rows: [...HEADER_ROWS, ...PROJECTS_ROWS, ...EDUCATION_ROWS],
		message: `missing section "${MARKER_TEXT.experience}"`,
		line: MARKER_TEXT.projects
	},
	{
		case: "refuses a document with no projects section",
		rows: [...HEADER_ROWS, ...EXPERIENCE_ROWS, ...EDUCATION_ROWS],
		message: `missing section "${MARKER_TEXT.projects}"`,
		line: MARKER_TEXT.education
	},
	{
		case: "refuses a document with no education section",
		rows: [...HEADER_ROWS, ...EXPERIENCE_ROWS, ...PROJECTS_ROWS],
		message: `missing section "${MARKER_TEXT.education}"`,
		line: lastOf(PROJECTS_ROWS)
	},
	{
		case: "refuses a section declared twice",
		rows: [...DOCUMENT_ROWS, at(MARKER_ROWS.experience, BASELINE.profile + 40)],
		message: `section "${MARKER_TEXT.experience}" is declared twice`,
		line: MARKER_TEXT.experience
	},
	{
		case: "refuses sections out of order",
		rows: DOCUMENT_ROWS.map(row =>
			row === MARKER_ROWS.experience ? at(row, BASELINE.projects - 40) : row
		),
		message: `section "${MARKER_TEXT.projects}" is out of order`,
		line: MARKER_TEXT.projects
	},
	{
		case: "refuses a document with no header block",
		rows: [...EXPERIENCE_ROWS, ...PROJECTS_ROWS, ...EDUCATION_ROWS],
		message: "the header block is missing",
		line: MARKER_TEXT.experience
	},
	{
		case: "refuses a role line before any entry",
		rows: [
			...HEADER_ROWS,
			MARKER_ROWS.experience,
			columns(ROLE, PERIOD, CUSTOM.headline),
			MARKER_ROWS.projects,
			MARKER_ROWS.education
		],
		message: `role line before any entry in ${MARKER_TEXT.experience}`,
		line: `${ROLE}  ${PERIOD}`
	},
	{
		case: "refuses an entry with two role lines",
		rows: [
			...HEADER_ROWS,
			MARKER_ROWS.experience,
			columns("Acme", "Pisa, Italy", CUSTOM.headline),
			columns(ROLE, PERIOD, CUSTOM.role),
			columns(OTHER_ROLE, PERIOD, CUSTOM.stack),
			MARKER_ROWS.projects,
			MARKER_ROWS.education
		],
		message: 'entry "Acme" has two role lines',
		line: `${OTHER_ROLE}  ${PERIOD}`
	},
	{
		case: "refuses an entry with no role or period line",
		rows: [
			...HEADER_ROWS,
			MARKER_ROWS.experience,
			columns("Acme", "Pisa, Italy", CUSTOM.headline),
			bullet("did the work", CUSTOM.role),
			MARKER_ROWS.projects,
			MARKER_ROWS.education
		],
		message: 'entry "Acme" has no role or period line',
		line: "Acme  Pisa, Italy"
	},
	{
		case: "refuses a line outside any entry in the experience group",
		rows: [
			...HEADER_ROWS,
			MARKER_ROWS.experience,
			line(ORPHAN, CUSTOM.headline),
			MARKER_ROWS.projects,
			MARKER_ROWS.education
		],
		message: `line outside any entry in ${MARKER_TEXT.experience}`,
		line: ORPHAN
	},
	{
		case: "refuses a line outside any entry in the projects group",
		rows: [
			...HEADER_ROWS,
			...EXPERIENCE_ROWS,
			MARKER_ROWS.projects,
			line(ORPHAN, PROJECT_CUSTOM.headline),
			MARKER_ROWS.education
		],
		message: `line outside any entry in ${MARKER_TEXT.projects}`,
		line: ORPHAN
	},
	{
		case: "refuses an unknown section inside the experience group",
		rows: [
			...HEADER_ROWS,
			MARKER_ROWS.experience,
			columns("Acme", "Pisa, Italy", CUSTOM.headline),
			columns(ROLE, PERIOD, CUSTOM.role),
			line(CERTIFICATIONS, CUSTOM.stack),
			MARKER_ROWS.projects,
			MARKER_ROWS.education
		],
		message: `unknown section inside ${MARKER_TEXT.experience}`,
		line: CERTIFICATIONS
	},
	{
		case: "refuses an unknown section inside the projects group",
		rows: [
			...HEADER_ROWS,
			...EXPERIENCE_ROWS,
			MARKER_ROWS.projects,
			...Array.from({ length: 3 }, (_, index) =>
				columns(`Project ${index}`, "TypeScript", PROJECT_CUSTOM.headline - index * 30)
			),
			line(CERTIFICATIONS, PROJECT_CUSTOM.headline - 90),
			MARKER_ROWS.education
		],
		message: `unknown section inside ${MARKER_TEXT.projects}`,
		line: CERTIFICATIONS
	},
	{
		case: "refuses a bullet continuation that follows no bullet",
		rows: [
			...HEADER_ROWS,
			MARKER_ROWS.experience,
			...experienceEntry("Acme", CUSTOM.headline, [line(STACK, 0), line(ORPHAN, 0)]),
			...experienceEntry("Beta", SECOND_ENTRY, [bullet("shipped", 0)]),
			...experienceEntry("Gamma", THIRD_ENTRY, [bullet("shipped", 0)]),
			MARKER_ROWS.projects,
			MARKER_ROWS.education
		],
		message: 'unplaced line in entry "Acme"',
		line: ORPHAN
	},
	{
		case: "refuses a bullet continuation that opens a project",
		rows: [
			...HEADER_ROWS,
			...EXPERIENCE_ROWS,
			MARKER_ROWS.projects,
			columns("Acme", "TypeScript", PROJECT_CUSTOM.headline),
			line(ORPHAN, PROJECT_CUSTOM.line),
			columns("Beta", "Go", PROJECT_CUSTOM.headline - 40),
			bullet("shipped", PROJECT_CUSTOM.headline - 50),
			columns("Gamma", "Rust", PROJECT_CUSTOM.headline - 80),
			bullet("shipped", PROJECT_CUSTOM.headline - 90),
			MARKER_ROWS.education
		],
		message: 'unplaced line in entry "Acme"',
		line: ORPHAN
	},
	{
		case: "refuses fewer than three experience entries",
		rows: [
			...HEADER_ROWS,
			...without(EXPERIENCE_ROWS, ONE_TAG_ROWS),
			...PROJECTS_ROWS,
			...EDUCATION_ROWS
		],
		message: `expected at least 3 ${MARKER_TEXT.experience} entries, found 2`,
		line: "plants"
	},
	{
		case: "refuses an empty experience group",
		rows: [...HEADER_ROWS, MARKER_ROWS.experience, MARKER_ROWS.projects, MARKER_ROWS.education],
		message: `expected at least 3 ${MARKER_TEXT.experience} entries, found 0`,
		line: MARKER_TEXT.projects
	},
	{
		case: "refuses fewer than three project entries",
		rows: [
			...HEADER_ROWS,
			...EXPERIENCE_ROWS,
			...without(PROJECTS_ROWS, AURUM_ROWS),
			...EDUCATION_ROWS
		],
		message: `expected at least 3 ${MARKER_TEXT.projects} entries, found 2`,
		line: "developer workflow"
	},
	{
		case: "refuses a document with no education entry",
		rows: [...HEADER_ROWS, ...EXPERIENCE_ROWS, ...PROJECTS_ROWS, MARKER_ROWS.education],
		message: "no education entry",
		line: MARKER_TEXT.education
	}
];

/** The refusal a document earns. Fails the test when the document is accepted. */
function refusalOf(rows: readonly Row[]): CvParseError {
	try {
		testSubject(documentOf(rows));
	} catch (error) {
		if (error instanceof CvParseError) return error;
		throw error;
	}

	throw new Error("the document was parsed");
}

describe("parseCv refusals", () => {
	it.each(refusals)("$case", ({ rows, message, line }) => {
		// GIVEN a document the layout contract cannot place
		const error = refusalOf(rows);

		// WHEN it is read, THEN the failure names the reason and the line
		expect(error.name).toBe("CvParseError");
		expect(error.message).toBe(message);
		expect(error.line).toBe(line);
	});
});

describe("CvParseError", () => {
	it("names itself and the line it could not place", () => {
		const error = new CvParseError("boom", "the line");

		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("CvParseError");
		expect(error.message).toBe("boom");
		expect(error.line).toBe("the line");
	});

	it("carries no line when none applies", () => {
		expect(new CvParseError("boom").line).toBeUndefined();
	});
});
