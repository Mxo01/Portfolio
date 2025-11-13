import { inject, Injectable, Signal, signal } from "@angular/core";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { CacheEntry } from "../models/cache-entry.model";
import { StateService } from "./state.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { MilestoneService } from "./milestone.service";
import { tap } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class ExperienceService {
	private _stateService = inject(StateService);
	private _milestoneService = inject(MilestoneService);

	public getExperienceMilestones(): Signal<Milestone[]> {
		const cachedExperience = this._stateService.getFromCache<Milestone[]>(
			CacheEntry.EXPERIENCE
		);

		if (cachedExperience) return signal(cachedExperience);

		return toSignal(
			this._milestoneService
				.getMilestonesByTpe(MilestoneEnum.EXPERIENCE)
				.pipe(
					tap({ next: _ => this._stateService.storeInCache(CacheEntry.EXPERIENCE, _) })
				),
			{ initialValue: [] }
		);
	}
}
