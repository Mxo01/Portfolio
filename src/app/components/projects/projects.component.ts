import { NgClass, NgStyle } from "@angular/common";
import { Component, Signal, computed } from "@angular/core";
import { Theme } from "../../models/theme.model";
import { ThemeService } from "../../services/theme.service";
import { Project } from "../../models/project.model";
import { ProjectGalleryModalComponent } from "../project-gallery-modal/project-gallery-modal.component";
import { SharedService } from "../../services/shared.service";

@Component({
	selector: "app-projects",
	standalone: true,
	imports: [NgClass, NgStyle, ProjectGalleryModalComponent],
	templateUrl: "./projects.component.html",
	styleUrls: ["./projects.component.css", "../../../styles.css"],
})
export class ProjectsComponent {
	theme: Signal<Theme> = computed(() => this.themeService.theme());

	constructor(
		private themeService: ThemeService,
		private sharedService: SharedService
	) {}

	openModal(project: Project): void {
		this.sharedService.setProject(project);
	}
}
