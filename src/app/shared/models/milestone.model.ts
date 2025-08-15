import { MilestoneUpdate } from "./milestone-update.model";
import { Picture } from "./picture.model";

export interface Milestone {
	isExperience?: boolean;
	logo?: Picture;
	title: string;
	location?: string;
	description: string;
	tags: string[];
	period: string;
	updates?: MilestoneUpdate[];
	milestoneDate: string;
	websiteLink?: string;
	sourceCodeLink?: string;
	media?: Picture[];
	contributors?: Picture[];
}

export interface ExperienceResponse {
	experience: Milestone[];
}

export interface EducationResponse {
	education: Milestone[];
}

export interface ProjectsResponse {
	projects: Milestone[];
}
