import { TestBed } from "@angular/core/testing";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { MockProvider } from "ng-mocks";
import { ProjectsService } from "./projects.service";
import { MilestoneService } from "../milestone/milestone.service";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import { of } from "rxjs";

describe("ProjectsService", () => {
	let projectsService: ProjectsService;
	let milestoneService: MilestoneService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [ProjectsService, MockProvider(MilestoneService)]
		});

		projectsService = TestBed.inject(ProjectsService);
		milestoneService = TestBed.inject(MilestoneService);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("getProjectsMilestones", () => {
		it("should return a signal that emits project milestones", () => {
			// GIVEN
			const type = MilestoneEnum.PROJECT;
			const mockMilestones: Milestone[] = [
				{
					id: "1",
					type: type,
					title: "Portfolio",
					description: "A project",
					tags: [],
					period: "2022",
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
				projectsService.getProjectsMilestones()
			);

			// THEN
			expect(milestoneService.getMilestonesByType).toHaveBeenCalledWith(type);
			expect(milestones()).toEqual(mockMilestones);
		});
	});
});
