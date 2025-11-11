import { inject, Injectable, signal, Signal } from "@angular/core";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { StateService } from "./state.service";
import { CacheEntry } from "../models/cache-entry.model";
import { MilestoneService } from "./milestone.service";
import { toSignal } from "@angular/core/rxjs-interop";
import { tap } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class EducationService {
	private _stateService = inject(StateService);
	private _milestoneService = inject(MilestoneService);

	public getEducationMilestones(): Signal<Milestone[]> {
		const cachedEducation = this._stateService.getFromCache<Milestone[]>(CacheEntry.EDUCATION);

		if (cachedEducation) return signal(cachedEducation);

		return toSignal(
			this._milestoneService
				.getMilestonesByTpe(MilestoneEnum.EDUCATION)
				.pipe(tap({ next: _ => this._stateService.storeInCache(CacheEntry.EDUCATION, _) })),
			{ initialValue: [] }
		);
	}
}
