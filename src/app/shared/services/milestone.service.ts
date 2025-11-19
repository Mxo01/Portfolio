import { inject, Injectable } from "@angular/core";
import {
	addDoc, collectionData,
	deleteDoc,
	doc, query,
	setDoc,
	where
} from "@angular/fire/firestore";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { map, Observable } from "rxjs";
import { sortMilestonesByPeriod } from "../utils/utils";
import { DatabaseService } from "./database.service";

@Injectable({
	providedIn: "root"
})
export class MilestoneService {
	private _db = inject(DatabaseService);

	public getMilestonesByType(type: MilestoneEnum): Observable<Milestone[]> {
		const q = query(this._db.milestonesCollection, where("type", "==", type));
		return collectionData(q, { idField: "id" }).pipe(
			map(milestones => sortMilestonesByPeriod(milestones as Milestone[]))
		);
	}

	public createMilestone(milestone: Milestone) {
		return addDoc(this._db.milestonesCollection, milestone);
	}

	public updateMilestone(milestoneId: string, updatedMilestone: Milestone) {
		const docRef = doc(this._db.milestonesCollection, milestoneId);
		return setDoc(docRef, updatedMilestone, { merge: true });
	}

	public deleteMilestone(milestoneId: string) {
		const docRef = doc(this._db.milestonesCollection, milestoneId);
		return deleteDoc(docRef);
	}
}
