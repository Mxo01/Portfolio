import { AboutInfo } from './../models/about.model';
import { inject, Injectable, Signal } from "@angular/core";
import { Picture } from "../models/picture.model";
import { collection, doc, docData, Firestore, setDoc } from "@angular/fire/firestore";
import { combineLatest, map, Observable } from "rxjs";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { calculateExperience } from "../utils/utils";
import { ExperienceService } from "./experience.service";

@Injectable({
	providedIn: "root"
})
export class AboutService {
	private _db = inject(Firestore);
	private _aboutCollection = collection(this._db, "about");

	private _experienceService = inject(ExperienceService);

	public getAboutInfo(): Signal<AboutInfo> {
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
						kpis: [{ label: "Experience", value: experienceValue }, ...(kpis || [])],
						companies: (companies || []) as Picture[]
					};
				}),
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

	public saveAboutInfo(aboutInfo: Omit<AboutInfo, "companies">) {
		const docRef = doc(this._aboutCollection, "info");
    return setDoc(docRef, aboutInfo);
	}
}
