import { inject, Injectable, signal, DOCUMENT } from "@angular/core";

@Injectable({
	providedIn: "root"
})
export class StateService {
	private readonly _document = inject(DOCUMENT);

	public isMobile = signal(false);
	public isDarkMode = signal(localStorage.getItem("darkMode") === "true");

	public updateTheme(isDarkMode: boolean) {
		if (isDarkMode) {
			this._document.querySelector("html")?.classList.add("dark");
			localStorage.setItem("darkMode", "true");
		} else {
			this._document.querySelector("html")?.classList.remove("dark");
			localStorage.setItem("darkMode", "false");
		}
	}
}
