import { query, style, group, animate } from "@angular/animations";
import { Picture } from "../models/picture.model";
import { MONTHS_MAPPING } from "./constants";
import { Milestone } from "../models/milestone.model";

export function isMobileDevice(width: number): boolean {
	return width <= 768;
}

export function calculateExperience(experiencePeriods: string[]): string {
	const now = Date.now();

	const months = experiencePeriods.reduce((sum, period) => {
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
		itemImageSrc: /* "images/" + media.picName + "." + media.extension */ "",
		thumbnailImageSrc: /* "images/" + media.picName + "." + media.extension */ "",
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

export function sortMilestonesByPeriod(milestones: Milestone[]): Milestone[] {
	return milestones.sort((milestone1, milestone2) => {
		const [milestone1PeriodStart, milestone1PeriodEnd] = milestone1.period.split(" - ");
		const [milestone2PeriodStart, milestone2PeriodEnd] = milestone2.period.split(" - ");

		const milestone1StartTimestamp = new Date(milestone1PeriodStart).getTime();
		const milestone1EndTimestamp =
			milestone1PeriodEnd === "Present"
				? Date.now()
				: new Date(milestone1PeriodEnd).getTime();

		const milestone2StartTimestamp = new Date(milestone2PeriodStart).getTime();
		const milestone2EndTimestamp =
			milestone2PeriodEnd === "Present"
				? Date.now()
				: new Date(milestone2PeriodEnd).getTime();

		const startDifference = milestone2StartTimestamp - milestone1StartTimestamp;
		const endDifference = milestone2EndTimestamp - milestone1EndTimestamp;

		return endDifference === 0 ? startDifference : endDifference;
	});
}

export function convertFileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => {
			resolve(reader.result as string);
		};

		reader.onerror = error => {
			console.error("FileReader failed to read the file:", error);
			reject(new Error("Failed to convert file to Base64."));
		};

		reader.readAsDataURL(file);
	});
}
