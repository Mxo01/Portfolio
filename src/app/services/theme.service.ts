import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Theme } from "../models/theme.model";

@Injectable({
	providedIn: "root",
})
export class ThemeService {
	private theme: BehaviorSubject<Theme> = new BehaviorSubject(
		(localStorage.getItem("theme") as Theme) ?? "light"
	);
	public themeObs = this.theme.asObservable();

	constructor() {}

	public setTheme(theme: Theme) {
		this.theme.next(theme);
		localStorage.setItem("theme", theme);
		document.body.setAttribute("data-bs-theme", theme);
	}
}
