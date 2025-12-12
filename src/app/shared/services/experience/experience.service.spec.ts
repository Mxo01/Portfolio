import { TestBed } from "@angular/core/testing";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { MockProvider } from "ng-mocks";
import { ExperienceService } from "./experience.service";
import { MilestoneService } from "../milestone/milestone.service";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import { of } from "rxjs";

describe("ExperienceService", () => {
	let experienceService: ExperienceService;
	let milestoneService: MilestoneService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ExperienceService, MockProvider(MilestoneService)]
		});

		experienceService = TestBed.inject(ExperienceService);
		milestoneService = TestBed.inject(MilestoneService);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("getExperienceMilestones", () => {
		it("should return a signal that emits experience milestones", () => {
			// GIVEN
			const type = MilestoneEnum.EXPERIENCE;
			const mockMilestones: Milestone[] = [
				{
					id: "1",
					type,
					title: "Developer",
					description: "Work",
					tags: [],
					period: "2020 - 2022",
					milestoneDate: "",
					logo: undefined,
					updates: [],
					media: [],
					contributors: [],
					location: ""
				}
			];

			vi.spyOn(milestoneService, "getMilestonesByType").mockReturnValue(of(mockMilestones));

			// WHEN
			const milestones = TestBed.runInInjectionContext(() =>
				experienceService.getExperienceMilestones()
			);

			// THEN
			expect(milestoneService.getMilestonesByType).toHaveBeenCalledWith(type);
			expect(milestones()).toEqual(mockMilestones);
		});
	});
});
