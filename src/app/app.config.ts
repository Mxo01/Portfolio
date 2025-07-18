import { ApplicationConfig, provideZonelessChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { providePrimeNG } from "primeng/config";
import { routes } from "./app.routes";
import { primengTheme } from "./styles/primeng/primeng-theme";
import { provideHttpClient, withFetch } from "@angular/common/http";

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(routes),
		provideHttpClient(withFetch()),
		provideAnimationsAsync(),
		provideZonelessChangeDetection(),
		providePrimeNG({
			theme: { preset: primengTheme, options: { darkModeSelector: ".dark" } }
		})
	]
};
