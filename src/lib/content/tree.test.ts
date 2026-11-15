import type { CvSection } from "@/lib/cv";
import { fileAt } from "@/lib/terminal/output";
import { resolvePath } from "@/lib/terminal/path";
import { EXPORT_CV_SCRIPT } from "@/lib/terminal/script-data";
import type { ExecutableFile } from "@/lib/terminal/script-data";
import type { ContentDir, ContentFile, ContentSection, TreeNode } from "@/lib/terminal/types";
import {
	CONTACT_CHIPS,
	CONTACT_FIELDS,
	CV_SECTIONS,
	EMAIL_LINE,
	GITHUB_LINE,
	LINKEDIN_LINE,
	WEBSITE_LINE
} from "@/test/fixtures/cv";
import {
	buildContent,
	sectionValue,
	TITLE_DEGREE,
	TITLE_EMAIL,
	TITLE_GRADE,
	TITLE_HIGHLIGHTS,
	TITLE_LINKS,
	TITLE_LOCATION,
	TITLE_MOBILE,
	TITLE_NAME,
	TITLE_NOTES,
	TITLE_PERIOD,
	TITLE_ROLE,
	TITLE_STACK,
	TITLE_SUMMARY
} from "./tree";

const testSubject = buildContent;

/** The root the shell resolves from, and the titles the document marks its groups with. */
const HOME = "/";
const HEADER = "Header";
const CONTACT = "Contact";
const EXPERIENCE = "Experience";
const PROJECTS = "Projects";
const EDUCATION = "Education";

/** The header's own strings, as the shipped document states them. */
const CV_NAME = "Mario Di Modica";
const CV_CITY = "Pisa, Italy";
const CV_ROLE = "Software Engineer";
const CV_SUMMARY =
	"Software Engineer with deep expertise in Web Development and strong interest in AI integrations.";

/** The contact block's values: the fields the labelled row states, and the address it opens. */
const EMAIL_ADDRESS = "mariodimodica.01@gmail.com";
const MOBILE_NUMBER = "+39 331 832 5722";

/** The other entries' own strings, one field each, named where a test asserts them. */
const ONE_TAG_STACK =
	"Angular, Java Spring Boot, Jest, Cypress, Git, React, Spring MCP AI, Vitest, System Design";
const SONATRACH_ROLE = "Software Engineer Intern";
const SONATRACH_PERIOD = "Jul 2023 – Oct 2023";
const AURUM_LINK = "Aurum https://aurum-networth.com/";
const PISA_DEGREE = "Bachelor’s degree in Computer Science";
const PISA_GRADE = "100/110";
const DOWNLOAD_CV = "download-cv";

/** The document's nodes, depth first, in the order the CV states them. */
const EXPECTED_PATHS = [
	"/about",
	"/about/profile",
	"/about/summary",
	"/career",
	"/career/onetag",
	"/career/ntt-data",
	"/career/sonatrach",
	"/education",
	"/education/university-of-pisa",
	"/projects",
	"/projects/aurum",
	"/projects/fitcheck",
	"/projects/gymbro",
	"/contact",
	"/cv.pdf",
	"/export_cv.sh"
] as const;

const document = testSubject(CV_SECTIONS);

/** A node of a projection by absolute path; every path a test asks for is expected to exist. */
function nodeAt(root: ContentDir, path: string): TreeNode {
	const found = resolvePath(HOME, path, root);
	if (found === null) throw new Error(`the projection has no ${path}`);
	return found;
}

/** One field of a projected file, by the title the projection gave it. */
function field(root: ContentDir, path: string, title: string): string | undefined {
	const file = fileAt(root, path);
	if (file === null) throw new Error(`the projection has no file ${path}`);
	return sectionValue(file.sections, title);
}

/** The titles a file carries, in the order it prints them. */
function titlesOf(file: ContentFile | null): readonly string[] {
	return file === null ? [] : file.sections.map(section => section.title);
}

/** Every line a file prints, whatever section it sits in. */
function textsOf(file: ContentFile | null): readonly string[] {
	return file === null ? [] : file.sections.flatMap(section => section.body);
}

function isExecutable(file: ContentFile): file is ExecutableFile {
	return "script" in file && "executable" in file;
}

function executableAt(root: ContentDir, path: string): ExecutableFile {
	const found = fileAt(root, path);
	if (found === null || !isExecutable(found)) throw new Error(`${path} is not an executable`);
	return found;
}

/** Every node's path, depth first, from a directory down. */
function pathsOf(root: ContentDir): readonly string[] {
	return root.children.flatMap(child => [
		child.path,
		...(child.kind === "dir" ? pathsOf(child) : [])
	]);
}

function block(title: string, body: readonly string[] = []): CvSection {
	return { title, body };
}

/** A document holding one group's marker and the entries printed under it. */
function groupDocument(marker: string, ...entries: readonly CvSection[]): ContentDir {
	return testSubject([block(marker), ...entries]);
}

/** A document whose only block is a contact block stating `body`. */
function contactDocument(body: readonly string[]): ContentDir {
	return testSubject([block(CONTACT, body)]);
}

/** A header block whose third line is the one the role is derived from. */
function headerDocument(...body: readonly string[]): ContentDir {
	return testSubject([block(HEADER, body)]);
}

describe("buildContent — the filesystem", () => {
	it("starts at the root the shell resolves from", () => {
		expect(document).toMatchObject({ kind: "dir", name: HOME, path: HOME });
	});

	it("publishes the CV's files, each under the path its parent spells", () => {
		expect(pathsOf(document)).toEqual(EXPECTED_PATHS);
	});

	const directories = [
		{ name: "about", path: "/about" },
		{ name: "career", path: "/career" },
		{ name: "education", path: "/education" },
		{ name: "projects", path: "/projects" }
	];

	it.each(directories)("opens $path as a directory named $name", ({ name, path }) => {
		expect(nodeAt(document, path)).toMatchObject({ kind: "dir", name, path });
	});

	it("publishes no entry for a group the CV does not state", () => {
		const headerOnly = testSubject([block(HEADER, [CV_NAME, `Location: ${CV_CITY}`, CV_SUMMARY])]);

		expect(pathsOf(headerOnly)).toEqual([
			"/about",
			"/about/profile",
			"/about/summary",
			"/career",
			"/education",
			"/projects",
			"/contact",
			"/cv.pdf",
			"/export_cv.sh"
		]);
	});

	it("keeps a directory the document leaves empty", () => {
		const emptyHeader = testSubject([block(HEADER)]);

		expect(nodeAt(emptyHeader, "/about")).toEqual({
			kind: "dir",
			name: "about",
			path: "/about",
			children: []
		});
	});
});

describe("buildContent — the header", () => {
	it("splits the header into the name, the role and the city", () => {
		expect(fileAt(document, "/about/profile")?.sections).toEqual([
			{ title: TITLE_NAME, body: [CV_NAME] },
			{ title: TITLE_ROLE, body: [CV_ROLE] },
			{ title: TITLE_LOCATION, body: [CV_CITY] }
		]);
	});

	it("keeps the summary sentence whole", () => {
		expect(field(document, "/about/summary", TITLE_SUMMARY)).toBe(CV_SUMMARY);
	});

	it("keeps every line under the summary as the prose it is", () => {
		const second = "Open to remote work across Europe.";
		const root = headerDocument(
			CV_NAME,
			`Location: ${CV_CITY}`,
			`${CV_ROLE} building calm systems`,
			second
		);

		expect(fileAt(root, "/about/summary")?.sections).toEqual([
			{ title: TITLE_SUMMARY, body: [`${CV_ROLE} building calm systems`, second] }
		]);
	});

	const roleCases: readonly {
		readonly case: string;
		readonly line: string;
		readonly role: string;
	}[] = [
		{ case: "the PDF collapses the two columns", line: CV_SUMMARY, role: CV_ROLE },
		{
			case: "the PDF keeps its column gutter",
			line: `${CV_ROLE}  with deep expertise in Web Development`,
			role: CV_ROLE
		},
		{ case: "the line is the role alone", line: CV_ROLE, role: CV_ROLE },
		{
			case: "the role runs over several capitalised words",
			line: "Staff Engineer at Acme Corp",
			role: "Staff Engineer"
		}
	];

	it.each(roleCases)("reads the role when $case", ({ line, role }) => {
		const root = headerDocument(CV_NAME, `Location: ${CV_CITY}`, line);

		expect(field(root, "/about/profile", TITLE_ROLE)).toBe(role);
	});

	it("reads a city the header states with or without its label", () => {
		const labelled = headerDocument(CV_NAME, `Location: ${CV_CITY}`, CV_SUMMARY);
		const bare = headerDocument(CV_NAME, CV_CITY, CV_SUMMARY);

		expect(field(labelled, "/about/profile", TITLE_LOCATION)).toBe(CV_CITY);
		expect(field(bare, "/about/profile", TITLE_LOCATION)).toBe(CV_CITY);
	});

	it("publishes no profile and no summary for a header with no lines", () => {
		const root = testSubject([block(HEADER)]);

		expect(fileAt(root, "/about/profile")).toBeNull();
		expect(fileAt(root, "/about/summary")).toBeNull();
	});
});

describe("buildContent — career", () => {
	it("derives an experience entry's fields from the PDF's two columns", () => {
		const entry = fileAt(document, "/career/onetag");

		expect(titlesOf(entry)).toEqual([
			TITLE_NAME,
			TITLE_ROLE,
			TITLE_PERIOD,
			TITLE_LOCATION,
			TITLE_STACK,
			TITLE_HIGHLIGHTS
		]);
		expect(field(document, "/career/onetag", TITLE_NAME)).toBe("OneTag");
		expect(field(document, "/career/onetag", TITLE_ROLE)).toBe(CV_ROLE);
		expect(field(document, "/career/onetag", TITLE_PERIOD)).toBe("Jul 2025 – Present");
		expect(field(document, "/career/onetag", TITLE_LOCATION)).toBe(CV_CITY);
		expect(field(document, "/career/onetag", TITLE_STACK)).toBe(ONE_TAG_STACK);
	});

	it("keeps every bullet of an entry verbatim, glyph and all", () => {
		const source = CV_SECTIONS.find(section => section.title === "OneTag");
		const bullets = (source?.body ?? []).filter(line => line.startsWith("• "));
		const highlights = fileAt(document, "/career/onetag")?.sections.find(
			section => section.title === TITLE_HIGHLIGHTS
		);

		expect(bullets.length).toBeGreaterThan(0);
		expect(highlights?.body).toEqual(bullets);
	});

	it("slugs an employer the way the shell can address it", () => {
		expect(nodeAt(document, "/career/ntt-data")).toMatchObject({
			kind: "file",
			name: "ntt-data",
			path: "/career/ntt-data"
		});
	});

	it("reads a later entry's role and period from its own line", () => {
		expect(field(document, "/career/sonatrach", TITLE_ROLE)).toBe(SONATRACH_ROLE);
		expect(field(document, "/career/sonatrach", TITLE_PERIOD)).toBe(SONATRACH_PERIOD);
	});

	it("keeps the group directory empty when the marker has no entries", () => {
		const root = testSubject([block(EXPERIENCE)]);

		expect(nodeAt(root, "/career")).toMatchObject({ kind: "dir", children: [] });
	});

	it("names an entry by its section when the headline has no columns", () => {
		const root = groupDocument(
			EXPERIENCE,
			block("Freelance", ["", "Independent  Jan 2024 – Mar 2024"])
		);

		expect(field(root, "/career/freelance", TITLE_NAME)).toBe("Freelance");
		expect(field(root, "/career/freelance", TITLE_ROLE)).toBe("Independent");
		expect(field(root, "/career/freelance", TITLE_PERIOD)).toBe("Jan 2024 – Mar 2024");
	});

	it("drops the fields an entry does not state", () => {
		const root = groupDocument(EXPERIENCE, block("Freelance", ["Freelance"]));

		expect(titlesOf(fileAt(root, "/career/freelance"))).toEqual([TITLE_NAME]);
	});

	it("keeps a wrapped line beside the bullets instead of losing it", () => {
		const root = groupDocument(
			EXPERIENCE,
			block("Acme", [
				"Acme  Pisa, Italy",
				"Engineer  Jan 2020 – Jan 2021",
				"• First bullet",
				"and the sentence it wraps into"
			])
		);

		expect(field(root, "/career/acme", TITLE_HIGHLIGHTS)).toBe("• First bullet");
		expect(
			fileAt(root, "/career/acme")?.sections.find(s => s.title === TITLE_HIGHLIGHTS)?.body
		).toEqual(["• First bullet", "and the sentence it wraps into"]);
	});

	it("keeps a link annotation out of the bullets", () => {
		const root = groupDocument(
			EXPERIENCE,
			block("Acme", [
				"Acme  Pisa, Italy",
				"Engineer  Jan 2020 – Jan 2021",
				"• First bullet",
				"Acme https://acme.example"
			])
		);

		expect(fileAt(root, "/career/acme")?.sections.find(s => s.title === TITLE_LINKS)?.body).toEqual(
			["Acme https://acme.example"]
		);
		expect(field(root, "/career/acme", TITLE_HIGHLIGHTS)).toBe("• First bullet");
	});
});

describe("buildContent — projects", () => {
	it("reads the project's stack off its headline and its link off the body", () => {
		const entry = fileAt(document, "/projects/aurum");

		expect(titlesOf(entry)).toEqual([TITLE_NAME, TITLE_STACK, TITLE_HIGHLIGHTS, TITLE_LINKS]);
		expect(field(document, "/projects/aurum", TITLE_STACK)).toBe(
			"Angular, Spring Boot, Spring AI MCP, PostgreSQL, Docker, Auth0, Vercel, Hetzner, Caddy"
		);
		expect(field(document, "/projects/aurum", TITLE_LINKS)).toBe(AURUM_LINK);
	});

	it("takes the stack from the body when the headline states only the name", () => {
		const root = groupDocument(
			PROJECTS,
			block("Solo", ["Solo", "TypeScript, React", "• Built the thing"])
		);

		expect(field(root, "/projects/solo", TITLE_STACK)).toBe("TypeScript, React");
	});

	it("names a project by its section when the headline is blank", () => {
		const root = groupDocument(PROJECTS, block("Portfolio", ["", "• Built the thing"]));

		expect(field(root, "/projects/portfolio", TITLE_NAME)).toBe("Portfolio");
	});

	it("publishes a project that states a link and no bullet", () => {
		const root = groupDocument(
			PROJECTS,
			block("Tool", ["Tool  TypeScript", "TypeScript, React", "Tool https://tool.example"])
		);

		expect(titlesOf(fileAt(root, "/projects/tool"))).toEqual([
			TITLE_NAME,
			TITLE_STACK,
			TITLE_LINKS
		]);
	});

	const slugCases: readonly { readonly name: string; readonly slug: string }[] = [
		{ name: "FitCheck", slug: "fitcheck" },
		{ name: "GymBro", slug: "gymbro" },
		{ name: "Université de Pisa", slug: "universite-de-pisa" },
		{ name: ".NET Tool (preview)", slug: "net-tool-preview" }
	];

	it.each(slugCases)("slugs $name as $slug", ({ name, slug }) => {
		const root = groupDocument(PROJECTS, block(name, [`${name}  TypeScript`, "• Built it"]));

		expect(pathsOf(root)).toContain(`/projects/${slug}`);
	});
});

describe("buildContent — education", () => {
	it("derives the degree, its dates, the city and the grade", () => {
		const entry = fileAt(document, "/education/university-of-pisa");

		expect(titlesOf(entry)).toEqual([
			TITLE_NAME,
			TITLE_DEGREE,
			TITLE_PERIOD,
			TITLE_LOCATION,
			TITLE_GRADE
		]);
		expect(field(document, "/education/university-of-pisa", TITLE_NAME)).toBe("University of Pisa");
		expect(field(document, "/education/university-of-pisa", TITLE_DEGREE)).toBe(PISA_DEGREE);
		expect(field(document, "/education/university-of-pisa", TITLE_PERIOD)).toBe(
			"Sep 2020 – Oct 2023"
		);
		expect(field(document, "/education/university-of-pisa", TITLE_LOCATION)).toBe(CV_CITY);
		expect(field(document, "/education/university-of-pisa", TITLE_GRADE)).toBe(PISA_GRADE);
	});

	it("reads an Education section with a body as the entry itself", () => {
		const root = testSubject([
			block(EDUCATION, [
				"Université de Pisa  Pisa, Italy",
				"Master’s degree in Computer Science  Sep 2020 – Oct 2023",
				"110/110"
			])
		]);

		expect(pathsOf(root)).toContain("/education/universite-de-pisa");
		expect(field(root, "/education/universite-de-pisa", TITLE_GRADE)).toBe("110/110");
	});

	it("keeps the lines under the grade as notes", () => {
		const root = groupDocument(
			EDUCATION,
			block("Uni", [
				"Uni  Pisa, Italy",
				"Bachelor’s degree  Sep 2020 – Oct 2023",
				"100/110",
				"Thesis on distributed systems"
			])
		);

		expect(
			fileAt(root, "/education/uni")?.sections.find(s => s.title === TITLE_NOTES)?.body
		).toEqual(["Thesis on distributed systems"]);
	});

	it("names an entry by its section when the headline has no columns", () => {
		const root = groupDocument(EDUCATION, block("Self-taught", ["", ""]));

		expect(titlesOf(fileAt(root, "/education/self-taught"))).toEqual([TITLE_NAME]);
	});
});

describe("buildContent — contact", () => {
	it("reads the labelled row as fields and the annotations as links", () => {
		expect(fileAt(document, "/contact")?.sections).toEqual([
			{ title: TITLE_EMAIL, body: [EMAIL_ADDRESS] },
			{ title: TITLE_MOBILE, body: [MOBILE_NUMBER] },
			{ title: TITLE_LINKS, body: [LINKEDIN_LINE, GITHUB_LINE] }
		]);
	});

	it("drops the site's own link, which points at the shell the visitor is in", () => {
		const contact = fileAt(document, "/contact");

		expect(textsOf(contact)).not.toContain(WEBSITE_LINE);
		expect(textsOf(contact)).toContain(LINKEDIN_LINE);
	});

	it("drops an annotation that only repeats a field", () => {
		expect(textsOf(fileAt(document, "/contact"))).not.toContain(EMAIL_LINE);
	});

	it("drops the chip row, which is layout and not contact", () => {
		const contact = fileAt(document, "/contact");

		expect(textsOf(contact)).not.toContain(CONTACT_CHIPS);
		expect(titlesOf(contact)).not.toContain("Website");
	});

	it("keeps a line it cannot read under Notes, word for word", () => {
		const root = contactDocument([`Email: ${EMAIL_ADDRESS}`, "Available from June 2026"]);

		expect(fileAt(root, "/contact")?.sections).toEqual([
			{ title: TITLE_EMAIL, body: [EMAIL_ADDRESS] },
			{ title: TITLE_NOTES, body: ["Available from June 2026"] }
		]);
	});

	it("keeps a row whole when one of its cells is not a field", () => {
		const row = `Email: ${EMAIL_ADDRESS} | GitHub`;
		const root = contactDocument([row]);

		expect(fileAt(root, "/contact")?.sections).toEqual([{ title: TITLE_NOTES, body: [row] }]);
	});

	it("publishes an empty contact file when the block states no field", () => {
		const root = contactDocument([CONTACT_CHIPS]);

		expect(fileAt(root, "/contact")).toEqual({
			kind: "file",
			name: "contact",
			path: "/contact",
			sections: []
		});
	});
});

describe("buildContent — cv.pdf", () => {
	it("prints the document block for block, in the CV's own order", () => {
		const cv = fileAt(document, "/cv.pdf");

		expect(titlesOf(cv)).toEqual(CV_SECTIONS.map(section => section.title));
	});

	it("agrees with the contact file about the row the shell omits", () => {
		const body = fileAt(document, "/cv.pdf")?.sections.find(s => s.title === CONTACT)?.body ?? [];

		expect(body).not.toContain(WEBSITE_LINE);
		expect(body).toContain(CONTACT_FIELDS);
		expect(body).toContain(LINKEDIN_LINE);
	});

	it("leaves every other block exactly as the parser stated it", () => {
		const printed = fileAt(document, "/cv.pdf")?.sections.filter(s => s.title !== CONTACT) ?? [];
		const stated = CV_SECTIONS.filter(section => section.title !== CONTACT);

		expect(printed).toEqual(stated);
	});

	it("prints a section outside the known groups without publishing it", () => {
		const stray = block("Certifications", ["AWS Certified Developer"]);
		const root = testSubject([...CV_SECTIONS.slice(0, 2), stray, ...CV_SECTIONS.slice(2)]);

		expect(titlesOf(fileAt(root, "/cv.pdf"))).toContain("Certifications");
		expect(pathsOf(root)).toEqual(EXPECTED_PATHS);
	});
});

describe("buildContent — export_cv.sh", () => {
	it("publishes the exporter as an executable the shell will not print", () => {
		expect(executableAt(document, "/export_cv.sh")).toEqual({
			kind: "file",
			name: "export_cv.sh",
			path: "/export_cv.sh",
			sections: [],
			executable: true,
			readable: false,
			script: EXPORT_CV_SCRIPT
		});
	});

	it("carries the download the script performs once its playback lands", () => {
		expect(executableAt(document, "/export_cv.sh").script.action).toBe(DOWNLOAD_CV);
	});
});

describe("buildContent — purity", () => {
	it("makes the same tree from the same sections, every time", () => {
		expect(testSubject(CV_SECTIONS)).toEqual(document);
		expect(testSubject(CV_SECTIONS)).not.toBe(document);
	});

	it("never edits the sections it reads", () => {
		const snapshot: unknown = JSON.parse(JSON.stringify(CV_SECTIONS));

		testSubject(CV_SECTIONS);

		expect(CV_SECTIONS).toEqual(snapshot);
	});

	it("never hands back the block it reworked", () => {
		const source = CV_SECTIONS.find(section => section.title === CONTACT);
		const printed = fileAt(document, "/cv.pdf")?.sections.find(s => s.title === CONTACT);

		expect(printed).not.toBe(source);
	});
});

describe("sectionValue", () => {
	const sections: readonly ContentSection[] = [
		{ title: TITLE_EMAIL, body: [EMAIL_ADDRESS, "a second line"] },
		{ title: TITLE_NOTES, body: [] }
	];

	const cases: readonly {
		readonly case: string;
		readonly title: string;
		readonly value: string | undefined;
	}[] = [
		{ case: "the first line of the section", title: TITLE_EMAIL, value: EMAIL_ADDRESS },
		{
			case: "undefined for a section the file does not have",
			title: TITLE_MOBILE,
			value: undefined
		},
		{ case: "undefined for a section with no body", title: TITLE_NOTES, value: undefined }
	];

	it.each(cases)("reads $case", ({ title, value }) => {
		expect(sectionValue(sections, title)).toBe(value);
	});
});
