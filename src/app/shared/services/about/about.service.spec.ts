import { TestBed } from "@angular/core/testing";
import { AboutService } from "./about.service";
import { DatabaseService } from "../../services/database/database.service";
import { ExperienceService } from "../../services/experience/experience.service";
import { MockProvider } from "ng-mocks";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { doc, docData, updateDoc, DocumentReference } from "@angular/fire/firestore";
import { of } from "rxjs";
import { signal } from "@angular/core";
import { AboutInfo } from "../../models/about.model";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import { CollectionReference } from "@angular/fire/firestore";

vi.mock("../../utils/utils", () => ({
	calculateExperience: vi.fn()
}));

vi.mock("@angular/fire/firestore", () => ({
	doc: vi.fn(),
	docData: vi.fn(),
	updateDoc: vi.fn()
}));

describe("AboutService", () => {
	let aboutService: AboutService;
	let databaseService: DatabaseService;
	let experienceService: ExperienceService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				AboutService,
				MockProvider(DatabaseService, {
					aboutCollection: {} as CollectionReference
				}),
				MockProvider(ExperienceService)
			]
		});

		aboutService = TestBed.inject(AboutService);
		databaseService = TestBed.inject(DatabaseService);
		experienceService = TestBed.inject(ExperienceService);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("getAboutInfo", () => {
		it("should return about info with calculated experience and companies", async () => {
			// GIVEN
			const mockAboutInfo: AboutInfo = {
				kpis: [],
				techStack: [],
				companies: [],
				profilePicUrl: "profile.jpg",
				cvUrl: "cv.pdf"
			};
			const mockExperiences: Milestone[] = [
				{
					type: MilestoneEnum.EXPERIENCE,
					title: "Software Engineer",
					description: "Description",
					tags: ["Angular"],
					period: "Jan 2024 - Present",
					milestoneDate: "Present",
					logo: { name: "Company", url: "logo.png" },
					updates: [],
					media: [],
					contributors: [],
					location: "Remote"
				}
			];
			const mockCompanies = mockExperiences
				.reverse()
				.map(milestone => milestone.logo)
				.filter(Boolean);
			const mockCalculatedExperience = "2y";
			const docRefMock = { id: "info" } as DocumentReference;

			vi.mocked(doc).mockReturnValue(docRefMock);
			vi.mocked(docData).mockReturnValue(of(mockAboutInfo));
			vi.spyOn(experienceService, "getExperienceMilestones").mockReturnValue(
				signal(mockExperiences)
			);

			// WHEN
			const actual = TestBed.runInInjectionContext(() => aboutService.getAboutInfo());

			// THEN
			expect(doc).toHaveBeenCalledWith(databaseService.aboutCollection, "info");
			expect(docData).toHaveBeenCalledWith(docRefMock);
			expect(actual()).toBeNull();

			await vi.waitFor(() => {
				expect(actual()).toEqual({
					...mockAboutInfo,
					kpis: [
						{ label: "Experience", value: mockCalculatedExperience },
						...mockAboutInfo.kpis
					],
					companies: mockCompanies
				});
			});
		});

		it("should return have 'None' as experience and an empty list as companies when null experience is provided", async () => {
			// GIVEN
			const mockAboutInfo: AboutInfo = {
				kpis: [],
				techStack: [],
				companies: [],
				profilePicUrl: "profile.jpg",
				cvUrl: "cv.pdf"
			};
			const docRefMock = { id: "info" } as DocumentReference;

			vi.mocked(doc).mockReturnValue(docRefMock);
			vi.mocked(docData).mockReturnValue(of(mockAboutInfo));
			vi.spyOn(experienceService, "getExperienceMilestones").mockReturnValue(signal(null));

			// WHEN
			const actual = TestBed.runInInjectionContext(() => aboutService.getAboutInfo());

			// THEN
			expect(doc).toHaveBeenCalledWith(databaseService.aboutCollection, "info");
			expect(docData).toHaveBeenCalledWith(docRefMock);
			expect(actual()).toBeNull();

			await vi.waitFor(() => {
				expect(actual()).toEqual({
					...mockAboutInfo,
					kpis: [{ label: "Experience", value: "None" }, ...mockAboutInfo.kpis],
					companies: []
				});
			});
		});
	});

	describe("saveTechStack", () => {
		it("should update the specific document with the provided data", () => {
			// GIVEN
			const mockAboutInfo: Pick<AboutInfo, "techStack"> = {
				techStack: [{ name: "Angular", url: "angular.png" }]
			};
			const docRefMock = { id: "info" } as DocumentReference;
			vi.mocked(doc).mockReturnValue(docRefMock);

			// WHEN
			aboutService.saveTechStack(mockAboutInfo);

			// THEN
			expect(doc).toHaveBeenCalledWith(databaseService.aboutCollection, "info");
			expect(updateDoc).toHaveBeenCalledWith(docRefMock, mockAboutInfo);
		});
	});

	describe("updateCV", () => {
		it("should update the specific document with the provided CV url", () => {
			// GIVEN
			const mockAboutInfo: Pick<AboutInfo, "cvUrl"> = {
				cvUrl: "new-cv.pdf"
			};
			const docRefMock = { id: "info" } as DocumentReference;
			vi.mocked(doc).mockReturnValue(docRefMock);

			// WHEN
			aboutService.updateCV(mockAboutInfo);

			// THEN
			expect(doc).toHaveBeenCalledWith(databaseService.aboutCollection, "info");
			expect(updateDoc).toHaveBeenCalledWith(docRefMock, mockAboutInfo);
		});
	});
});
