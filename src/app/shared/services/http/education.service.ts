import { httpResource, HttpResourceRef } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { EducationResponse, Milestone } from "../../models/milestone.model";
import { environment } from "../../../../environments/environment.development";

@Injectable({
	providedIn: "root"
})
export class EducationService {
	public getEducation(): HttpResourceRef<Milestone[]> {
		return httpResource<Milestone[]>(
			() => ({
				url: `${environment.apiUrl}/education.json`,
				method: "GET"
			}),
			{
				defaultValue: [],
				parse: response => (response as EducationResponse)?.education || []
			}
		);
	}
}
