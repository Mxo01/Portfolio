import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { Milestone, ProjectsResponse } from "../../models/milestone.model";
import { API_URL } from "../../utils/constants";

@Injectable({
	providedIn: "root"
})
export class ProjectsService {
	private _http = inject(HttpClient);

	public getProjects(): Observable<Milestone[]> {
		return this._http
			.get<ProjectsResponse>(`${API_URL}/projects.json`)
			.pipe(map(({ projects }) => projects));
	}
}
