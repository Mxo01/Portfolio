import { TestBed } from "@angular/core/testing";
import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { MockProvider } from "ng-mocks";
import { AuthService } from "./auth.service";
import { WhitelistService } from "../whitelist/whitelist.service";
import {
	Auth,
	signInWithPopup,
	signOut,
	authState,
	deleteUser,
	setPersistence,
	browserSessionPersistence,
	User,
	UserCredential
} from "@angular/fire/auth";
import { of } from "rxjs";

vi.mock("@angular/fire/auth", () => ({
	Auth: class {},
	GoogleAuthProvider: vi.fn(),
	signInWithPopup: vi.fn(),
	signOut: vi.fn(),
	authState: vi.fn(),
	deleteUser: vi.fn(),
	setPersistence: vi.fn(),
	browserSessionPersistence: {}
}));

describe("AuthService", () => {
	let authService: AuthService;
	let whitelistService: WhitelistService;
	let auth: Auth;

	beforeEach(() => {
		vi.mocked(authState).mockReturnValue(of(null));

		TestBed.configureTestingModule({
			providers: [AuthService, MockProvider(WhitelistService), MockProvider(Auth)]
		});

		authService = TestBed.inject(AuthService);
		whitelistService = TestBed.inject(WhitelistService);
		auth = TestBed.inject(Auth);
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		vi.clearAllMocks();
	});

	describe("constructor", () => {
		it("should initialize with null user when no session exists", () => {
			// THEN
			expect(authService.user()).toBeNull();
			expect(authState).toHaveBeenCalledWith(auth);
		});

		it("should validate user from session if exists", () => {
			// GIVEN
			const mockUser = { uid: "user123" } as User;
			vi.mocked(authState).mockReturnValue(of(mockUser));
			vi.spyOn(whitelistService, "isInWhitelist").mockReturnValue(of(true));

			// WHEN
			TestBed.inject(AuthService);

			// THEN
			expect(authState).toHaveBeenCalledWith(auth);
		});
	});

	describe("signInWithGoogle", () => {
		it("should sign in successfully with whitelisted user", async () => {
			// GIVEN
			const mockUser = { uid: "user123" } as User;
			const mockUserCredential = { user: mockUser } as UserCredential;

			vi.mocked(setPersistence).mockResolvedValue();
			vi.mocked(signInWithPopup).mockResolvedValue(mockUserCredential);
			vi.spyOn(whitelistService, "isInWhitelist").mockReturnValue(of(true));

			// WHEN
			await authService.signInWithGoogle();

			// THEN
			expect(setPersistence).toHaveBeenCalledWith(auth, browserSessionPersistence);
			expect(signInWithPopup).toHaveBeenCalled();
			expect(whitelistService.isInWhitelist).toHaveBeenCalledWith("user123");
			expect(authService.user()).toEqual(mockUser);
		});

		it("should set user to null when user is not whitelisted", async () => {
			// GIVEN
			const mockUser = { uid: "unauthorizedUser" } as User;
			const mockUserCredential = { user: mockUser } as UserCredential;

			vi.mocked(setPersistence).mockResolvedValue();
			vi.mocked(signInWithPopup).mockResolvedValue(mockUserCredential);
			vi.mocked(deleteUser).mockResolvedValue();
			vi.spyOn(whitelistService, "isInWhitelist").mockReturnValue(of(false));

			// WHEN
			await authService.signInWithGoogle();

			// THEN
			expect(deleteUser).toHaveBeenCalledWith(mockUser);
			expect(authService.user()).toBeNull();
		});

		it("should call signOut when deleteUser fails for non-whitelisted user", async () => {
			// GIVEN
			const mockUser = { uid: "unauthorizedUser" } as User;
			const mockUserCredential = { user: mockUser } as UserCredential;

			vi.mocked(setPersistence).mockResolvedValue();
			vi.mocked(signInWithPopup).mockResolvedValue(mockUserCredential);
			vi.mocked(deleteUser).mockRejectedValue(new Error("Delete failed"));
			vi.mocked(signOut).mockResolvedValue();
			vi.spyOn(whitelistService, "isInWhitelist").mockReturnValue(of(false));

			// WHEN
			await authService.signInWithGoogle();

			// THEN
			expect(deleteUser).toHaveBeenCalledWith(mockUser);
			expect(signOut).toHaveBeenCalledWith(auth);
			expect(authService.user()).toBeNull();
		});

		it("should set user to null when sign in fails", async () => {
			// GIVEN
			vi.mocked(setPersistence).mockResolvedValue();
			vi.mocked(signInWithPopup).mockRejectedValue(new Error("Sign in failed"));

			// WHEN
			await authService.signInWithGoogle();

			// THEN
			expect(authService.user()).toBeNull();
		});
	});

	describe("signOut", () => {
		it("should sign out and clear user", async () => {
			// GIVEN
			const mockUser = { uid: "user123" } as User;
			authService.user.set(mockUser);
			vi.mocked(signOut).mockResolvedValue();

			// WHEN
			await authService.signOut();

			// THEN
			expect(signOut).toHaveBeenCalledWith(auth);
			expect(authService.user()).toBeNull();
		});
	});
});
