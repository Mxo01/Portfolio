import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Toast } from "primeng/toast";
import { ConfirmPopup } from "primeng/confirmpopup";
import { MessageService } from "primeng/api";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { AuthService } from "./shared/services/auth.service";
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-root",
	imports: [RouterOutlet, Toast, ConfirmPopup],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.scss"
})
export class AppComponent implements OnDestroy {
	private _authService = inject(AuthService);
	private _messageService = inject(MessageService);
	private _changeDetectorRef = inject(ChangeDetectorRef);

	constructor() {
		this._messageService.messageObserver.pipe(takeUntilDestroyed()).subscribe({
			next: () => this._changeDetectorRef.detectChanges()
		});
	}

	ngOnDestroy() {
		this._authService.signOut();
	}
}
