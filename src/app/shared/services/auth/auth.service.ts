import { inject, Injectable, signal } from "@angular/core";
import {
	GoogleAuthProvider,
	Auth,
	signInWithPopup,
	User,
	signOut,
	authState,
	deleteUser,
	setPersistence,
	browserSessionPersistence
} from "@angular/fire/auth";
import { firstValueFrom, take } from "rxjs";
import { WhitelistService } from "../whitelist/whitelist.service";

@Injectable({
	providedIn: "root"
})
export class AuthService {
	private readonly _whitelistService = inject(WhitelistService);

	private readonly _auth = inject(Auth);

	public user = signal<User | null>(null);

	constructor() {
		this._checkSessionPersistence();
	}

	private _checkSessionPersistence() {
		authState(this._auth)
			.pipe(take(1))
			.subscribe({ next: user => this._validateUser(user) });
	}

	public async signInWithGoogle() {
		await setPersistence(this._auth, browserSessionPersistence);

		return signInWithPopup(this._auth, new GoogleAuthProvider())
			.then(userCredential => this._validateUser(userCredential.user))
			.catch(() => this.user.set(null));
	}

	public async signOut() {
		await signOut(this._auth);
		this.user.set(null);
	}

	private async _validateUser(user: User | null) {
		if (!user) {
			this.user.set(null);
			return;
		}

		const isUserInWhitelist = await firstValueFrom(
			this._whitelistService.isInWhitelist(user.uid)
		);

		if (!isUserInWhitelist) {
			try {
				await deleteUser(user);
			} catch {
				await this.signOut();
			}

			this.user.set(null);
			return;
		}

		this.user.set(user);
	}
}
