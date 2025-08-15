import { httpResource } from "@angular/common/http";
import { inject, Injectable, Signal, signal } from "@angular/core";
import { Milestone, ExperienceResponse } from "../../models/milestone.model";
import { environment } from "../../../../environments/environment.development";
import { CacheEntry } from "../../models/cache-entry.model";
import { StateService } from "../state.service";

@Injectable({
	providedIn: "root"
})
export class ExperienceService {
	private _stateService = inject(StateService);

	public getExperience(): Signal<Milestone[]> {
		const cachedExperience = this._stateService.getFromCache<Milestone[]>(
			CacheEntry.EXPERIENCE
		);

		if (cachedExperience) return signal(cachedExperience);

		return httpResource<Milestone[]>(
			() => ({
				url: `${environment.apiUrl}/experience.json`,
				method: "GET"
			}),
			{
				defaultValue: [],
				parse: response => {
					const freshExperience = (response as ExperienceResponse)?.experience || [];
					this._stateService.storeInCache(CacheEntry.EXPERIENCE, freshExperience);

					return freshExperience;
				}
			}
		).value;
	}
}
