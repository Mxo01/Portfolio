import { Picture } from "../models/picture.model";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, MONTHS_MAPPING } from "./constants";
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
		itemImageSrc: media.url,
		thumbnailImageSrc: media.url,
		alt: media.name,
		title: media.name
	}));
}

export function sortMilestonesByPeriod(milestones: Milestone[]): Milestone[] {
	return milestones.sort((milestone1, milestone2) => {
		const [milestone1PeriodStart, milestone1PeriodEnd] = milestone1.period.split(" - ");
		const [milestone2PeriodStart, milestone2PeriodEnd] = milestone2.period.split(" - ");

		const [milestone1StartMonth, milestone1StartYear] = milestone1PeriodStart.split(" ");
		const [milestone1EndMonth, milestone1EndYear] = milestone1PeriodEnd.split(" ");

		const milestone1StartTimestamp = new Date(
			+milestone1StartYear,
			MONTHS_MAPPING[milestone1StartMonth]
		).getTime();
		const milestone1EndTimestamp =
			milestone1PeriodEnd === "Present"
				? Date.now()
				: new Date(+milestone1EndYear, MONTHS_MAPPING[milestone1EndMonth]).getTime();

		const [milestone2StartMonth, milestone2StartYear] = milestone2PeriodStart.split(" ");
		const [milestone2EndMonth, milestone2EndYear] = milestone2PeriodEnd.split(" ");

		const milestone2StartTimestamp = new Date(
			+milestone2StartYear,
			MONTHS_MAPPING[milestone2StartMonth]
		).getTime();
		const milestone2EndTimestamp =
			milestone2PeriodEnd === "Present"
				? Date.now()
				: new Date(+milestone2EndYear, MONTHS_MAPPING[milestone2EndMonth]).getTime();

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

export function compressImage(file: File, maxDimension = 1200, quality = 0.7): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const objectUrl = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(objectUrl);

			let { width, height } = img;
			if (width > height) {
				if (width > maxDimension) {
					height = Math.round((height * maxDimension) / width);
					width = maxDimension;
				}
			} else {
				if (height > maxDimension) {
					width = Math.round((width * maxDimension) / height);
					height = maxDimension;
				}
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Failed to get canvas context"));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);
			resolve(canvas.toDataURL("image/jpeg", quality));
		};

		img.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("Failed to load image"));
		};

		img.src = objectUrl;
	});
}

export function base64ToBlob(base64: string): Blob {
	const parts = base64.split(";base64,");
	const contentType = parts[0].split(":")[1];
	const rawBase64 = parts[1];

	const byteCharacters = atob(rawBase64);
	const byteArrays = [];

	for (let offset = 0; offset < byteCharacters.length; offset += 512) {
		const slice = byteCharacters.slice(offset, offset + 512);
		const byteNumbers = new Array(slice.length);

		for (let i = 0; i < slice.length; i++) {
			byteNumbers[i] = slice.charCodeAt(i);
		}

		const byteArray = new Uint8Array(byteNumbers);
		byteArrays.push(byteArray);
	}

	return new Blob(byteArrays, { type: contentType });
}

export function moveItem(list: unknown[], startingIndex: number, direction: "up" | "down") {
	const isFirstItem = startingIndex === 0;
	const isLastItem = startingIndex === list.length - 1;

	if (direction === "up") {
		if (isFirstItem) return;

		const temp = list[startingIndex - 1];
		list[startingIndex - 1] = list[startingIndex];
		list[startingIndex] = temp;
	}

	if (direction === "down") {
		if (isLastItem) return;

		const temp = list[startingIndex + 1];
		list[startingIndex + 1] = list[startingIndex];
		list[startingIndex] = temp;
	}
}

export async function uploadToCloudinary(file: File): Promise<string> {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

	const response = await fetch(
		`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
		{ method: "POST", body: formData }
	);

	if (!response.ok) throw new Error("Cloudinary upload failed");

	const data = await response.json();
	return data.secure_url as string;
}

export async function uploadLogo(
	pictureList: Picture[],
	file: File,
	uploadIndex: number
): Promise<Picture[]> {
	const url = await uploadToCloudinary(file);

	return pictureList.map((picture, pictureIndex) => {
		return pictureIndex === uploadIndex
			? {
					...picture,
					url
				}
			: picture;
	});
}

export function deepClone<T>(object: T): T {
	return JSON.parse(JSON.stringify(object));
}
