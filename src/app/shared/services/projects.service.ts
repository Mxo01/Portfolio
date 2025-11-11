import { inject, Injectable, Signal, signal } from "@angular/core";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { StateService } from "./state.service";
import { CacheEntry } from "../models/cache-entry.model";
import { MilestoneService } from "./milestone.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { tap } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class ProjectsService {
	private _stateService = inject(StateService);
	private _milestoneService = inject(MilestoneService);

	public getProjectsMilestones(): Signal<Milestone[]> {
		const cachedProjects = this._stateService.getFromCache<Milestone[]>(CacheEntry.PROJECTS);

		if (cachedProjects) return signal(cachedProjects);

		return toSignal(
			this._milestoneService
				.getMilestonesByTpe(MilestoneEnum.PROJECT)
				.pipe(tap({ next: _ => this._stateService.storeInCache(CacheEntry.PROJECTS, _) })),
			{ initialValue: [] }
		);
	}
}
