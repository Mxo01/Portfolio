import { Kpi } from "../models/kpi.model";
import { Milestone } from "../models/milestone.model";
import { Picture } from "../models/picture.model";
import { calculateExperience } from "./utils";

export const PATHS = {
	EXPERIENCE: "experience",
	EDUCATION: "education",
	PROJECTS: "projects"
};

export const MONTHS_MAPPING: Record<string, number> = {
	Jan: 0,
	Feb: 1,
	Mar: 2,
	Apr: 3,
	May: 4,
	Jun: 5,
	Jul: 6,
	Aug: 7,
	Sep: 8,
	Oct: 9,
	Nov: 10,
	Dec: 11
};

export const EXPERIENCE_MILESTONES: Milestone[] = [
	{
		logo: {
			picName: "onetag",
			name: "OneTag",
			extension: "png"
		},
		title: "OneTag",
		description: "Software Engineer",
		location: "Pisa, Italy",
		period: "Jul 2025 - Present",
		tags: ["Angular", "Java Spring Boot", "AWS", "Git"],
		milestoneDate: "Now"
	},
	{
		logo: {
			picName: "ntt",
			name: "NTT DATA",
			extension: "png"
		},
		title: "NTT DATA",
		description: "Software Engineer",
		location: "Pisa, Italy",
		period: "Mar 2024 - Jul 2025",
		tags: ["Angular", "Java Spring Boot", "PostgreSQL", "Git"],
		milestoneDate: "Jul 2025"
	},
	{
		logo: {
			picName: "sonatrach",
			name: "Sonatrach",
			extension: "png"
		},
		title: "Sonatrach",
		description: "Software Engineer Intern",
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

export const PROJECTS_MILESTONES: Milestone[] = [
	{
		title: "GymBro",
		description:
			"Fitness tracking app re-builded natively, with a custom UI component library with a modern look and improved UX. Designed a new backend infrastructure in Go (made by the other team member), containerized with Docker and connected to PostgreSQL, enabling better performance, scalability, and local development setup",
		tags: ["React Native", "Go", "PostgreSQL", "Docker", "Git"],
		contributors: [
			{
				name: "Lorenzo Deriu",
				picName: "lorenzo_deriu",
				extension: "jpeg"
			}
		],
		media: [
			{ name: "gymbro-login", picName: "gymbro-login", extension: "jpeg" },
			{ name: "gymbro-signup", picName: "gymbro-signup", extension: "jpeg" },
			{ name: "gymbro-home", picName: "gymbro-home", extension: "jpeg" },
			{ name: "gymbro-home-tp", picName: "gymbro-home-tp", extension: "jpeg" },
			{ name: "gymbro-history", picName: "gymbro-history", extension: "jpeg" },
			{ name: "gymbro-gymbros", picName: "gymbro-gymbros", extension: "jpeg" },
			{
				name: "gymbro-gymbros-history",
				picName: "gymbro-gymbros-history",
				extension: "jpeg"
			},
			{ name: "gymbro-settings", picName: "gymbro-settings", extension: "jpeg" },
			{
				name: "gymbro-settings-exercises",
				picName: "gymbro-settings-exercises",
				extension: "jpeg"
			},
			{ name: "gymbro-settings-lang", picName: "gymbro-settings-lang", extension: "jpeg" },
			{
				name: "gymbro-settings-feedback",
				picName: "gymbro-settings-feedback",
				extension: "jpeg"
			},
			{ name: "gymbro-settings-pic", picName: "gymbro-settings-pic", extension: "jpeg" },
			{
				name: "gymbro-settings-notifications",
				picName: "gymbro-settings-notifications",
				extension: "jpeg"
			},
			{ name: "gymbro-workout", picName: "gymbro-workout", extension: "jpeg" },
			{ name: "gymbro-workout-rest", picName: "gymbro-workout-rest", extension: "jpeg" },
			{
				name: "gymbro-workout-exercise",
				picName: "gymbro-workout-exercise",
				extension: "jpeg"
			},
			{
				name: "gymbro-workout-exercise-rest",
				picName: "gymbro-workout-exercise-rest",
				extension: "jpeg"
			},
			{
				name: "gymbro-workout-exercise-history",
				picName: "gymbro-workout-exercise-history",
				extension: "jpeg"
			}
		],
		milestoneDate: "Now",
		period: "Mar 2024 - Present"
	},
	{
		title: "GymBro PWA",
		description:
			"Fitness tracking web app (PWA) designed for those who work out in the gym. Optimized UX with compatibility across all devices. Share your training programs with your friends, create them from zero and monitor your workouts",
		tags: ["Angular", "Firebase", "Git"],
		contributors: [
			{
				name: "Lorenzo Deriu",
				picName: "lorenzo_deriu",
				extension: "jpeg"
			}
		],
		media: [
			{ name: "gymbro-pwa-1", picName: "gymbro-pwa-1", extension: "jpg" },
			{ name: "gymbro-pwa-2", picName: "gymbro-pwa-2", extension: "png" },
			{ name: "gymbro-pwa-3", picName: "gymbro-pwa-3", extension: "png" },
			{ name: "gymbro-pwa-4", picName: "gymbro-pwa-4", extension: "png" },
			{ name: "gymbro-pwa-5", picName: "gymbro-pwa-5", extension: "png" }
		],
		milestoneDate: "Mar 2024",
		period: "Oct 2023 - Feb 2024"
	},
	{
		title: "LoveJob",
		description:
			"Simplify job seeking. Users can search for their dream job with a map that shows up open positions near them. Company can create open position offers, and users can contact them via chat or add specific position to favorites",
		tags: ["Angular", ".NET Core", "Micorsoft SQL Server", "Git"],
		media: [
			{ name: "lovejob-1", picName: "lovejob-1", extension: "jpeg" },
			{ name: "lovejob-2", picName: "lovejob-2", extension: "jpeg" },
			{ name: "lovejob-3", picName: "lovejob-3", extension: "jpeg" },
			{ name: "lovejob-4", picName: "lovejob-4", extension: "jpeg" }
		],
		milestoneDate: "Oct 2023",
		period: "Jun 2023 - Aug 2023"
	},
	{
		title: "MyLibretto",
		description:
			"Keep track of your career by saving your grades, taxes e sharing notes or file. You can also see your statistics and some easy-readable charts",
		tags: ["React", "Firebase", "Git"],
		media: [
			{ name: "mylibretto-1", picName: "mylibretto-1", extension: "png" },
			{ name: "mylibretto-2", picName: "mylibretto-2", extension: "png" },
			{ name: "mylibretto-3", picName: "mylibretto-3", extension: "png" }
		],
		milestoneDate: "Jun 2023",
		period: "Mar 2023 - May 2023"
	}
];

export const KPIS: Kpi[] = [
	{ label: "Experience", value: calculateExperience(EXPERIENCE_MILESTONES) },
	{ label: "English", value: "B2" },
	{ label: "Nationality", value: "Italian" }
];

export const TECH_STACK_LIST: Picture[] = [
	{ picName: "angular", name: "Angular", extension: "png" },
	{ picName: "spring", name: "Spring Boot", extension: "png" },
	{ picName: "postgresql", name: "PostgreSQL", extension: "png" },
	{ picName: "git", name: "Git", extension: "png" }
];

export const COMPANIES = EXPERIENCE_MILESTONES.map(milestone => milestone.logo).filter(
	Boolean
) as Picture[];
