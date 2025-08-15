import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ProjectsService } from "../../shared/services/http/projects.service";
import { TabContentComponent } from "../../shared/components/tab-content/tab-content.component";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-projects",
	imports: [TabContentComponent],
	templateUrl: "./projects.component.html",
	styleUrl: "./projects.component.scss"
})
export class ProjectsComponent {
	private _projectsService = inject(ProjectsService);

	public projects = this._projectsService.getProjects();
}
