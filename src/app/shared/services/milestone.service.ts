import { inject, Injectable } from "@angular/core";
import {
	addDoc,
	collection,
	collectionData,
	deleteDoc,
	doc,
	Firestore,
	query,
	setDoc,
	where
} from "@angular/fire/firestore";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { map, Observable } from "rxjs";
import { sortMilestonesByPeriod } from "../utils/utils";

@Injectable({
	providedIn: "root"
})
export class MilestoneService {
	private _db = inject(Firestore);
	private _milestonesCollection = collection(this._db, "milestones");

	public getMilestonesByType(type: MilestoneEnum): Observable<Milestone[]> {
		const q = query(this._milestonesCollection, where("type", "==", type));
		return collectionData(q, { idField: "id" }).pipe(
			map(milestones => sortMilestonesByPeriod(milestones as Milestone[]))
		);
	}

	public createMilestone(milestone: Milestone) {
		return addDoc(this._milestonesCollection, milestone);
	}

	public updateMilestone(milestoneId: string, updatedMilestone: Milestone) {
		const docRef = doc(this._milestonesCollection, milestoneId);
		return setDoc(docRef, updatedMilestone, { merge: true });
	}

	public deleteMilestone(milestoneId: string) {
		const docRef = doc(this._milestonesCollection, milestoneId);
		return deleteDoc(docRef);
	}
}
