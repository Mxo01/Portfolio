import { Component } from "@angular/core";
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
	public project: Project = "GymBro";

	constructor(private sharedService: SharedService) {}

	public ngOnInit(): void {
		this.sharedService.projectObs.subscribe({
			next: (project: Project) => {
				this.project = project;
			}
		});
	}
}
