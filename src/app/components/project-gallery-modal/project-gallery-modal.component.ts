import { Component, Signal, computed } from "@angular/core";
import { SharedService } from "../../services/shared.service";
import { Project } from "../../models/project.model";

@Component({
	selector: "app-project-gallery-modal",
	standalone: true,
	imports: [],
	templateUrl: "./project-gallery-modal.component.html",
	styleUrl: "./project-gallery-modal.component.css",
})
export class ProjectGalleryModalComponent {
	project: Signal<Project> = computed(() => this.sharedService.project());

	constructor(private sharedService: SharedService) {}
}
