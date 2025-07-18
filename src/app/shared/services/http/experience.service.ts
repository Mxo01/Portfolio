import { httpResource, HttpResourceRef } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Milestone, ExperienceResponse } from "../../models/milestone.model";
import { environment } from "../../../../environments/environment.development";

@Injectable({
	providedIn: "root"
})
export class ExperienceService {
	public getExperience(): HttpResourceRef<Milestone[]> {
		return httpResource<Milestone[]>(
			() => ({
				url: `${environment.apiUrl}/experience.json`,
				method: "GET",
				parse: ({ experience }: ExperienceResponse) => experience || []
			}),
			{ defaultValue: [] }
		);
	}
}
