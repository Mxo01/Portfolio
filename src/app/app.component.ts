import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from "@angular/core";
import { NavigationEnd, Router, RouterOutlet } from "@angular/router";
import { Toast } from "primeng/toast";
import { ConfirmPopup } from "primeng/confirmpopup";
import { filter, map, pairwise, startWith, Subscription } from "rxjs";
import { TabEnum } from "./shared/models/tab.model";
import { StateService } from "./shared/services/state.service";
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-root",
	imports: [RouterOutlet, Toast, ConfirmPopup],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.scss"
})
export class AppComponent implements OnInit, OnDestroy {
	private _stateService = inject(StateService);

	private _router = inject(Router);

	private _routerEventsSub?: Subscription;

	ngOnInit() {
		this._routerEventsSub = this._router.events
			.pipe(
				filter(event => event instanceof NavigationEnd),
				startWith(null),
				pairwise(),
				map(([from, to]) => [
					from?.url?.split("/")?.pop() as TabEnum,
					to?.url?.split("/")?.pop() as TabEnum
				])
			)
			.subscribe({
				next: ([from, to]) => {
					const fromExperienceToEduction =
						from === TabEnum.EXPERIENCE && to === TabEnum.EDUCATION;
					const fromExperienceToProjects =
						from === TabEnum.EXPERIENCE && to === TabEnum.PROJECTS;
					const fromEductionToExperience =
						from === TabEnum.EDUCATION && to === TabEnum.EXPERIENCE;
					const fromEducationToProjects =
						from === TabEnum.EDUCATION && to === TabEnum.PROJECTS;
					const fromProjectsToExperience =
						from === TabEnum.PROJECTS && to === TabEnum.EXPERIENCE;
					const fromProjectsToEduction =
						from === TabEnum.PROJECTS && to === TabEnum.EDUCATION;

					if (
						fromEductionToExperience ||
						fromProjectsToExperience ||
						fromProjectsToEduction
					) {
						this._stateService.tabAnimationDirection.set("right");
					} else if (
						fromExperienceToEduction ||
						fromExperienceToProjects ||
						fromEducationToProjects
					) {
						this._stateService.tabAnimationDirection.set("left");
					} else {
						console.log("Resetting animations");
						this._stateService.tabAnimationDirection.set(null);
					}
				}
			});
	}

	ngOnDestroy() {
		this._routerEventsSub?.unsubscribe();
	}
}
