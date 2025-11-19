import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { PATHS } from "../utils/constants";

export const adminGuard: CanActivateFn = () => {
	const authService = inject(AuthService);
	const router = inject(Router);

	const isAuthenticated = authService.user() !== null;

	if (!isAuthenticated) router.navigate([PATHS.AUTH]);

	return isAuthenticated;
};
