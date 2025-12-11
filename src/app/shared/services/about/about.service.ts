import { AboutInfo } from "../../models/about.model";
import { inject, Injectable, Signal } from "@angular/core";
import { Picture } from "../../models/picture.model";
import { doc, docData, updateDoc } from "@angular/fire/firestore";
import { combineLatest, map, Observable } from "rxjs";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";
import { calculateExperience } from "../../utils/utils";
import { ExperienceService } from "../../services/experience/experience.service";
import { DatabaseService } from "../../services/database/database.service";

@Injectable({
	providedIn: "root"
})
export class AboutService {
	private _db = inject(DatabaseService);
	private _experienceService = inject(ExperienceService);

	public getAboutInfo(): Signal<AboutInfo | null> {
		const docRef = doc(this._db.aboutCollection, "info");
		const aboutInfo$ = docData(docRef) as Observable<AboutInfo>;
		const experiences$ = toObservable(this._experienceService.getExperienceMilestones());

		return toSignal(
			combineLatest({ experiences: experiences$, aboutInfo: aboutInfo$ }).pipe(
				map(({ experiences, aboutInfo }) => {
					const { kpis } = aboutInfo;
					const experienceMilestones = experiences || [];
					const experiencePeriods = experienceMilestones.map(
						milestone => milestone.period
					);
					const experienceValue = calculateExperience(experiencePeriods);
					const companies = experienceMilestones
						.reverse()
						.map(milestone => milestone.logo)
						.filter(Boolean);

					return {
						...aboutInfo,
						kpis: [{ label: "Experience", value: experienceValue }, ...kpis],
						companies: companies as Picture[]
					};
				})
			),
			{ initialValue: null }
		);
	}

	public saveTechStack(aboutInfo: Pick<AboutInfo, "techStack">) {
		const docRef = doc(this._db.aboutCollection, "info");
		return updateDoc(docRef, aboutInfo);
	}

	public updateCV(aboutInfo: Pick<AboutInfo, "cvUrl">) {
		const docRef = doc(this._db.aboutCollection, "info");
		return updateDoc(docRef, aboutInfo);
	}
}
