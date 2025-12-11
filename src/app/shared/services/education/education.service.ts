import { inject, Injectable, Signal } from "@angular/core";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import { MilestoneService } from "../milestone/milestone.service";
import { toSignal } from "@angular/core/rxjs-interop";

@Injectable({
	providedIn: "root"
})
export class EducationService {
	private _milestoneService = inject(MilestoneService);

	public getEducationMilestones(): Signal<Milestone[] | null> {
		return toSignal(this._milestoneService.getMilestonesByType(MilestoneEnum.EDUCATION), {
			initialValue: null
		});
	}
}
