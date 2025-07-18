import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { EducationResponse, Milestone } from "../../models/milestone.model";
import { map, Observable } from "rxjs";
import { environment } from "../../../../environments/environment.development";

@Injectable({
	providedIn: "root"
})
export class EducationService {
	private _http = inject(HttpClient);

	public getEducation(): Observable<Milestone[]> {
		return this._http
			.get<EducationResponse>(`${environment.apiUrl}/education.json`)
			.pipe(map(({ education }) => education));
	}
}
