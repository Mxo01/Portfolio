import { MilestoneUpdate } from "./milestone-update.model";
import { Picture } from "./picture.model";

export interface Milestone {
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
