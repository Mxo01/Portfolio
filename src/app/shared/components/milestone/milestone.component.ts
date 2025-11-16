import { Component, computed, HostListener, inject, model, OnInit } from "@angular/core";
import { TagModule } from "primeng/tag";
import { NgTemplateOutlet } from "@angular/common";
import { GalleriaModule, GalleriaResponsiveOptions } from "primeng/galleria";
import { AvatarListComponent } from "../avatar-list/avatar-list.component";
import { ImageModule } from "primeng/image";
import { ButtonModule } from "primeng/button";
import { Avatar } from "primeng/avatar";
import { Milestone, MilestoneEnum } from "../../models/milestone.model";
import {
	calculateExperience,
	convertFileToBase64,
	isMobileDevice,
	mapMilestoneMediaToGalleriaImages
} from "../../utils/utils";
import { AuthService } from "../../services/auth.service";
import { ConfirmationService, MessageService } from "primeng/api";
import { MilestoneService } from "../../services/milestone.service";
import {
	FormControl,
	FormGroup,
	FormsModule,
	ReactiveFormsModule,
	Validators
} from "@angular/forms";
import { Picture } from "../../models/picture.model";
import { Dialog } from "primeng/dialog";
import { Drawer } from "primeng/drawer";
import { StateService } from "../../services/state.service";
import { InputTextModule } from "primeng/inputtext";
import { FloatLabel } from "primeng/floatlabel";
import { AutoCompleteModule } from "primeng/autocomplete";
import { FileUpload, FileUploadEvent } from "primeng/fileupload";
import { Tooltip } from "primeng/tooltip";

@Component({
	selector: "portfolio-milestone",
	imports: [
		InputTextModule,
		AutoCompleteModule,
		FloatLabel,
		TagModule,
		Avatar,
		ButtonModule,
		ImageModule,
		GalleriaModule,
		AvatarListComponent,
		ReactiveFormsModule,
		FormsModule,
		Dialog,
		Drawer,
		NgTemplateOutlet,
		Tooltip,
		FileUpload
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

	public milestone = model.required<Milestone>();

	protected readonly MilestoneEnum = MilestoneEnum;

	public milestoneForm = new FormGroup({
		type: new FormControl<MilestoneEnum>(MilestoneEnum.EXPERIENCE, [Validators.required]),
		logo: new FormControl<Picture | null>(null),
		title: new FormControl<string>("", [Validators.required, Validators.maxLength(100)]),
		location: new FormControl<string>(""),
		description: new FormControl<string>("", [Validators.required, Validators.maxLength(1000)]),
		tags: new FormControl<string[]>([]),
		period: new FormControl<string>(""),
		milestoneDate: new FormControl<string>("", [Validators.required])
	});

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
		this.milestoneForm.setValue({
			type: this.milestone().type,
			logo: this.milestone().logo || null,
			title: this.milestone().title,
			location: this.milestone().location || "",
			description: this.milestone().description,
			tags: this.milestone().tags,
			period: this.milestone().period,
			milestoneDate: this.milestone().milestoneDate
		});

		this.isEditMilestoneVisible = true;
	}

	public saveMilestoneEdits() {
		const { type, logo, title, location, description, tags, period, milestoneDate } =
			this.milestoneForm.value;

		if (
			this.milestoneForm.invalid ||
			!this.milestone().id ||
			!type ||
			!title ||
			!description ||
			!period ||
			!milestoneDate ||
			!tags
		)
			return;

		this.isSaveEditsLoading = true;

		const updatedMilestone: Milestone = {
			type,
			...(type === MilestoneEnum.EXPERIENCE && logo && { logo }),
			title,
			...(type !== MilestoneEnum.PROJECT && location && { location }),
			description,
			tags: tags,
			period: period,
			...(type === MilestoneEnum.EXPERIENCE && { updates: this.milestone().updates || [] }),
			milestoneDate,
			...(type === MilestoneEnum.PROJECT && { media: this.milestone().media || [] }),
			...(type === MilestoneEnum.PROJECT && {
				contributors: this.milestone().contributors || []
			})
		};

		this._milestoneService
			.updateMilestone(this.milestone().id!, updatedMilestone)
			.then(() => {
				this._messageService.add({
					severity: "success",
					summary: "Success",
					detail: "Milestone updated",
					life: 3000
				});

				this.closeEdits();
			})
			.catch(() =>
				this._messageService.add({
					severity: "error",
					summary: "Error",
					detail: "Failed to update the milestone",
					life: 3000
				})
			)
			.finally(() => (this.isSaveEditsLoading = false));
	}

	public closeEdits() {
		this.isEditMilestoneVisible = false;
	}

	public onEditsHide() {
		this.milestoneForm.reset();
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

	public addMilestoneUpdate() {
		this.milestone.set({
			...this.milestone(),
			updates: [
				{
					title: "",
					duration: ""
				},
				...(this.milestone().updates || [])
			]
		});
	}

	public removeMilestoneUpdate(index: number) {
		this.milestone().updates?.splice(index, 1);
	}

	public moveMilestoneUpdateUp(index: number, isFirst: boolean) {
		if (isFirst) return;

		const updates = this.milestone().updates || [];
		const temp = updates[index - 1];
		updates[index - 1] = updates[index];
		updates[index] = temp;

		this.milestone.set({
			...this.milestone(),
			updates
		});
	}

	public moveMilestoneUpdateDown(index: number, isLast: boolean) {
		if (isLast) return;

		const updates = this.milestone().updates || [];
		const temp = updates[index + 1];
		updates[index + 1] = updates[index];
		updates[index] = temp;

		this.milestone.set({
			...this.milestone(),
			updates
		});
	}

	public moveContributorUp(index: number, isFirst: boolean) {
		if (isFirst) return;

		const contributors = this.milestone().contributors || [];
		const temp = contributors[index - 1];
		contributors[index - 1] = contributors[index];
		contributors[index] = temp;

		this.milestone.set({
			...this.milestone(),
			contributors
		});
	}

	public moveContributorDown(index: number, isLast: boolean) {
		if (isLast) return;

		const contributors = this.milestone().contributors || [];
		const temp = contributors[index + 1];
		contributors[index + 1] = contributors[index];
		contributors[index] = temp;

		this.milestone.set({
			...this.milestone(),
			contributors
		});
	}

	public addContributor() {
		this.milestone.set({
			...this.milestone(),
			contributors: [...(this.milestone().contributors || []), { name: "", url: "" }]
		});
	}

	public removeContributor(index: number) {
		this.milestone.set({
			...this.milestone(),
			contributors: (this.milestone().contributors || []).filter(
				(_, contributorIndex) => contributorIndex !== index
			)
		});
	}

	public async onContributorUpload(event: FileUploadEvent, index: number) {
		const file: File = event.files[0];

		if (!file) return;

		const base64 = await convertFileToBase64(file);

		this.milestone.set({
			...this.milestone(),
			contributors: (this.milestone().contributors || []).map(
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

		const media = this.milestone().media || [];
		const temp = media[index - 1];
		media[index - 1] = media[index];
		media[index] = temp;

		this.milestone.set({
			...this.milestone(),
			media
		});
	}

	public moveMediaDown(index: number, isLast: boolean) {
		if (isLast) return;

		const media = this.milestone().media || [];
		const temp = media[index + 1];
		media[index + 1] = media[index];
		media[index] = temp;

		this.milestone.set({
			...this.milestone(),
			media
		});
	}

	public addMedia() {
		this.milestone.set({
			...this.milestone(),
			media: [...(this.milestone().media || []), { name: "", url: "" }]
		});
	}

	public removeMedia(index: number) {
		this.milestone.set({
			...this.milestone(),
			media: (this.milestone().media || []).filter(
				(_, contributorIndex) => contributorIndex !== index
			)
		});
	}

	public async onMediaUpload(event: FileUploadEvent, index: number) {
		const file: File = event.files[0];

		if (!file) return;

		const base64 = await convertFileToBase64(file);

		this.milestone.set({
			...this.milestone(),
			media: (this.milestone().media || []).map((media, mediaIndex) => {
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
