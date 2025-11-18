import { MilestoneUpdate } from "./../../../models/milestone-update.model";
import { Component, computed, inject, input, model, effect, linkedSignal } from "@angular/core";
import {
	ReactiveFormsModule,
	FormsModule,
	FormControl,
	FormGroup,
	Validators
} from "@angular/forms";
import { AutoCompleteModule } from "primeng/autocomplete";
import { Avatar } from "primeng/avatar";
import { ButtonModule } from "primeng/button";
import { DrawerModule } from "primeng/drawer";
import { FileUpload, FileUploadEvent } from "primeng/fileupload";
import { FloatLabel } from "primeng/floatlabel";
import { InputTextModule } from "primeng/inputtext";
import { Select } from "primeng/select";
import { TabsModule } from "primeng/tabs";
import { Tooltip } from "primeng/tooltip";
import { ReorderableLogosComponent } from "../../reorderable-logos/reorderable-logos.component";
import { Milestone, MilestoneEnum } from "../../../models/milestone.model";
import { Picture } from "../../../models/picture.model";
import { MessageService, SelectItem } from "primeng/api";
import { MilestoneService } from "../../../services/milestone.service";
import { convertFileToBase64, moveItem } from "../../../utils/utils";

@Component({
	selector: "portfolio-milestone-form",
	imports: [
		DrawerModule,
		Avatar,
		ButtonModule,
		TabsModule,
		Avatar,
		ReorderableLogosComponent,
		ReactiveFormsModule,
		FormsModule,
		InputTextModule,
		AutoCompleteModule,
		FloatLabel,
		Select,
		Tooltip,
		FileUpload
	],
	templateUrl: "./milestone-form.component.html",
	styleUrl: "./milestone-form.component.scss"
})
export class MilestoneFormComponent {
	private _milestoneService = inject(MilestoneService);
	private _messageService = inject(MessageService);

	public currentMilestoneType = input<MilestoneEnum>(MilestoneEnum.EXPERIENCE);
	public milestoneToEdit = input<Milestone>();
	public isMobile = input.required<boolean>();
	public isSaveLoading = model.required<boolean>();
	public isVisible = model.required<boolean>();

	protected readonly MilestoneEnum = MilestoneEnum;

	public isNew = computed(() => !this.milestoneToEdit());

	public milestoneForm = new FormGroup({
		type: new FormControl<MilestoneEnum>(this.currentMilestoneType(), [Validators.required]),
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

	public milestoneUpdates = linkedSignal<MilestoneUpdate[]>(
		() => this.milestoneToEdit()?.updates || []
	);
	public milestoneTypes: SelectItem<MilestoneEnum>[] = Object.values(MilestoneEnum).map(
		enumValue => ({
			label: enumValue,
			value: enumValue
		})
	);

	constructor() {
		effect(() => {
			if (this.milestoneToEdit()) this.milestoneForm.patchValue(this.milestoneToEdit()!);
		});
	}

	public onHide() {
		if (this.isNew()) {
			this.milestoneForm.reset();
			this.milestoneForm.patchValue({ type: this.currentMilestoneType() });
		}
	}

	public cancel() {
		this.isVisible.set(false);
	}

	public save() {
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

		this.isSaveLoading.set(true);

		const milestone: Milestone = {
			type,
			...(type === MilestoneEnum.EXPERIENCE && logo && { logo }),
			title,
			...(type !== MilestoneEnum.PROJECT && location && { location }),
			description,
			tags: tags,
			period: period,
			...(type === MilestoneEnum.EXPERIENCE && { updates: this.milestoneUpdates() }),
			milestoneDate,
			...(type === MilestoneEnum.PROJECT && media && { media }),
			...(type === MilestoneEnum.PROJECT && contributors && { contributors })
		};

		if (this.isNew()) {
			this._milestoneService
				.createMilestone(milestone)
				.then(() => {
					this._messageService.add({
						severity: "success",
						summary: "Success",
						detail: "Milestone added",
						life: 3000
					});

					this.cancel();
				})
				.catch(() =>
					this._messageService.add({
						severity: "error",
						summary: "Error",
						detail: "Failed to add the milestone",
						life: 3000
					})
				)
				.finally(() => this.isSaveLoading.set(false));
		} else {
			if (this.milestoneToEdit()?.id)
				this._milestoneService
					.updateMilestone(this.milestoneToEdit()!.id!, milestone)
					.then(() => {
						this._messageService.add({
							severity: "success",
							summary: "Success",
							detail: "Milestone updated",
							life: 3000
						});

						this.cancel();
					})
					.catch(() =>
						this._messageService.add({
							severity: "error",
							summary: "Error",
							detail: "Failed to update the milestone",
							life: 3000
						})
					)
					.finally(() => this.isSaveLoading.set(false));
		}
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
		this.milestoneUpdates.set([
			{
				title: "",
				duration: ""
			},
			...this.milestoneUpdates()
		]);
	}

	public removeMilestoneUpdate(index: number) {
		this.milestoneUpdates.set(
			this.milestoneUpdates().filter(
				(_, milestoneUpdateIndex) => milestoneUpdateIndex !== index
			)
		);
	}

	public moveMilestoneUpdate(list: unknown[], startingIndex: number, direction: "up" | "down") {
		moveItem(list, startingIndex, direction);
	}

	public addMedia() {
		this.milestoneForm.patchValue({
			media: [...(this.milestoneForm.value.media || []), { name: "", url: "" }]
		});
	}

	public onNewMilestoneMediaUpdate(media: Picture[]) {
		this.milestoneForm.patchValue({ media });
	}

	public addContributor() {
		this.milestoneForm.patchValue({
			contributors: [...(this.milestoneForm.value.contributors || []), { name: "", url: "" }]
		});
	}

	public onNewMilestoneContributorsUpdate(contributors: Picture[]) {
		this.milestoneForm.patchValue({ contributors });
	}
}
