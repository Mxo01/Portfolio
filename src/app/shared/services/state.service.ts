import { inject, Injectable, signal, DOCUMENT } from "@angular/core";
import { CacheEntry } from "../models/cache-entry.model";

@Injectable({
	providedIn: "root"
})
export class StateService {
	private readonly _document = inject(DOCUMENT);

	private _cache = new Map<CacheEntry, unknown>();

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

	public storeInCache<T>(key: CacheEntry, value: T) {
		this._cache.set(key, value);
	}

	public getFromCache<T>(key: CacheEntry): T | undefined {
		return this._cache.get(key) as T | undefined;
	}
}
