import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { ProjectsService } from "../../shared/services/http/projects.service";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-projects",
	imports: [EmptyListComponent, MilestoneComponent],
	templateUrl: "./projects.component.html",
	styleUrl: "./projects.component.scss"
})
export class ProjectsComponent {
	private _projectsService = inject(ProjectsService);

	public projects = this._projectsService.getProjects();
}
