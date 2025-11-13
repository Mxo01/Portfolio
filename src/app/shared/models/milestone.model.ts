import { MilestoneUpdate } from "./milestone-update.model";
import { Picture } from "./picture.model";

export enum MilestoneEnum {
	EXPERIENCE = "EXPERIENCE",
	EDUCATION = "EDUCATION",
	PROJECT = "PROJECT"
}
export interface Milestone {
	id?: string;
	type: MilestoneEnum;
	logo?: Picture;
	title: string;
	location?: string;
	description: string;
	tags: string[];
	period: string;
	updates?: MilestoneUpdate[];
	milestoneDate: string;
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
