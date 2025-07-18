import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { Milestone, ProjectsResponse } from "../../models/milestone.model";
import { environment } from "../../../../environments/environment.development";

@Injectable({
	providedIn: "root"
})
export class ProjectsService {
	private _http = inject(HttpClient);

	public getProjects(): Observable<Milestone[]> {
		return this._http
			.get<ProjectsResponse>(`${environment.apiUrl}/projects.json`)
			.pipe(map(({ projects }) => projects));
	}
}
