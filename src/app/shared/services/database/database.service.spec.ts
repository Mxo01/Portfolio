import { TestBed } from "@angular/core/testing";
import { DatabaseService } from "./database.service";
import { Firestore, collection } from "@angular/fire/firestore";
import { MockProvider } from "ng-mocks";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@angular/fire/firestore", () => ({
	Firestore: class {},
	collection: vi.fn().mockReturnValue({})
}));

describe("DatabaseService", () => {
	let databaseService: DatabaseService;
	let firestore: Firestore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [DatabaseService, MockProvider(Firestore)]
		});

		databaseService = TestBed.inject(DatabaseService);
		firestore = TestBed.inject(Firestore);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	it("should initialize aboutCollection", () => {
		// THEN
		expect(collection).toHaveBeenCalledWith(firestore, "about");
		expect(databaseService.aboutCollection).toBeDefined();
	});

	it("should initialize milestonesCollection", () => {
		// THEN
		expect(collection).toHaveBeenCalledWith(firestore, "milestones");
		expect(databaseService.milestonesCollection).toBeDefined();
	});

	it("should initialize whitelistCollection", () => {
		// THEN
		expect(collection).toHaveBeenCalledWith(firestore, "whitelist");
		expect(databaseService.whitelistCollection).toBeDefined();
	});
});
