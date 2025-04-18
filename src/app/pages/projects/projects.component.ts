import { Component } from "@angular/core";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";
import { PROJECTS_MILESTONES } from "../../shared/utils/constants";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";

@Component({
	selector: "portfolio-projects",
	standalone: true,
	imports: [EmptyListComponent, MilestoneComponent],
	templateUrl: "./projects.component.html",
	styleUrl: "./projects.component.scss"
})
export class ProjectsComponent {
	public projectsMilestones = PROJECTS_MILESTONES;
}
