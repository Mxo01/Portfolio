import { inject, Injectable } from "@angular/core";
import { collection, collectionData, Firestore, query, where } from "@angular/fire/firestore";
import { Milestone, MilestoneEnum } from "../models/milestone.model";
import { Observable } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class MilestoneService {
	private _db = inject(Firestore);
	private _milestonesCollection = collection(this._db, "milestones");

	public getMilestonesByTpe(type: MilestoneEnum): Observable<Milestone[]> {
		const q = query(this._milestonesCollection, where("type", "==", type));
		return collectionData(q, { idField: "id" }) as Observable<Milestone[]>;
	}
}
