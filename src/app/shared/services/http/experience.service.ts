import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, map } from "rxjs";
import { Milestone, ExperienceResponse } from "../../models/milestone.model";
import { API_URL } from "../../utils/constants";

@Injectable({
	providedIn: "root"
})
export class ExperienceService {
	private _http = inject(HttpClient);

	public getExperience(): Observable<Milestone[]> {
		return this._http
			.get<ExperienceResponse>(`${API_URL}/experience.json`)
			.pipe(map(({ experience }) => experience));
	}
}
