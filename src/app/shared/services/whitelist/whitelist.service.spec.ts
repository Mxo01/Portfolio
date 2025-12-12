import { TestBed } from "@angular/core/testing";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { MockProvider } from "ng-mocks";
import { WhitelistService } from "./whitelist.service";
import { DatabaseService } from "../database/database.service";
import { WhitelistIds } from "../../models/whitelist-id.model";
import { doc, docData, DocumentReference, CollectionReference } from "@angular/fire/firestore";
import { of, firstValueFrom } from "rxjs";

vi.mock("@angular/fire/firestore", () => ({
	doc: vi.fn(),
	docData: vi.fn()
}));

describe("WhitelistService", () => {
	let whitelistService: WhitelistService;
	let databaseService: DatabaseService;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				WhitelistService,
				MockProvider(DatabaseService, {
					whitelistCollection: {} as CollectionReference
				})
			]
		});

		whitelistService = TestBed.inject(WhitelistService);
		databaseService = TestBed.inject(DatabaseService);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("isInWhitelist", () => {
		it.each([
			{
				title: "should retrun true when uid is in whitelist",
				stubbed: { uid: "user123", whitelistIds: ["user123", "user456", "user789"] },
				expected: true
			},
			{
				title: "should retrun false when uid is not in whitelist",
				stubbed: { uid: "unknownUser", whitelistIds: ["user123", "user456", "user789"] },
				expected: false
			},
			{
				title: "should retrun false when the whitelist is empty",
				stubbed: { uid: "user456", whitelistIds: [] },
				expected: false
			}
		])("%title", async ({ stubbed, expected }) => {
			// GIVEN
			const { uid, whitelistIds } = stubbed;
			const mockWhitelistIds: WhitelistIds = { whitelistIds };
			const docRefMock = {} as DocumentReference;

			vi.mocked(doc).mockReturnValue(docRefMock);
			vi.mocked(docData).mockReturnValue(of(mockWhitelistIds));

			// WHEN
			const isWhitelisted = await firstValueFrom(whitelistService.isInWhitelist(uid));

			// THEN
			expect(doc).toHaveBeenCalledWith(databaseService.whitelistCollection, "whitelistIds");
			expect(docData).toHaveBeenCalledWith(docRefMock);
			expect(isWhitelisted).toBe(expected);
		});
	});
});
