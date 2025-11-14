import { inject, Injectable, signal, WritableSignal } from "@angular/core";
import {
	GoogleAuthProvider,
	Auth,
	signInWithPopup,
	User,
	signOut,
	authState
} from "@angular/fire/auth";
import { MessageService } from "primeng/api";
import { take } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class AuthService {
	private readonly _auth = inject(Auth);
	private readonly _messageService = inject(MessageService);

	public user: WritableSignal<User | null> = signal(null);

	constructor() {
		this._checkSessionPersistence();
	}

	private _checkSessionPersistence() {
		authState(this._auth)
			.pipe(take(1))
			.subscribe({ next: user => this._validateUser(user) });
	}

	public async signInWithGoogle() {
		return signInWithPopup(this._auth, new GoogleAuthProvider()).then(userCredential =>
			this._validateUser(userCredential.user, true)
		);
	}

	public signOut(unauthorized = false) {
		if (unauthorized) {
			this._messageService.add({
				severity: "error",
				summary: "Error",
				detail: "You are not authorized to access this application with this privilege."
			});
		}

		signOut(this._auth).then(() => this.user.set(null));
	}

	private _validateUser(user: User | null, unauthorized = false) {
		const email = user?.email;

		if (email !== "mariodimodica.01@gmail.com") this.signOut(unauthorized);
		else this.user.set(user);
	}
}
