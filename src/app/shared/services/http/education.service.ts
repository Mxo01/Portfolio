import { httpResource } from "@angular/common/http";
import { inject, Injectable, signal, Signal } from "@angular/core";
import { EducationResponse, Milestone } from "../../models/milestone.model";
import { environment } from "../../../../environments/environment.development";
import { StateService } from "../state.service";
import { CacheEntry } from "../../models/cache-entry.model";

@Injectable({
	providedIn: "root"
})
export class EducationService {
	private _stateService = inject(StateService);

	public getEducation(): Signal<Milestone[]> {
		const cachedEducation = this._stateService.getFromCache<Milestone[]>(CacheEntry.EDUCATION);

		if (cachedEducation) return signal(cachedEducation);

		return httpResource<Milestone[]>(
			() => ({
				url: `${environment.apiUrl}/education.json`,
				method: "GET"
			}),
			{
				defaultValue: [],
				parse: response => {
					const freshEducation = (response as EducationResponse)?.education || [];
					this._stateService.storeInCache(CacheEntry.EDUCATION, freshEducation);

					return freshEducation;
				}
			}
		).value;
	}
}
