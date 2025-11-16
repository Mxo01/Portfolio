import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { Toast } from "primeng/toast";
import { ConfirmPopup } from "primeng/confirmpopup";
import { MessageService } from "primeng/api";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-root",
	imports: [RouterOutlet, Toast, ConfirmPopup],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.scss"
})
export class AppComponent {
	private _messageService = inject(MessageService);
	private _changeDetectorRef = inject(ChangeDetectorRef);

	constructor() {
		this._messageService.messageObserver.pipe(takeUntilDestroyed()).subscribe({
			next: () => this._changeDetectorRef.detectChanges()
		});
	}
}
