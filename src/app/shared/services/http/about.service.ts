import { HttpClient, httpResource } from "@angular/common/http";
import { inject, Injectable, signal, Signal } from "@angular/core";
import { Kpi, KpisResponse } from "../../models/kpi.model";
import { forkJoin, map, tap } from "rxjs";
import { Picture, TechStackResponse } from "../../models/picture.model";
import { ExperienceResponse } from "../../models/milestone.model";
import { calculateExperience } from "../../utils/utils";
import { environment } from "../../../../environments/environment.development";
import { toSignal } from "@angular/core/rxjs-interop";
import { StateService } from "../state.service";
import { CacheEntry } from "../../models/cache-entry.model";

@Injectable({
	providedIn: "root"
})
export class AboutService {
	private _http = inject(HttpClient);
	private _stateService = inject(StateService);

	public getKpis(): Signal<Kpi[]> {
		const cachedKpis = this._stateService.getFromCache<Kpi[]>(CacheEntry.KPIS);

		if (cachedKpis) return signal(cachedKpis);

		const experience$ = this._http
			.get<ExperienceResponse>(`${environment.apiUrl}/experience.json`)
			.pipe(map(({ experience }) => experience));

		const kpis$ = this._http
			.get<KpisResponse>(`${environment.apiUrl}/kpis.json`)
			.pipe(map(({ kpis }) => kpis));

		return toSignal(
			forkJoin({ experience: experience$, kpis: kpis$ }).pipe(
				map(({ experience, kpis }) => {
					const experiencePeriods = experience.map(milestone => milestone.period);
					const experienceValue = calculateExperience(experiencePeriods);

					return (kpis || []).map(kpi =>
						kpi.label === "Experience" ? { ...kpi, value: experienceValue } : kpi
					);
				}),
				tap({
					next: freshKpis => this._stateService.storeInCache(CacheEntry.KPIS, freshKpis)
				})
			),
			{ initialValue: [] }
		);
	}

	public getTechStack(): Signal<Picture[]> {
		const cachedStack = this._stateService.getFromCache<Picture[]>(CacheEntry.STACK);

		if (cachedStack) return signal(cachedStack);

		return httpResource<Picture[]>(
			() => ({
				url: `${environment.apiUrl}/stack.json`,
				method: "GET"
			}),
			{
				defaultValue: [],
				parse: response => {
					const freshStack = (response as TechStackResponse)?.stack || [];
					this._stateService.storeInCache(CacheEntry.STACK, freshStack);

					return freshStack;
				}
			}
		).value;
	}

	public getCompanies(): Signal<Picture[]> {
		const cachedCompanies = this._stateService.getFromCache<Picture[]>(CacheEntry.COMPANIES);

		if (cachedCompanies) return signal(cachedCompanies);

		return httpResource<Picture[]>(
			() => ({
				url: `${environment.apiUrl}/experience.json`,
				method: "GET"
			}),
			{
				defaultValue: [],
				parse: response => {
					const freshCompanies = ((response as ExperienceResponse)?.experience
						.reverse()
						.map(milestone => milestone.logo)
						.filter(Boolean) || []) as Picture[];
					this._stateService.storeInCache(CacheEntry.COMPANIES, freshCompanies);

					return freshCompanies;
				}
			}
		).value;
	}
}
