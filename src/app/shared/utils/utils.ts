import { query, style, group, animate } from "@angular/animations";
import { Milestone } from "../models/milestone.model";
import { Picture } from "../models/picture.model";
import { MONTHS_MAPPING } from "./constants";

export function isMobileDevice(width: number): boolean {
	return width <= 768;
}

export function calculateExperience(experiences: Milestone[]): string {
	const periods = experiences.map(experience => experience.period);
	const now = Date.now();

	const months = periods.reduce((sum, period) => {
		const [start, end] = period.split(" - ");
		const [startMonth, startYear] = start.split(" ");
		const [endMonth, endYear] = end.split(" ");
		const startDate = new Date(+startYear, MONTHS_MAPPING[startMonth]).getTime();
		const endDate =
			end === "Present" ? now : new Date(+endYear, MONTHS_MAPPING[endMonth]).getTime();
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

export function slideTo(direction: "left" | "right") {
	const translate = direction === "left" ? "100%" : "-100%";
	const translateOpposite = direction === "left" ? "-100%" : "100%";

	return [
		query(":enter, :leave", style({ position: "absolute", width: "100%" }), {
			optional: true
		}),
		query(":enter", style({ transform: `translateX(${translate})` }), {
			optional: true
		}),
		group([
			query(
				":leave",
				[
					animate(
						"300ms ease-out",
						style({ transform: `translateX(${translateOpposite})` })
					)
				],
				{ optional: true }
			),
			query(":enter", [animate("300ms ease-out", style({ transform: "translateX(0%)" }))], {
				optional: true
			})
		])
	];
}
