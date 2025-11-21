import { ApplicationConfig, provideZonelessChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { providePrimeNG } from "primeng/config";
import { routes } from "./app.routes";
import { primengTheme } from "./styles/primeng/primeng-theme";
import { provideHttpClient, withFetch } from "@angular/common/http";
import { initializeApp, provideFirebaseApp } from "@angular/fire/app";
import { getFirestore, provideFirestore } from "@angular/fire/firestore";
import { getAuth, provideAuth } from "@angular/fire/auth";
import { ConfirmationService, MessageService } from "primeng/api";
import { provideAnimations } from "@angular/platform-browser/animations"; // TODO: remove once primeng deprecates it

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(routes),
		provideHttpClient(withFetch()),
		provideZonelessChangeDetection(),
		provideAnimations(), // TODO: remove once primeng deprecates it
		providePrimeNG({
			theme: { preset: primengTheme, options: { darkModeSelector: ".dark" } }
		}),
		provideFirebaseApp(() =>
			initializeApp({
				projectId: "mariodimodica-portfolio",
				appId: "1:529770258928:web:d661c9cbdc7339eac3fd35",
				storageBucket: "mariodimodica-portfolio.firebasestorage.app",
				apiKey: "AIzaSyCbz4jvYzywpPERvmg47e5NCFlUFvX7nTA",
				authDomain: "mariodimodica-portfolio.firebaseapp.com",
				messagingSenderId: "529770258928",
				measurementId: "G-FJ7W4XF9W5"
			})
		),
		provideFirestore(() => getFirestore()),
		provideAuth(() => getAuth()),
		MessageService,
		ConfirmationService
	]
};
