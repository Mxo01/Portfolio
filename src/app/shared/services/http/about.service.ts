import { HttpClient, httpResource, HttpResourceRef } from "@angular/common/http";
import { inject, Injectable, Signal } from "@angular/core";
import { Kpi, KpisResponse } from "../../models/kpi.model";
import { forkJoin, map } from "rxjs";
import { Picture, TechStackResponse } from "../../models/picture.model";
import { ExperienceResponse } from "../../models/milestone.model";
import { calculateExperience } from "../../utils/utils";
import { environment } from "../../../../environments/environment.development";
import { toSignal } from "@angular/core/rxjs-interop";

@Injectable({
	providedIn: "root"
})
export class AboutService {
	private _http = inject(HttpClient);

	public getKpis(): Signal<Kpi[]> {
		const experience$ = this._http
			.get<ExperienceResponse>(`${environment.apiUrl}/experience.json`)
			.pipe(map(({ experience }) => experience));

		const kpis$ = this._http
			.get<KpisResponse>(`${environment.apiUrl}/kpis.json`)
			.pipe(map(({ kpis }) => kpis));

		return toSignal(
			forkJoin({ experience: experience$, kpis: kpis$ }).pipe(
				map(({ experience, kpis }) => {
					const experienceValue = calculateExperience(experience);

					return (kpis || []).map(kpi =>
						kpi.label === "Experience" ? { ...kpi, value: experienceValue } : kpi
					);
				})
			),
			{ initialValue: [] }
		);
	}

	public getTechStack(): HttpResourceRef<Picture[]> {
		return httpResource<Picture[]>(
			() => ({
				url: `${environment.apiUrl}/stack.json`,
				method: "GET",
				parse: ({ stack }: TechStackResponse) => stack || []
			}),
			{ defaultValue: [] }
		);
	}

	public getCompanies(): HttpResourceRef<Picture[]> {
		return httpResource(
			() => ({
				url: `${environment.apiUrl}/experience.json`,
				method: "GET",
				parse: ({ experience }: ExperienceResponse) =>
					(experience || [])
						.reverse()
						.map(milestone => milestone.logo)
						.filter(Boolean) as Picture[]
			}),
			{ defaultValue: [] }
		);
	}
}
