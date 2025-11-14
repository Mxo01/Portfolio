import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit } from "@angular/core";
import { Button } from "primeng/button";
import { AuthService } from "../../shared/services/auth.service";
import { Router, RouterLink } from "@angular/router";
import { Dialog } from "primeng/dialog";
import { StateService } from "../../shared/services/state.service";
import { Drawer } from "primeng/drawer";
import { isMobileDevice } from "../../shared/utils/utils";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-auth",
	imports: [Button, Dialog, RouterLink, Drawer],
	templateUrl: "./auth.component.html",
	styleUrl: "./auth.component.scss"
})
export class AuthComponent implements OnInit {
	private readonly _stateService = inject(StateService);
	private readonly _authService = inject(AuthService);
	private readonly _router = inject(Router);

	public isSignInVisible = true;
	public isMobile = computed(() => this._stateService.isMobile());

	@HostListener("window:resize")
	public onResize() {
		this._updateIsMobile();
	}

	ngOnInit() {
		this._updateIsMobile();
	}

	public signInWithGoogle() {
		this._authService.signInWithGoogle().finally(() => this._router.navigate([""]));
	}

	private _updateIsMobile() {
		const width = window.innerWidth;
		const isMobile = isMobileDevice(width);

		this._stateService.isMobile.set(isMobile);
	}
}
