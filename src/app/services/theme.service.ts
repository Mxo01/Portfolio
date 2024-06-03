import { Injectable, signal } from "@angular/core";
import { Theme } from "../models/theme.model";

@Injectable({
	providedIn: "root",
})
export class ThemeService {
	theme = signal<Theme>(localStorage.getItem('theme') as Theme || "light");

	setTheme(theme: Theme) {
		this.theme.set(theme);
		localStorage.setItem("theme", theme);
		document.body.setAttribute("data-bs-theme", theme);
	}
}
