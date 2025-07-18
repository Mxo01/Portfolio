import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Kpi, KpisResponse } from "../../models/kpi.model";
import { forkJoin, map, Observable } from "rxjs";
import { Picture, TechStackResponse } from "../../models/picture.model";
import { ExperienceResponse } from "../../models/milestone.model";
import { calculateExperience } from "../../utils/utils";
import { environment } from "../../../../environments/environment.development";

@Injectable({
	providedIn: "root"
})
export class AboutService {
	private _http = inject(HttpClient);

	public getKpis(): Observable<Kpi[]> {
		const experience$ = this._http
			.get<ExperienceResponse>(`${environment.apiUrl}/experience.json`)
			.pipe(map(({ experience }) => experience));

		const kpis$ = this._http
			.get<KpisResponse>(`${environment.apiUrl}/kpis.json`)
			.pipe(map(({ kpis }) => kpis));

		return forkJoin({ experience: experience$, kpis: kpis$ }).pipe(
			map(({ experience, kpis }) => {
				const experienceValue = calculateExperience(experience);

				return kpis.map(kpi =>
					kpi.label === "Experience" ? { ...kpi, value: experienceValue } : kpi
				);
			})
		);
	}

	public getTechStack(): Observable<Picture[]> {
		return this._http
			.get<TechStackResponse>(`${environment.apiUrl}/stack.json`)
			.pipe(map(({ stack }) => stack));
	}

	public getCompanies(): Observable<Picture[]> {
		return this._http.get<ExperienceResponse>(`${environment.apiUrl}/experience.json`).pipe(
			map(
				({ experience }) =>
					experience
						.reverse()
						.map(milestone => milestone.logo)
						.filter(Boolean) as Picture[]
			)
		);
	}
}
