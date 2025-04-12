import { Kpi } from "../models/kpi.model";
import { Milestone } from "../models/milestone.model";
import { Picture } from "../models/picture.model";

export const PATHS = {
	EXPERIENCE: "experience",
	EDUCATION: "education",
	PROJECTS: "projects"
};

export const KPIS: Kpi[] = [
	{ label: "Experience", value: "???" },
	{ label: "English", value: "B1" },
	{ label: "Nationality", value: "Italian" }
];

export const TECH_STACK_LIST: Picture[] = [
	{ name: "angular", extension: "png" },
	{ name: "spring", extension: "png" },
	{ name: "postgresql", extension: "png" },
	{ name: "git", extension: "png" }
];

export const COMPANIES: Picture[] = [
	{ name: "ntt", extension: "png" },
	{ name: "sonatrach", extension: "png" }
];

export const NTT_DATA_MILESTONE: Milestone = {
	title: "NTT DATA Italy",
	description: "Software Engineer",
	location: "Pisa, Italy",
	period: "Mar 2024 - Present",
	tags: ["Angular", "Java Spring Boot", "PostgreSQL", "Git"],
	milestoneDate: "Now"
};

export const SONATRACH_MILESTONE: Milestone = {
	title: "Sonatrach",
	description: "Software Engineer",
	location: "Augusta, Italy",
	period: "Jul 2023 - Sep 2023",
	tags: ["Angular", ".NET Core", "Microsoft SQL Server", "Git"],
	milestoneDate: "Mar 2024"
};

export const UNIVERSITY_OF_PISA_MILESTONE: Milestone = {
	title: "University of Pisa",
	description: "Bachelor's Degree in Computer Science",
	location: "Pisa, Italy",
	period: "Sep 2020 - Oct 2023",
	tags: ["100/110"],
	milestoneDate: "Now"
};

export const DIPLOMA_MILESTONE: Milestone = {
	title: "Diploma",
	description: "High School Diploma in Scientific Studies",
	location: "Siracusa, Italy",
	period: "Sep 2015 - Jun 2019",
	tags: ["90/100"],
	milestoneDate: "Sep 2020"
};
