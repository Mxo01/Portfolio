import { Component, inject, OnInit } from "@angular/core";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { ProjectsService } from "../../shared/services/http/projects.service";
import { Observable, of } from "rxjs";
import { Milestone } from "../../shared/models/milestone.model";
import { AsyncPipe } from "@angular/common";

@Component({
	selector: "portfolio-projects",
	standalone: true,
	imports: [EmptyListComponent, MilestoneComponent, AsyncPipe],
	templateUrl: "./projects.component.html",
	styleUrl: "./projects.component.scss"
})
export class ProjectsComponent implements OnInit {
	private _projectsService = inject(ProjectsService);

	public projects$: Observable<Milestone[]> = of([]);

	ngOnInit() {
		this.projects$ = this._projectsService.getProjects();
	}
}
