import { TabEnum } from "./../../shared/models/tab.model";
import {
	ChangeDetectionStrategy,
	Component,
	computed, HostListener,
	inject,
	OnDestroy,
	OnInit,
	signal,
	viewChild
} from "@angular/core";
import { RouterOutlet, RouterLink, Router, NavigationEnd, NavigationStart } from "@angular/router";
import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { DrawerModule } from "primeng/drawer";
import { TabsModule } from "primeng/tabs";
import { Subscription } from "rxjs";
import { StateService } from "../../shared/services/state.service";
import { PATHS, TAB_TO_MILESTONE_TYPE_MAPPING } from "../../shared/utils/constants";
import { convertFileToBase64, isMobileDevice } from "../../shared/utils/utils";
import { slideInAnimation } from "../../shared/animations/fade-slide.animation";
import { AuthService } from "../../shared/services/auth.service";
import { Dialog } from "primeng/dialog";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AutoCompleteModule } from "primeng/autocomplete";
import { InputTextModule } from "primeng/inputtext";
import { AboutComponent } from "../../shared/components/about/about.component";
import { MilestoneFormComponent } from "../../shared/components/milestone/milestone-form/milestone-form.component";
import { AboutService } from "../../shared/services/about.service";
import { Tooltip } from "primeng/tooltip";
import { FileUpload, FileUploadEvent } from "primeng/fileupload";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-home",
	imports: [
		RouterOutlet,
		RouterLink,
		DrawerModule,
		ButtonModule,
		TabsModule,
		Dialog,
		ReactiveFormsModule,
		FormsModule,
		InputTextModule,
		AutoCompleteModule,
		AboutComponent,
		MilestoneFormComponent,
		Tooltip,
		FileUpload
	],
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.scss",
	providers: [MessageService],
	animations: [slideInAnimation]
})
export class HomeComponent implements OnInit, OnDestroy {
	private _stateService = inject(StateService);
	private _authService = inject(AuthService);
	private _aboutService = inject(AboutService);

	private _router = inject(Router);

	public milestoneForm = viewChild<MilestoneFormComponent>("milestoneForm");

	protected readonly TabEnum = TabEnum;

	public selectedTab = signal(this._router.url.split("/").pop() as TabEnum);
	public currentMilestoneType = computed(() => TAB_TO_MILESTONE_TYPE_MAPPING[this.selectedTab()]);

	public paths = PATHS;
	private _base64CV: string | null = null;
	public isUploadCvVisible = false;
	public isUploadCvLoading = false;
	public isAddMilestoneLoading = false;
	public isAddMilestoneVisible = false;
	public isAdmin = computed(() => !!this._authService.user());
	public isMobile = computed(() => this._stateService.isMobile());
	public isDarkMode = computed(() => {
		const isDarkMode = this._stateService.isDarkMode();
		this._stateService.updateTheme(isDarkMode);

		return isDarkMode;
	});

	private _routeSub: Subscription;

	@HostListener("window:resize")
	public onResize() {
		this._updateIsMobile();
	}

	ngOnInit() {
		this._routeSub = this._router.events.subscribe({
			next: event => {
				if (event instanceof NavigationEnd || event instanceof NavigationStart)
					this.selectedTab.set(this._router.url.split("/").pop() as TabEnum);
			}
		});

		this._updateIsMobile();
	}

	ngOnDestroy() {
		this._routeSub?.unsubscribe();
	}

	public toggleDarkMode() {
		this._stateService.isDarkMode.set(!this.isDarkMode());
	}

	public signOut() {
		this._authService.signOut();
	}

	public onTabChange(tab: string | number) {
		this.selectedTab.set(tab as TabEnum);
	}

	public getRouteAnimationData(outlet: RouterOutlet) {
		return outlet?.activatedRouteData?.["animation"];
	}

	public onUploadCV() {
		this.isUploadCvVisible = true;
	}

	public onCloseUploadCV() {
		this.isUploadCvVisible = false;
	}

	public onHideUploadCV() {
		this._base64CV = null;
	}

	public onConfirmUploadCV() {
		if (this._base64CV) {
			this.isUploadCvLoading = true;

			this._aboutService
				.updateCV({ cvUrl: this._base64CV })
				.then(() => this.onCloseUploadCV())
				.finally(() => (this.isUploadCvLoading = false));
		}
	}

	public async onChooseCV(event: FileUploadEvent) {
		const file = event.files[0];

		if (!file) return;

		this._base64CV = await convertFileToBase64(file);
	}

	public onAddNewMilestone() {
		this.isAddMilestoneVisible = true;
	}

	private _updateIsMobile() {
		const width = window.innerWidth;
		const isMobile = isMobileDevice(width);

		this._stateService.isMobile.set(isMobile);
	}
}
