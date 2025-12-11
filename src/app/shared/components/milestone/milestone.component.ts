import {
	ChangeDetectionStrategy,
	Component,
	computed,
	HostListener,
	inject,
	linkedSignal,
	model,
	OnInit,
	viewChild
} from "@angular/core";
import { Tag } from "primeng/tag";
import { GalleriaModule, GalleriaResponsiveOptions } from "primeng/galleria";
import { AvatarListComponent } from "../avatar-list/avatar-list.component";
import { Button } from "primeng/button";
import { Avatar } from "primeng/avatar";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import {
	calculateExperience,
	deepClone,
	isMobileDevice,
	mapMilestoneMediaToGalleriaImages
} from "../../utils/utils";
import { AuthService } from "../../services/auth/auth.service";
import { ConfirmationService, MessageService } from "primeng/api";
import { MilestoneService } from "../../services/milestone/milestone.service";
import { Dialog } from "primeng/dialog";
import { Drawer } from "primeng/drawer";
import { StateService } from "../../services/state/state.service";
import { MilestoneFormComponent } from "./milestone-form/milestone-form.component";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-milestone",
	imports: [
		Tag,
		Avatar,
		Button,
		GalleriaModule,
		AvatarListComponent,
		Dialog,
		Drawer,
		MilestoneFormComponent
	],
	templateUrl: "./milestone.component.html",
	styleUrl: "./milestone.component.scss"
})
export class MilestoneComponent implements OnInit {
	private readonly _authService = inject(AuthService);
	private readonly _stateService = inject(StateService);
	private readonly _milestoneService = inject(MilestoneService);
	private readonly _confirmationService = inject(ConfirmationService);
	private readonly _messageService = inject(MessageService);

	public milestoneForm = viewChild<MilestoneFormComponent>("milestoneForm");

	public milestone = model.required<Milestone>();

	protected readonly MilestoneEnum = MilestoneEnum;

	public editableMilestone = linkedSignal(() => deepClone(this.milestone()));
	public isSaveEditsLoading = false;
	public isEditMilestoneVisible = false;
	public isMobile = computed(() => this._stateService.isMobile());
	public isAdmin = computed(() => !!this._authService.user());
	public experienceDuration = computed(() => calculateExperience([this.milestone().period]));
	public galleriaImages = computed(() =>
		mapMilestoneMediaToGalleriaImages(this.milestone().media)
	);
	public isGalleriaVisible = false;
	public responsiveOptions: GalleriaResponsiveOptions[] = [
		{ breakpoint: "1024px", numVisible: 5 },
		{ breakpoint: "768px", numVisible: 3 },
		{ breakpoint: "560px", numVisible: 1 }
	];

	@HostListener("window:resize")
	public onResize() {
		this._updateIsMobile();
	}

	ngOnInit() {
		this._updateIsMobile();
	}

	public onEditMilestone() {
		this.isEditMilestoneVisible = true;
	}

	public onMilestoneFormVisibilityChange(isVisible: boolean) {
		if (!isVisible) this.editableMilestone.set(this.milestone());
	}

	public onDeleteMilestone(event: Event) {
		this._confirmationService.confirm({
			target: event.currentTarget as EventTarget,
			message: "Do you want to delete this milestone?",
			icon: "pi pi-info-circle",
			rejectButtonProps: {
				label: "Cancel",
				severity: "secondary",
				outlined: true
			},
			acceptButtonProps: {
				label: "Delete",
				severity: "danger"
			},
			accept: () => {
				if (!this.milestone().id) return;

				this._milestoneService
					.deleteMilestone(this.milestone().id!)
					.then(() =>
						this._messageService.add({
							severity: "success",
							summary: "Success",
							detail: "Milestone deleted",
							life: 3000
						})
					)
					.catch(() =>
						this._messageService.add({
							severity: "error",
							summary: "Error",
							detail: "Failed to delete the milestone",
							life: 3000
						})
					);
			}
		});
	}

	private _updateIsMobile() {
		const width = window.innerWidth;
		const isMobile = isMobileDevice(width);

		this._stateService.isMobile.set(isMobile);
	}
}
