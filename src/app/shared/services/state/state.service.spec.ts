import { TestBed } from "@angular/core/testing";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { MockProvider } from "ng-mocks";
import { DOCUMENT } from "@angular/common";
import { StateService } from "./state.service";

describe("StateService", () => {
	let mockDocument: Document;

	const mockHtmlElement = {
		classList: {
			add: vi.fn(),
			remove: vi.fn()
		}
	} as unknown as HTMLElement;

	const mockLocalStorage = {
		getItem: vi.fn(),
		setItem: vi.fn()
	};

	beforeEach(() => {
		mockDocument = {
			querySelector: vi.fn().mockReturnValue(mockHtmlElement)
		} as unknown as Document;

		Object.defineProperty(window, "localStorage", {
			value: mockLocalStorage,
			writable: true
		});

		TestBed.configureTestingModule({
			providers: [StateService, MockProvider(DOCUMENT, mockDocument)]
		});
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("initial state", () => {
		it("should initialize signals correctly", () => {
			// GIVEN
			mockLocalStorage.getItem.mockReturnValue("false");

			const stateService = TestBed.inject(StateService);

			// THEN
			expect(stateService.isMobile()).toBe(false);
			expect(stateService.isDarkMode()).toBe(false);
			expect(stateService.tabAnimationDirection()).toBeNull();
		});

		it('should initialize isDarkMode as true when localStorage has "true"', () => {
			mockLocalStorage.getItem.mockReturnValue("true");

			const stateService = TestBed.inject(StateService);

			expect(stateService.isDarkMode()).toBe(true);
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("darkMode");
		});

		it('should initialize isDarkMode as false when localStorage has "false"', () => {
			mockLocalStorage.getItem.mockReturnValue("false");

			const stateService = TestBed.inject(StateService);

			expect(stateService.isDarkMode()).toBe(false);
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("darkMode");
		});

		it("should initialize isDarkMode as false when localStorage returns null", () => {
			mockLocalStorage.getItem.mockReturnValue(null);

			const stateService = TestBed.inject(StateService);

			expect(stateService.isDarkMode()).toBe(false);
			expect(mockLocalStorage.getItem).toHaveBeenCalledWith("darkMode");
		});
	});

	describe("updateTheme", () => {
		it("should enable dark mode", () => {
			// GIVEN
			const stateService = TestBed.inject(StateService);
			const isDarkMode = true;

			// WHEN
			stateService.updateTheme(isDarkMode);

			// THEN
			expect(mockDocument.querySelector).toHaveBeenCalledWith("html");
			expect(mockHtmlElement.classList.add).toHaveBeenCalledWith("dark");
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith("darkMode", "true");
		});

		it("should disable dark mode", () => {
			// GIVEN
			const stateService = TestBed.inject(StateService);
			const isDarkMode = false;

			// WHEN
			stateService.updateTheme(isDarkMode);

			// THEN
			expect(mockDocument.querySelector).toHaveBeenCalledWith("html");
			expect(mockHtmlElement.classList.remove).toHaveBeenCalledWith("dark");
			expect(mockLocalStorage.setItem).toHaveBeenCalledWith("darkMode", "false");
		});
	});
});
