import { TestBed } from "@angular/core/testing";
import { signal } from "@angular/core";
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "../services/auth/auth.service";
import { adminGuard } from "./admin.guard";
import { PATHS } from "../utils/constants";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { User } from "@angular/fire/auth";
import { MockProvider } from "ng-mocks";

describe("adminGuard", () => {
	const adminGuardParams = {
		route: {} as ActivatedRouteSnapshot,
		state: {} as RouterStateSnapshot
	};
	let authServiceMock: AuthService;
	let routerMock: Router;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				MockProvider(AuthService, {
					user: signal<User | null>(null)
				}),
				MockProvider(Router)
			]
		});

		authServiceMock = TestBed.inject(AuthService);
		routerMock = TestBed.inject(Router);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should allow access if user is authenticated", () => {
		// GIVEN
		authServiceMock.user.set({} as User);
		const navigateSpy = vi.spyOn(routerMock, "navigate");

		// WHEN
		const actual = TestBed.runInInjectionContext(() =>
			adminGuard(adminGuardParams.route, adminGuardParams.state)
		);

		// THEN
		expect(actual).toBe(true);
		expect(navigateSpy).not.toHaveBeenCalled();
	});

	it("should deny access and navigate to auth if user is not authenticated", () => {
		// GIVEN
		authServiceMock.user.set(null);
		const navigateSpy = vi.spyOn(routerMock, "navigate");

		// WHEN
		const actual = TestBed.runInInjectionContext(() =>
			adminGuard(adminGuardParams.route, adminGuardParams.state)
		);

		// THEN
		expect(actual).toBe(false);
		expect(navigateSpy).toHaveBeenCalledWith([PATHS.AUTH]);
	});
});
