import { inject, Injectable, signal, Signal } from "@angular/core";
import { Picture } from "../models/picture.model";
import { StateService } from "./state.service";
import { CacheEntry } from "../models/cache-entry.model";
import { collection, doc, docData, Firestore } from "@angular/fire/firestore";
import { AboutInfo } from "../models/about.model";
import { combineLatest, map, Observable, tap } from "rxjs";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { calculateExperience } from "../utils/utils";
import { ExperienceService } from "./experience.service";

@Injectable({
	providedIn: "root"
})
export class AboutService {
	private _db = inject(Firestore);
	private _aboutCollection = collection(this._db, "about");

	private _stateService = inject(StateService);
	private _experienceService = inject(ExperienceService);

	public getAboutInfo(): Signal<AboutInfo> {
		const cachedAboutInfo = this._stateService.getFromCache<AboutInfo>(CacheEntry.ABOUT);

		if (cachedAboutInfo) return signal(cachedAboutInfo);

		const docRef = doc(this._aboutCollection, "info");
		const aboutInfo$ = docData(docRef) as Observable<AboutInfo>;
		const experiences$ = toObservable(this._experienceService.getExperienceMilestones());

		return toSignal(
			combineLatest({ experiences: experiences$, aboutInfo: aboutInfo$ }).pipe(
				map(({ experiences, aboutInfo }) => {
					const { kpis } = aboutInfo;
					const experiencePeriods = experiences.map(milestone => milestone.period);
					const experienceValue = calculateExperience(experiencePeriods);
					const companies = experiences
						.reverse()
						.map(milestone => milestone.logo)
						.filter(Boolean);

					return {
						...aboutInfo,
						kpis: (kpis || []).map(kpi =>
							kpi.label === "Experience" ? { ...kpi, value: experienceValue } : kpi
						),
						companies: (companies || []) as Picture[]
					};
				}),
				tap({
					next: aboutInfo => this._stateService.storeInCache(CacheEntry.ABOUT, aboutInfo)
				})
			),
			{
				initialValue: {
					kpis: [],
					techStack: [],
					companies: []
				} as AboutInfo
			}
		);
	}
}
