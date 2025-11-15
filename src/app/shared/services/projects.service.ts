import { inject, Injectable, Signal } from "@angular/core";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { MilestoneService } from "./milestone.service";
import { toSignal } from "@angular/core/rxjs-interop";

@Injectable({
	providedIn: "root"
})
export class ProjectsService {
	private _milestoneService = inject(MilestoneService);

	public getProjectsMilestones(): Signal<Milestone[]> {
		return toSignal(this._milestoneService.getMilestonesByType(MilestoneEnum.PROJECT), {
			initialValue: []
		});
	}
}
