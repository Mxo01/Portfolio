import { NavigationEnd, Router, RouterLink, RouterOutlet } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { Component, computed, HostListener, inject, OnInit, OnDestroy } from "@angular/core";
import { Avatar } from "primeng/avatar";
import { Kpi } from "./models/kpi.model";
import { KPIS, TECH_STACK_LIST, COMPANIES, PATHS } from "./utils/constants";
import { KpiComponent } from "./components/kpi/kpi.component";
import { AvatarListComponent } from "./components/avatar-list/avatar-list.component";
import { Picture } from "./models/picture.model";
import { isMobileDevice } from "./utils/utils";
import { StateService } from "./services/state.service";
import { TabsModule } from "primeng/tabs";
import { Subscription } from "rxjs";
import { DrawerModule } from "primeng/drawer";
import { MessageService } from "primeng/api";
import { Toast } from "primeng/toast";
@Component({
	selector: "portfolio-root",
	standalone: true,
	imports: [
		RouterOutlet,
		RouterLink,
		DrawerModule,
		Avatar,
		Toast,
		ButtonModule,
		TabsModule,
		KpiComponent,
		AvatarListComponent
	],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.scss",
	providers: [MessageService]
})
export class AppComponent implements OnInit, OnDestroy {
	private _stateService = inject(StateService);
	private _messageService = inject(MessageService);
	private _router = inject(Router);

	public paths = PATHS;
	public kpis: Kpi[] = KPIS;
	public techStackList: Picture[] = TECH_STACK_LIST;
	public companies: Picture[] = COMPANIES;
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
			if (event instanceof NavigationEnd) {
				this.selectedTab = event.url.split("/").pop() || "experience";
			}
		});

		this._updateIsMobile();
	}

	ngOnDestroy() {
		this._routeSub?.unsubscribe();
	}

	public sendEmail() {
		this.isMailDrawerVisible = false;
		window.open("mailto:mariodimodica.01@gmail.com");
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

	public onTabChange(tab: string | number) {
		this.selectedTab = tab as string;
	}

	private _updateIsMobile() {
		const width = window.innerWidth;
		const isMobile = isMobileDevice(width);

		this._stateService.isMobile.set(isMobile);
	}
}
