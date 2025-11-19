import { inject, Injectable, Signal } from "@angular/core";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { toSignal } from "@angular/core/rxjs-interop";
import { MilestoneService } from "./milestone.service";

@Injectable({
	providedIn: "root"
})
export class ExperienceService {
	private _milestoneService = inject(MilestoneService);

	public getExperienceMilestones(): Signal<Milestone[] | null> {
		return toSignal(this._milestoneService.getMilestonesByType(MilestoneEnum.EXPERIENCE), {
			initialValue: null
		});
	}
}
