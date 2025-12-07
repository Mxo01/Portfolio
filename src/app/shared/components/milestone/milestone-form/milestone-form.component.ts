import { MilestoneUpdate } from "./../../../models/milestone-update.model";
import {
	Component,
	computed,
	inject,
	input,
	model,
	effect,
	linkedSignal,
	ChangeDetectionStrategy,
	signal
} from "@angular/core";
import { form, maxLength, required, Field } from "@angular/forms/signals";
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
import { FormsModule } from "@angular/forms";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-milestone-form",
	imports: [
		DrawerModule,
		Avatar,
		ButtonModule,
		TabsModule,
		FormsModule,
		Avatar,
		ReorderableLogosComponent,
		InputTextModule,
		AutoCompleteModule,
		FloatLabel,
		Field,
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

	private _milestoneFormSchema = signal<Milestone>({
		type: this.currentMilestoneType(),
		logo: undefined,
		title: "",
		location: "",
		description: "",
		tags: [],
		period: "",
		milestoneDate: "",
		media: [],
		contributors: []
	});
	public milestoneForm = form(this._milestoneFormSchema, schemaPath => {
		required(schemaPath.type);

		required(schemaPath.title);
		maxLength(schemaPath.title, 100);

		required(schemaPath.description);
		maxLength(schemaPath.description, 1000);

		required(schemaPath.milestoneDate);
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
			if (this.milestoneToEdit()) this.milestoneForm().value.set(this.milestoneToEdit()!);
		});
	}

	public onHide() {
		if (this.isNew()) {
			this.milestoneForm().reset();
			this.milestoneForm().value.update(milestone => ({
				...milestone,
				type: this.currentMilestoneType()
			}));
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
		} = this.milestoneForm().value();

		if (
			this.milestoneForm().invalid() ||
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
		const formValue = this.milestoneForm().value();
		const { title } = formValue;

		if (!file || !title) return;

		const base64 = await convertFileToBase64(file);

		this.milestoneForm().value.update(milestone => ({
			...milestone,
			logo: {
				name: title,
				url: base64
			}
		}));
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
		this.milestoneForm().value.update(milestone => ({
			...milestone,
			media: [...(milestone.media || []), { name: "", url: "" }]
		}));
	}

	public onNewMilestoneMediaUpdate(media: Picture[]) {
		this.milestoneForm().value.update(milestone => ({
			...milestone,
			media
		}));
	}

	public addContributor() {
		this.milestoneForm().value.update(milestone => ({
			...milestone,
			contributors: [...(milestone.contributors || []), { name: "", url: "" }]
		}));
	}

	public onNewMilestoneContributorsUpdate(contributors: Picture[]) {
		this.milestoneForm().value.update(milestone => ({
			...milestone,
			contributors
		}));
	}
}
