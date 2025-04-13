import { Component } from "@angular/core";
import { EmptyListComponent } from "../../components/empty-list/empty-list.component";
import { PROJECTS_MILESTONES } from "../../utils/constants";
import { MilestoneComponent } from "../../components/milestone/milestone.component";

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
