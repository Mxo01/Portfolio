import { inject, Injectable } from "@angular/core";
import { Firestore, collection } from "@angular/fire/firestore";

@Injectable({
	providedIn: "root"
})
export class DatabaseService {
	private _db = inject(Firestore);
	public aboutCollection = collection(this._db, "about");
	public milestonesCollection = collection(this._db, "milestones");
	public whitelistCollection = collection(this._db, "whitelist");
}
