import { Milestone } from "../models/milestone.model";
import { Picture } from "../models/picture.model";

export function isMobileDevice(width: number): boolean {
	return width <= 768;
}

export function calculateExperience(experiences: Milestone[]): string {
	const periods = experiences.map(experience => experience.period);
	const now = Date.now();

	const months = periods.reduce((sum, period) => {
		const [start, end] = period.split(" - ");
		const startDate = new Date(start).getTime();
		const endDate = end === "Present" ? now : new Date(end).getTime();
		const months = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)) + 1;

		return sum + months;
	}, 0);

	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;

	return [years && `${years}y`, remainingMonths && `${remainingMonths}m`]
		.filter(Boolean)
		.join(" ");
}

export function mapMilestoneMediaToGalleriaImages(media: Picture[] | undefined) {
	return (media || []).map(media => ({
		itemImageSrc: "images/" + media.picName + "." + media.extension,
		thumbnailImageSrc: "images/" + media.picName + "." + media.extension,
		alt: media.name,
		title: media.name
	}));
}
