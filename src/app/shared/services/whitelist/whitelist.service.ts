import { WhitelistIds } from "../../models/whitelist-id.model";
import { inject, Injectable } from "@angular/core";
import { DatabaseService } from "../database/database.service";
import { doc, docData } from "@angular/fire/firestore";
import { map, Observable } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class WhitelistService {
	private readonly _db = inject(DatabaseService);

	public isInWhitelist(uid: string) {
		const docRef = doc(this._db.whitelistCollection, "whitelistIds");
		const whitelistIds$ = docData(docRef) as Observable<WhitelistIds>;

		return whitelistIds$.pipe(
			map(({ whitelistIds }: WhitelistIds) => whitelistIds.includes(uid))
		);
	}
}
