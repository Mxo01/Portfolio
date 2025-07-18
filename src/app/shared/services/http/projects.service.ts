import { httpResource, HttpResourceRef } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Milestone, ProjectsResponse } from "../../models/milestone.model";
import { environment } from "../../../../environments/environment.development";

@Injectable({
	providedIn: "root"
})
export class ProjectsService {
	public getProjects(): HttpResourceRef<Milestone[]> {
		return httpResource<Milestone[]>(
			() => ({
				url: `${environment.apiUrl}/projects.json`,
				method: "GET",
				parse: ({ projects }: ProjectsResponse) => projects || []
			}),
			{ defaultValue: [] }
		);
	}
}
