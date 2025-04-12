import { EXPERIENCE_MILESTONES } from "./constants";

export function isMobileDevice(width: number): boolean {
	return width <= 768;
}

export function calculateExperience() {
	const experiences = EXPERIENCE_MILESTONES;
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
