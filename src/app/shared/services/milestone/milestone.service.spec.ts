import { TestBed } from "@angular/core/testing";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { MockProvider } from "ng-mocks";
import { MilestoneService } from "./milestone.service";
import { DatabaseService } from "../database/database.service";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import {
	addDoc,
	collectionData,
	deleteDoc,
	doc,
	query,
	setDoc,
	where,
	Query,
	CollectionReference,
	DocumentReference
} from "@angular/fire/firestore";
import { firstValueFrom, of } from "rxjs";

vi.mock("../../utils/utils", () => ({
	sortMilestonesByPeriod: vi.fn()
}));

vi.mock("@angular/fire/firestore", () => ({
	addDoc: vi.fn(),
	collectionData: vi.fn(),
	deleteDoc: vi.fn(),
	doc: vi.fn(),
	query: vi.fn(),
	setDoc: vi.fn(),
	where: vi.fn()
}));

describe("MilestoneService", () => {
	let milestoneService: MilestoneService;
	let databaseService: DatabaseService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				MilestoneService,
				MockProvider(DatabaseService, {
					milestonesCollection: {} as CollectionReference
				})
			]
		});

		milestoneService = TestBed.inject(MilestoneService);
		databaseService = TestBed.inject(DatabaseService);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("getMilestonesByType", () => {
		it("should return sorted milestones of a given type", async () => {
			// GIVEN
			const type = MilestoneEnum.EXPERIENCE;
			const rawMilestones: Milestone[] = [
				{
					id: "1",
					type,
					title: "X",
					description: "D",
					tags: [],
					period: "Jan 2020 - Mar 2021",
					milestoneDate: "",
					logo: undefined,
					updates: [],
					media: [],
					contributors: [],
					location: ""
				},
				{
					id: "2",
					type,
					title: "X",
					description: "D",
					tags: [],
					period: "Jan 2021 - Mar 2022",
					milestoneDate: "",
					logo: undefined,
					updates: [],
					media: [],
					contributors: [],
					location: ""
				}
			];
			const sortedMilestones: Milestone[] = [...rawMilestones.reverse()];
			const queryMock = {} as Query;
			const whereMock = {} as ReturnType<typeof where>;

			vi.mocked(query).mockReturnValue(queryMock);
			vi.mocked(where).mockReturnValue(whereMock);
			vi.mocked(collectionData).mockReturnValue(of(rawMilestones));

			// WHEN
			const milestones = await firstValueFrom(milestoneService.getMilestonesByType(type));

			// THEN
			expect(query).toHaveBeenCalledWith(databaseService.milestonesCollection, whereMock);
			expect(where).toHaveBeenCalledWith("type", "==", type);
			expect(collectionData).toHaveBeenCalledWith(queryMock, {
				idField: "id"
			});
			expect(milestones).toEqual(sortedMilestones);
		});
	});

	describe("createMilestone", () => {
		it("should call addDoc with the correct payload", () => {
			// GIVEN
			const milestone: Milestone = {
				id: undefined,
				type: MilestoneEnum.EXPERIENCE,
				title: "X",
				description: "D",
				tags: [],
				period: "2020",
				milestoneDate: "",
				logo: undefined,
				updates: [],
				media: [],
				contributors: [],
				location: ""
			};

			// WHEN
			milestoneService.createMilestone(milestone);

			// THEN
			expect(addDoc).toHaveBeenCalledWith(databaseService.milestonesCollection, milestone);
		});
	});

	describe("updateMilestone", () => {
		it("should call setDoc with merge true", () => {
			// GIVEN
			const id = "123";
			const milestone: Milestone = {
				id,
				type: MilestoneEnum.EXPERIENCE,
				title: "X",
				description: "D",
				tags: [],
				period: "2020",
				milestoneDate: "",
				logo: undefined,
				updates: [],
				media: [],
				contributors: [],
				location: ""
			};
			const docRefMock = {} as DocumentReference;

			vi.mocked(doc).mockReturnValue(docRefMock);

			// WHEN
			milestoneService.updateMilestone(id, milestone);

			// THEN
			expect(doc).toHaveBeenCalledWith(databaseService.milestonesCollection, id);
			expect(setDoc).toHaveBeenCalledWith(docRefMock, milestone, {
				merge: true
			});
		});
	});

	describe("deleteMilestone", () => {
		it("should call deleteDoc with the right reference", () => {
			// GIVEN
			const id = "456";
			const docRefMock = {} as DocumentReference;

			vi.mocked(doc).mockReturnValue(docRefMock);

			// WHEN
			milestoneService.deleteMilestone(id);

			// THEN
			expect(doc).toHaveBeenCalledWith(databaseService.milestonesCollection, id);
			expect(deleteDoc).toHaveBeenCalledWith(docRefMock);
		});
	});
});
