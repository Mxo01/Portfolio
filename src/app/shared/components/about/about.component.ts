import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	linkedSignal
} from "@angular/core";
import { Avatar } from "primeng/avatar";
import { AvatarListComponent } from "../avatar-list/avatar-list.component";
import { KpiComponent } from "../kpi/kpi.component";
import { Button } from "primeng/button";
import { AboutService } from "../../services/about.service";
import { MessageService } from "primeng/api";
import { AboutInfo } from "../../models/about.model";
import { Drawer } from "primeng/drawer";
import { Dialog } from "primeng/dialog";
import { FormsModule } from "@angular/forms";
import { Picture } from "../../models/picture.model";
import { ReorderableLogosComponent } from "../reorderable-logos/reorderable-logos.component";
import { Skeleton } from "primeng/skeleton";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-about",
	imports: [
		Avatar,
		AvatarListComponent,
		KpiComponent,
		Button,
		Drawer,
		Dialog,
		FormsModule,
		ReorderableLogosComponent,
		Skeleton
	],
	templateUrl: "./about.component.html",
	styleUrls: ["./about.component.scss", "../../../../styles.scss"]
})
export class AboutComponent {
	private _aboutService = inject(AboutService);
	private _messageService = inject(MessageService);

	public isAdmin = input.required<boolean>();
	public isMobile = input.required<boolean>();

	public aboutInfo = this._aboutService.getAboutInfo();
	public kpis = linkedSignal(() => this.aboutInfo()?.kpis || []);
	public techStack = linkedSignal(() => this.aboutInfo()?.techStack || []);
	public companies = linkedSignal(() => this.aboutInfo()?.companies || []);
	public isAboutInfoLoading = computed(() => !this.aboutInfo());
	public isMailDrawerVisible = false;
	public isEditTechStackVisible = false;
	public isSaveTechStackEditsLoading = false;

	public viewCV() {
		window.open("CV_Mario_Di_Modica.pdf", "_blank");
	}

	public sendEmail() {
		this.isMailDrawerVisible = false;
		window.location.href = "mailto:mariodimodica.01@gmail.com";
	}

	public copyEmail() {
		this.isMailDrawerVisible = false;

		navigator.clipboard
			.writeText("mariodimodica.01@gmail.com")
			.then(() =>
				this._messageService.add({
					severity: "success",
					summary: "Success",
					detail: "Email copied to clipboard"
				})
			)
			.catch(() =>
				this._messageService.add({
					severity: "error",
					summary: "Error",
					detail: "Failed to copy email"
				})
			);
	}

	public onTechStackEdit() {
		this.isEditTechStackVisible = true;
	}

	public addTech() {
		this.techStack.set([...this.techStack(), { name: "", url: "" }]);
	}

	public onTechStackListUpdate(updatedTechStack: Picture[]) {
		this.techStack.set(updatedTechStack);
	}

	public closeEditTechStack() {
		this.isEditTechStackVisible = false;
	}

	public saveTechStackEdits() {
		this.isSaveTechStackEditsLoading = true;

		const aboutInfo: Omit<AboutInfo, "companies" | "profilePicUrl"> = {
			kpis: this.kpis().filter(kpi => kpi.label !== "Experience"),
			techStack: this.techStack()
		};

		this._aboutService
			.saveTechStack(aboutInfo)
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
}
