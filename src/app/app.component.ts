import { NavigationEnd, Router, RouterLink, RouterOutlet } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { Component, computed, HostListener, inject, OnInit, OnDestroy } from "@angular/core";
import { Avatar } from "primeng/avatar";
import { Kpi } from "./shared/models/kpi.model";
import { KpiComponent } from "./shared/components/kpi/kpi.component";
import { AvatarListComponent } from "./shared/components/avatar-list/avatar-list.component";
import { Picture } from "./shared/models/picture.model";
import { StateService } from "./shared/services/state.service";
import { TabsModule } from "primeng/tabs";
import { Observable, of, Subscription } from "rxjs";
import { DrawerModule } from "primeng/drawer";
import { MessageService } from "primeng/api";
import { Toast } from "primeng/toast";
import { PATHS } from "./shared/utils/constants";
import { isMobileDevice } from "./shared/utils/utils";
import { slideInAnimation } from "./shared/animations/fade-slide.animation";
import { AboutService } from "./shared/services/http/about.service";
import { AsyncPipe } from "@angular/common";
@Component({
	selector: "portfolio-root",
	imports: [
		RouterOutlet,
		RouterLink,
		DrawerModule,
		Avatar,
		Toast,
		ButtonModule,
		TabsModule,
		KpiComponent,
		AvatarListComponent,
		AsyncPipe
	],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.scss",
	providers: [MessageService],
	animations: [slideInAnimation]
})
export class AppComponent implements OnInit, OnDestroy {
	private _stateService = inject(StateService);
	private _messageService = inject(MessageService);
	private _aboutService = inject(AboutService);
	private _router = inject(Router);

	public paths = PATHS;
	public kpis$: Observable<Kpi[]> = of([]);
	public techStack$: Observable<Picture[]> = of([]);
	public companies$: Observable<Picture[]> = of([]);
	public isMailDrawerVisible = false;
	public isMobile = computed(() => this._stateService.isMobile());
	public isDarkMode = computed(() => {
		const isDarkMode = this._stateService.isDarkMode();
		this._stateService.updateTheme(isDarkMode);

		return isDarkMode;
	});
	public selectedTab = "experience";

	private _routeSub: Subscription;

	@HostListener("window:resize")
	public onResize() {
		this._updateIsMobile();
	}

	ngOnInit() {
		this._routeSub = this._router.events.subscribe(event => {
			if (event instanceof NavigationEnd)
				this.selectedTab = event.url.split("/").pop() || "experience";
		});

		this.companies$ = this._aboutService.getCompanies();
		this.kpis$ = this._aboutService.getKpis();
		this.techStack$ = this._aboutService.getTechStack();

		this._updateIsMobile();
	}

	ngOnDestroy() {
		this._routeSub?.unsubscribe();
	}

	public sendEmail() {
		this.isMailDrawerVisible = false;
		window.location.href = "mailto:mariodimodica.01@gmail.com";
	}

	public copyEmail() {
		navigator.clipboard
			.writeText("mariodimodica.01@gmail.com")
			.then(() => {
				this._messageService.add({
					severity: "success",
					summary: "Success",
					detail: "Email copied to clipboard"
				});

				this.isMailDrawerVisible = false;
			})
			.catch(() =>
				this._messageService.add({
					severity: "error",
					summary: "Error",
					detail: "Failed to copy email"
				})
			);
	}

	public toggleDarkMode() {
		this._stateService.isDarkMode.set(!this.isDarkMode());
	}

	public viewCV() {
		window.open("CV_Mario_Di_Modica.pdf", "_blank");
	}

	public onTabChange(tab: string | number) {
		this.selectedTab = tab as string;
	}

	public getRouteAnimationData(outlet: RouterOutlet) {
		return outlet?.activatedRouteData?.["animation"];
	}

	private _updateIsMobile() {
		const width = window.innerWidth;
		const isMobile = isMobileDevice(width);

		this._stateService.isMobile.set(isMobile);
	}
}
