import { TabEnum } from "./../../shared/models/tab.model";
import { Milestone, MilestoneEnum } from "./../../shared/models/milestone.model";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	HostListener,
	inject,
	linkedSignal,
	OnDestroy,
	OnInit
} from "@angular/core";
import { RouterOutlet, RouterLink, Router, NavigationEnd, NavigationStart } from "@angular/router";
import { MessageService, SelectItem } from "primeng/api";
import { Avatar } from "primeng/avatar";
import { ButtonModule } from "primeng/button";
import { DrawerModule } from "primeng/drawer";
import { TabsModule } from "primeng/tabs";
import { Subscription } from "rxjs";
import { AvatarListComponent } from "../../shared/components/avatar-list/avatar-list.component";
import { KpiComponent } from "../../shared/components/kpi/kpi.component";
import { AboutService } from "../../shared/services/about.service";
import { StateService } from "../../shared/services/state.service";
import { PATHS, TAB_TO_MILESTONE_TYPE_MAPPING } from "../../shared/utils/constants";
import { convertFileToBase64, isMobileDevice } from "../../shared/utils/utils";
import { slideInAnimation } from "../../shared/animations/fade-slide.animation";
import { AuthService } from "../../shared/services/auth.service";
import { NgTemplateOutlet } from "@angular/common";
import { Dialog } from "primeng/dialog";
import {
	FormControl,
	FormGroup,
	FormsModule,
	ReactiveFormsModule,
	Validators
} from "@angular/forms";
import { AutoCompleteModule } from "primeng/autocomplete";
import { FloatLabel } from "primeng/floatlabel";
import { InputTextModule } from "primeng/inputtext";
import { Picture } from "../../shared/models/picture.model";
import { MilestoneUpdate } from "../../shared/models/milestone-update.model";
import { Select } from "primeng/select";
import { MilestoneService } from "../../shared/services/milestone.service";
import { Tooltip } from "primeng/tooltip";
import { FileUpload, FileUploadEvent } from "primeng/fileupload";
import { AboutInfo } from "../../shared/models/about.model";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-home",
	imports: [
		RouterOutlet,
		RouterLink,
		DrawerModule,
		Avatar,
		ButtonModule,
		TabsModule,
		KpiComponent,
		AvatarListComponent,
		Avatar,
		NgTemplateOutlet,
		Dialog,
		ReactiveFormsModule,
		FormsModule,
		InputTextModule,
		AutoCompleteModule,
		FloatLabel,
		Select,
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
	private _aboutService = inject(AboutService);
	private _authService = inject(AuthService);
	private _milestoneService = inject(MilestoneService);
	private _messageService = inject(MessageService);

	private _router = inject(Router);

	protected readonly MilestoneEnum = MilestoneEnum;
	protected readonly TabEnum = TabEnum;

	public selectedTab: TabEnum = (this._router.url.split("/").pop() as TabEnum) || TabEnum;

	public milestoneForm = new FormGroup({
		type: new FormControl<MilestoneEnum>(TAB_TO_MILESTONE_TYPE_MAPPING[this.selectedTab], [
			Validators.required
		]),
		logo: new FormControl<Picture | null>(null),
		title: new FormControl<string>("", [Validators.required, Validators.maxLength(100)]),
		location: new FormControl<string>(""),
		description: new FormControl<string>("", [Validators.required, Validators.maxLength(1000)]),
		tags: new FormControl<string[]>([]),
		period: new FormControl<string>(""),
		milestoneDate: new FormControl<string>("", [Validators.required]),
		media: new FormControl<Picture[]>([]),
		contributors: new FormControl<Picture[]>([])
	});

	public milestoneTypes: SelectItem<MilestoneEnum>[] = Object.values(MilestoneEnum).map(
		enumValue => ({
			label: enumValue,
			value: enumValue
		})
	);
	public milestoneUpdates: MilestoneUpdate[] = [];
	public paths = PATHS;
	public aboutInfo = this._aboutService.getAboutInfo();
	public kpis = linkedSignal(() => this.aboutInfo().kpis);
	public techStack = linkedSignal(() => this.aboutInfo().techStack);
	public companies = linkedSignal(() => this.aboutInfo().companies);
	public isMailDrawerVisible = false;
	public isAddMilestoneLoading = false;
	public isAddMilestoneVisible = false;
	public isEditTechStackVisible = false;
	public isSaveTechStackEditsLoading = false;
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
					this.selectedTab = (this._router.url.split("/").pop() as TabEnum) || TabEnum;
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

	public addMilestone() {
		this.isAddMilestoneVisible = true;
	}

	public createMilestone() {
		const {
			type,
			logo,
			title,
			location,
			description,
			tags,
			period,
			milestoneDate,
			media,
			contributors
		} = this.milestoneForm.value;

		if (
			this.milestoneForm.invalid ||
			!type ||
			!title ||
			!description ||
			!period ||
			!milestoneDate ||
			!tags
		)
			return;

		this.isAddMilestoneLoading = true;

		const milestone: Milestone = {
			type,
			...(type === MilestoneEnum.EXPERIENCE && logo && { logo }),
			title,
			...(type !== MilestoneEnum.PROJECT && location && { location }),
			description,
			tags: tags,
			period: period,
			...(type === MilestoneEnum.EXPERIENCE && { updates: this.milestoneUpdates }),
			milestoneDate,
			...(type === MilestoneEnum.PROJECT && media && { media }),
			...(type === MilestoneEnum.PROJECT && contributors && { contributors })
		};

		this._milestoneService
			.createMilestone(milestone)
			.then(() => {
				this._messageService.add({
					severity: "success",
					summary: "Success",
					detail: "Milestone added",
					life: 3000
				});

				this.closeAddMilestone();
			})
			.catch(() =>
				this._messageService.add({
					severity: "error",
					summary: "Error",
					detail: "Failed to add the milestone",
					life: 3000
				})
			)
			.finally(() => (this.isAddMilestoneLoading = false));
	}

	public closeAddMilestone() {
		this.isAddMilestoneVisible = false;
	}

	public async onMilestoneLogoUpload(event: FileUploadEvent) {
		const file: File = event.files[0];
		const formValue = this.milestoneForm.value;
		const { title } = formValue;

		if (!file || !title) return;

		const base64 = await convertFileToBase64(file);

		this.milestoneForm.patchValue({
			logo: {
				name: title,
				url: base64
			}
		});
	}

	public onAddMilestoneHide() {
		this.milestoneUpdates = [];
		this.milestoneForm.reset();
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
		this.selectedTab = tab as TabEnum;
		this.milestoneForm.patchValue({
			type: TAB_TO_MILESTONE_TYPE_MAPPING[this.selectedTab]
		});
	}

	public getRouteAnimationData(outlet: RouterOutlet) {
		return outlet?.activatedRouteData?.["animation"];
	}

	public addMilestoneUpdate() {
		this.milestoneUpdates = [
			{
				title: "",
				duration: ""
			},
			...this.milestoneUpdates
		];
	}

	public removeMilestoneUpdate(index: number) {
		this.milestoneUpdates?.splice(index, 1);
	}

	public moveMilestoneUpdateUp(index: number, isFirst: boolean) {
		if (isFirst) return;

		const temp = this.milestoneUpdates[index - 1];
		this.milestoneUpdates[index - 1] = this.milestoneUpdates[index];
		this.milestoneUpdates[index] = temp;
	}

	public moveMilestoneUpdateDown(index: number, isLast: boolean) {
		if (isLast) return;

		const temp = this.milestoneUpdates[index + 1];
		this.milestoneUpdates[index + 1] = this.milestoneUpdates[index];
		this.milestoneUpdates[index] = temp;
	}

	public moveTechUp(index: number, isFirst: boolean) {
		if (isFirst) return;

		const temp = this.techStack()[index - 1];
		this.techStack()[index - 1] = this.techStack()[index];
		this.techStack()[index] = temp;
	}

	public moveTechDown(index: number, isLast: boolean) {
		if (isLast) return;

		const temp = this.techStack()[index + 1];
		this.techStack()[index + 1] = this.techStack()[index];
		this.techStack()[index] = temp;
	}

	public async onTechUpload(event: FileUploadEvent, index: number) {
		const file: File = event.files[0];

		if (!file) return;

		const base64 = await convertFileToBase64(file);

		this.techStack.set(
			this.techStack().map((tech, techIndex) => {
				if (techIndex === index)
					return {
						...tech,
						url: base64
					};

				return tech;
			})
		);
	}

	public addTech() {
		this.techStack.set([...this.techStack(), { name: "", url: "" }]);
	}

	public removeTech(index: number) {
		this.techStack.set(this.techStack().filter((_, techIndex) => index !== techIndex));
	}

	public onTechStackEdit() {
		this.isEditTechStackVisible = true;
	}

	public closeEditTechStack() {
		this.isEditTechStackVisible = false;
	}

	public saveTechStackEdits() {
		this.isSaveTechStackEditsLoading = true;

		const aboutInfo: Omit<AboutInfo, "companies"> = {
			kpis: this.kpis().filter(kpi => kpi.label !== "Experience"),
			techStack: this.techStack()
		};

		this._aboutService
			.saveAboutInfo(aboutInfo)
			.then(() => {
				this._messageService.add({
					severity: "success",
					summary: "Success",
					detail: "Tech Stack edited",
					life: 3000
				});

				this.closeEditTechStack();
			})
			.catch(() =>
				this._messageService.add({
					severity: "error",
					summary: "Error",
					detail: "Failed to edit the Tech Stack",
					life: 3000
				})
			)
			.finally(() => (this.isSaveTechStackEditsLoading = false));
	}

	public moveContributorUp(index: number, isFirst: boolean) {
		if (isFirst) return;

		const contributors = this.milestoneForm.value.contributors || [];
		const temp = contributors[index - 1];
		contributors[index - 1] = contributors[index];
		contributors[index] = temp;

		this.milestoneForm.patchValue({
			contributors
		});
	}

	public moveContributorDown(index: number, isLast: boolean) {
		if (isLast) return;

		const contributors = this.milestoneForm.value.contributors || [];
		const temp = contributors[index + 1];
		contributors[index + 1] = contributors[index];
		contributors[index] = temp;

		this.milestoneForm.patchValue({
			contributors
		});
	}

	public addContributor() {
		this.milestoneForm.patchValue({
			contributors: [...(this.milestoneForm.value.contributors || []), { name: "", url: "" }]
		});
	}

	public removeContributor(index: number) {
		this.milestoneForm.patchValue({
			contributors: (this.milestoneForm.value.contributors || []).filter(
				(_, contributorIndex) => contributorIndex !== index
			)
		});
	}

	public async onContributorUpload(event: FileUploadEvent, index: number) {
		const file: File = event.files[0];

		if (!file) return;

		const base64 = await convertFileToBase64(file);

		this.milestoneForm.patchValue({
			contributors: (this.milestoneForm.value.contributors || []).map(
				(contributor, contributorIndex) => {
					if (contributorIndex === index)
						return {
							...contributor,
							url: base64
						};

					return contributor;
				}
			)
		});
	}

	public moveMediaUp(index: number, isFirst: boolean) {
		if (isFirst) return;

		const media = this.milestoneForm.value.media || [];
		const temp = media[index - 1];
		media[index - 1] = media[index];
		media[index] = temp;

		this.milestoneForm.patchValue({
			media
		});
	}

	public moveMediaDown(index: number, isLast: boolean) {
		if (isLast) return;

		const media = this.milestoneForm.value.media || [];
		const temp = media[index + 1];
		media[index + 1] = media[index];
		media[index] = temp;

		this.milestoneForm.patchValue({
			media
		});
	}

	public addMedia() {
		this.milestoneForm.patchValue({
			media: [...(this.milestoneForm.value.media || []), { name: "", url: "" }]
		});
	}

	public removeMedia(index: number) {
		this.milestoneForm.patchValue({
			media: (this.milestoneForm.value.media || []).filter(
				(_, contributorIndex) => contributorIndex !== index
			)
		});
	}

	public async onMediaUpload(event: FileUploadEvent, index: number) {
		const file: File = event.files[0];

		if (!file) return;

		const base64 = await convertFileToBase64(file);

		this.milestoneForm.patchValue({
			media: (this.milestoneForm.value.media || []).map((media, mediaIndex) => {
				if (mediaIndex === index)
					return {
						...media,
						url: base64
					};

				return media;
			})
		});
	}

	private _updateIsMobile() {
		const width = window.innerWidth;
		const isMobile = isMobileDevice(width);

		this._stateService.isMobile.set(isMobile);
	}
}
