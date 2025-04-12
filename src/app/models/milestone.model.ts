import { MilestoneUpdate } from "./milestone-update.model";

export interface Milestone {
	title: string;
	location: string;
	description: string;
	tags: string[];
	period: string;
	updates?: MilestoneUpdate[];
	milestoneDate: string;
}
