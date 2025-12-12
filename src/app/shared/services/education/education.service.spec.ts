import { TestBed } from "@angular/core/testing";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { MockProvider } from "ng-mocks";
import { EducationService } from "./education.service";
import { MilestoneService } from "../milestone/milestone.service";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import { of } from "rxjs";

describe("EducationService", () => {
	let educationService: EducationService;
	let milestoneService: MilestoneService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [EducationService, MockProvider(MilestoneService)]
		});

		educationService = TestBed.inject(EducationService);
		milestoneService = TestBed.inject(MilestoneService);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("getEducationMilestones", () => {
		it("should return a signal that emits education milestones", () => {
			// GIVEN
			const type = MilestoneEnum.EDUCATION;
			const mockMilestones: Milestone[] = [
				{
					id: "1",
					type,
					title: "BSc Computer Science",
					description: "University",
					tags: [],
					period: "Jan 2018 - Dec 2021",
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
				educationService.getEducationMilestones()
			);

			// THEN
			expect(milestoneService.getMilestonesByType).toHaveBeenCalledWith(type);
			expect(milestones()).toEqual(mockMilestones);
		});
	});
});
