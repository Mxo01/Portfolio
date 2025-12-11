import { describe, it, expect, vi } from "vitest";
import {
	base64ToBlob,
	calculateExperience,
	convertFileToBase64,
	deepClone,
	isMobileDevice,
	mapMilestoneMediaToGalleriaImages,
	moveItem,
	sortMilestonesByPeriod,
	uploadLogo
} from "./utils";
import { Milestone } from "../models/milestone.model";
import { Picture } from "../models/picture.model";

describe("Utils", () => {
	describe("isMobileDevice", () => {
		it.each([
			{
				title: "should return true if width is 0",
				stubbed: 0,
				expected: true
			},
			{
				title: "should return true if width is less than 768",
				stubbed: 728,
				expected: true
			},
			{
				title: "should return true if width is equal to 768",
				stubbed: 768,
				expected: true
			},
			{
				title: "should return false if width is greater than 768",
				stubbed: 769,
				expected: false
			}
		])("$title", ({ stubbed, expected }) => {
			// WHEN
			const actual = isMobileDevice(stubbed);

			// THEN
			expect(actual).toBe(expected);
		});
	});

	describe("calculateExperience", () => {
		it.each([
			{
				title: "should calculate years and months correctly",
				stubbed: ["Jan 2020 - Jan 2021"],
				expected: "1y 1m"
			},
			{
				title: "should format only years if no remaining months",
				stubbed: ["Jan 2020 - Dec 2020"],
				expected: "1y"
			}
		])("$title", ({ stubbed, expected }) => {
			// WHEN
			const actual = calculateExperience(stubbed);

			// THEN
			expect(actual).toBe(expected);
		});

		it("should handle 'Present' correctly", () => {
			// GIVEN
			const now = new Date(2023, 0, 1);
			vi.useFakeTimers();
			vi.setSystemTime(now);
			const periods = ["Jan 2022 - Present"];

			// WHEN
			const actual = calculateExperience(periods);

			// THEN
			expect(actual).toBe("1y 1m");
			vi.useRealTimers();
		});
	});

	describe("mapMilestoneMediaToGalleriaImages", () => {
		it.each([
			{
				title: "should return empty array if input is undefined",
				stubbed: undefined,
				expected: []
			},
			{
				title: "should map pictures to galleria images",
				stubbed: [{ name: "pic1", url: "url1" }],
				expected: [
					{
						itemImageSrc: "url1",
						thumbnailImageSrc: "url1",
						alt: "pic1",
						title: "pic1"
					}
				]
			}
		])("$title", ({ stubbed, expected }) => {
			// WHEN
			const actual = mapMilestoneMediaToGalleriaImages(stubbed);

			// THEN
			expect(actual).toEqual(expected);
		});
	});

	describe("sortMilestonesByPeriod", () => {
		it("should return an empty list when an empty list is provided", () => {
			// WHEN
			const actual = sortMilestonesByPeriod([]);

			// THEN
			expect(actual).toEqual([]);
		});

		it("should sort milestones by end date descending, then start date", () => {
			// GIVEN
			const m1 = { period: "Jan 2020 - Dec 2020" } as Milestone;
			const m2 = { period: "Jan 2021 - Present" } as Milestone;
			const m3 = { period: "Jan 2019 - Dec 2019" } as Milestone;
			const milestones = [m1, m2, m3];

			// WHEN
			const actual = sortMilestonesByPeriod(milestones);

			// THEN
			expect(actual).toEqual([m2, m1, m3]);
		});

		it("should use start date if end dates are equal", () => {
			// GIVEN
			const m1 = { period: "Jan 2020 - Dec 2020" } as Milestone;
			const m2 = { period: "Feb 2020 - Dec 2020" } as Milestone;
			const milestones = [m2, m1];

			// WHEN
			const actual = sortMilestonesByPeriod(milestones);

			// THEN
			expect(actual).toEqual([m2, m1]);
		});

		it("should sort milestones with 'Present' end date by start date descending", () => {
			// GIVEN
			const m1 = { period: "Jan 2022 - Present" } as Milestone;
			const m2 = { period: "Jan 2023 - Present" } as Milestone;
			const milestones = [m1, m2];

			// WHEN
			const actual = sortMilestonesByPeriod(milestones);

			// THEN
			expect(actual).toEqual([m2, m1]);
		});
	});

	describe("convertFileToBase64", () => {
		it("should resolve with base64 string on success", async () => {
			// GIVEN
			const file = new File(["content"], "test.txt", { type: "text/plain" });

			// WHEN
			const result = await convertFileToBase64(file);

			// THEN
			expect(result).toContain("data:text/plain;base64,");
		});

		it("should reject on error", async () => {
			// GIVEN
			const originalFileReader = window.FileReader;
			window.FileReader = class {
				public readAsDataURL() {
					if (this.onerror) this.onerror();
				}
				public onload = () => null;
				public onerror = () => null;
			} as unknown as typeof FileReader;
			const file = new File([""], "test.txt");

			// WHEN
			const promise = convertFileToBase64(file);

			// THEN
			await expect(promise).rejects.toThrow("Failed to convert file to Base64.");
			window.FileReader = originalFileReader;
		});
	});

	describe("base64ToBlob", () => {
		it("should convert base64 to blob", () => {
			// GIVEN
			const base64 = "data:text/plain;base64,SGVsbG8=";

			// WHEN
			const actual = base64ToBlob(base64);

			// THEN
			expect(actual.type).toBe("text/plain");
			expect(actual.size).toBe(5);
		});
	});

	describe("moveItem", () => {
		it.each([
			{
				title: "should move item up",
				stubbed: { list: [1, 2, 3], index: 1, direction: "up" },
				expected: [2, 1, 3]
			},
			{
				title: "should not move first item up",
				stubbed: { list: [1, 2, 3], index: 0, direction: "up" },
				expected: [1, 2, 3]
			},
			{
				title: "should move item down",
				stubbed: { list: [1, 2, 3], index: 1, direction: "down" },
				expected: [1, 3, 2]
			},
			{
				title: "should not move last item down",
				stubbed: { list: [1, 2, 3], index: 2, direction: "down" },
				expected: [1, 2, 3]
			}
		])("$title", ({ stubbed, expected }) => {
			// GIVEN
			const { list, index, direction } = stubbed;

			// WHEN
			moveItem(list, index, direction as "up" | "down");

			// THEN
			expect(list).toEqual(expected);
		});
	});

	describe("uploadLogo", () => {
		it("should replace the url of the specified index with base64", async () => {
			// GIVEN
			const pics: Picture[] = [
				{ name: "pic1", url: "old1" },
				{ name: "pic2", url: "old2" }
			];
			const file = new File(["new"], "new.txt", { type: "text/plain" });

			// WHEN
			const actual = await uploadLogo(pics, file, 1);

			// THEN
			expect(actual[0].url).toBe(pics[0].url);
			expect(actual[1].url).toContain("data:text/plain;base64,");
		});
	});

	describe("deepClone", () => {
		it.each([
			{
				title: "should deep clone a string",
				stubbed: "test",
				expected: "test"
			},
			{
				title: "should deep clone a boolean",
				stubbed: true,
				expected: true
			},
			{
				title: "should deep clone a number",
				stubbed: 1,
				expected: 1
			},
			{
				title: "should deep clone an empty object",
				stubbed: {},
				expected: {}
			},
			{
				title: "should deep clone an empty array",
				stubbed: [],
				expected: []
			},
			{
				title: "should deep clone an object",
				stubbed: { a: { b: 1 } },
				expected: { a: { b: 1 } }
			},
			{
				title: "should deep clone an array",
				stubbed: [1, 2, 3],
				expected: [1, 2, 3]
			},
			{
				title: "should deep clone a nested array",
				stubbed: [1, [2, 3]],
				expected: [1, [2, 3]]
			},
			{
				title: "should deep clone a nested object",
				stubbed: { a: { b: { c: 1 } } },
				expected: { a: { b: { c: 1 } } }
			},
			{
				title: "should deep clone a nested array of objects",
				stubbed: { a: [{ b: 1 }, { b: 2 }] },
				expected: { a: [{ b: 1 }, { b: 2 }] }
			},
			{
				title: "should deep clone a nested array of arrays",
				stubbed: {
					a: [
						[1, 2],
						[3, 4]
					]
				},
				expected: {
					a: [
						[1, 2],
						[3, 4]
					]
				}
			},
			{
				title: "should deep clone a nested array of arrays of objects",
				stubbed: {
					a: [
						[{ b: 1 }, { b: 2 }],
						[{ b: 3 }, { b: 4 }]
					]
				},
				expected: {
					a: [
						[{ b: 1 }, { b: 2 }],
						[{ b: 3 }, { b: 4 }]
					]
				}
			}
		])("$title", ({ stubbed, expected }) => {
			// GIVEN
			const obj = stubbed;

			// WHEN
			const actual = deepClone(obj);

			// THEN
			expect(actual).toEqual(expected);
		});
	});
});
