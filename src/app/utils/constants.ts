import { Kpi } from "../models/kpi.model";
import { Milestone } from "../models/milestone.model";
import { Picture } from "../models/picture.model";
import { calculateExperience } from "./utils";

export const PATHS = {
	EXPERIENCE: "experience",
	EDUCATION: "education",
	PROJECTS: "projects"
};

export const EXPERIENCE_MILESTONES: Milestone[] = [
	{
		title: "NTT DATA Italy",
		description: "Software Engineer",
		location: "Pisa, Italy",
		period: "Mar 2024 - Present",
		tags: ["Angular", "Java Spring Boot", "PostgreSQL", "Git"],
		milestoneDate: "Now"
	},
	{
		title: "Sonatrach",
		description: "Software Engineer",
		location: "Augusta, Italy",
		period: "Jul 2023 - Sep 2023",
		tags: ["Angular", ".NET Core", "Microsoft SQL Server", "Git"],
		milestoneDate: "Mar 2024"
	}
];

export const EDUCATION_MILESTONES: Milestone[] = [
	{
		title: "University of Pisa",
		description: "Bachelor's Degree in Computer Science",
		location: "Pisa, Italy",
		period: "Sep 2020 - Oct 2023",
		tags: ["100/110"],
		milestoneDate: "Now"
	},
	{
		title: "Diploma",
		description: "High School Diploma in Scientific Studies",
		location: "Siracusa, Italy",
		period: "Sep 2015 - Jun 2019",
		tags: ["90/100"],
		milestoneDate: "Sep 2020"
	}
];

export const KPIS: Kpi[] = [
	{ label: "Experience", value: calculateExperience() },
	{ label: "English", value: "B1" },
	{ label: "Nationality", value: "Italian" }
];

export const TECH_STACK_LIST: Picture[] = [
	{ picName: "angular", name: "Angular", extension: "png" },
	{ picName: "spring", name: "Spring Boot", extension: "png" },
	{ picName: "postgresql", name: "PostgreSQL", extension: "png" },
	{ picName: "git", name: "Git", extension: "png" }
];

export const COMPANIES: Picture[] = [
	{ picName: "ntt", name: "NTT DATA", extension: "png" },
	{ picName: "sonatrach", name: "Sonatrach", extension: "png" }
];
