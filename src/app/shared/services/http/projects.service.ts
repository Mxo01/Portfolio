import { httpResource } from "@angular/common/http";
import { inject, Injectable, Signal, signal } from "@angular/core";
import { Milestone, ProjectsResponse } from "../../models/milestone.model";
import { environment } from "../../../../environments/environment.development";
import { StateService } from "../state.service";
import { CacheEntry } from "../../models/cache-entry.model";

@Injectable({
	providedIn: "root"
})
export class ProjectsService {
	private _stateService = inject(StateService);

	public getProjects(): Signal<Milestone[]> {
		const cachedProjects = this._stateService.getFromCache<Milestone[]>(CacheEntry.PROJECTS);

		if (cachedProjects) return signal(cachedProjects);

		return httpResource<Milestone[]>(
			() => ({
				url: `${environment.apiUrl}/projects.json`,
				method: "GET"
			}),
			{
				defaultValue: [],
				parse: response => {
					const freshProjects = (response as ProjectsResponse)?.projects || [];
					this._stateService.storeInCache(CacheEntry.PROJECTS, freshProjects);

					return freshProjects;
				}
			}
		).value;
	}
}
