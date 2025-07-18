import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { EducationResponse, Milestone } from "../../models/milestone.model";
import { API_URL } from "../../utils/constants";
import { map, Observable } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class EducationService {
	private _http = inject(HttpClient);

	public getEducation(): Observable<Milestone[]> {
		return this._http
			.get<EducationResponse>(`${API_URL}/education.json`)
			.pipe(map(({ education }) => education));
	}
}
