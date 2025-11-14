import {
	ChangeDetectionStrategy,
	Component,
	computed,
	HostListener,
	inject,
	OnDestroy,
	OnInit
} from "@angular/core";
import { RouterOutlet, RouterLink, Router, NavigationEnd, NavigationStart } from "@angular/router";
import { MessageService } from "primeng/api";
import { Avatar } from "primeng/avatar";
import { ButtonModule } from "primeng/button";
import { DrawerModule } from "primeng/drawer";
import { TabsModule } from "primeng/tabs";
import { Toast } from "primeng/toast";
import { Subscription } from "rxjs";
import { AvatarListComponent } from "../../shared/components/avatar-list/avatar-list.component";
import { KpiComponent } from "../../shared/components/kpi/kpi.component";
import { AboutService } from "../../shared/services/about.service";
import { StateService } from "../../shared/services/state.service";
import { PATHS } from "../../shared/utils/constants";
import { isMobileDevice } from "../../shared/utils/utils";
import { slideInAnimation } from "../../shared/animations/fade-slide.animation";
import { AuthService } from "../../shared/services/auth.service";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-home",
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
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.scss",
	providers: [MessageService],
	animations: [slideInAnimation]
})
export class HomeComponent implements OnInit, OnDestroy {
	private _stateService = inject(StateService);
	private _aboutService = inject(AboutService);
	private _authService = inject(AuthService);
	private _messageService = inject(MessageService);

	private _router = inject(Router);

	public paths = PATHS;
	public aboutInfo = this._aboutService.getAboutInfo();
	public kpis = computed(() => this.aboutInfo().kpis);
	public techStack = computed(() => this.aboutInfo().techStack);
	public companies = computed(() => this.aboutInfo().companies);
	public isMailDrawerVisible = false;
	public isAdmin = computed(() => !!this._authService.user());
	public isMobile = computed(() => this._stateService.isMobile());
	public isDarkMode = computed(() => {
		const isDarkMode = this._stateService.isDarkMode();
		this._stateService.updateTheme(isDarkMode);

		return isDarkMode;
	});
	public selectedTab = this._router.url.split("/").pop() || "experience";

	private _routeSub: Subscription;

	@HostListener("window:resize")
	public onResize() {
		this._updateIsMobile();
	}

	ngOnInit() {
		this._routeSub = this._router.events.subscribe({
			next: event => {
				if (event instanceof NavigationEnd || event instanceof NavigationStart)
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

	public signOut() {
		this._authService.signOut();
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
