import { Component } from "@angular/core";
import { MilestoneComponent } from "../../components/milestone/milestone.component";
import { EXPERIENCE_MILESTONES } from "../../utils/constants";
import { EmptyListComponent } from "../../components/empty-list/empty-list.component";

@Component({
	selector: "portfolio-experience",
	standalone: true,
	imports: [MilestoneComponent, EmptyListComponent],
	templateUrl: "./experience.component.html",
	styleUrl: "./experience.component.scss"
})
export class ExperienceComponent {
	public experienceMilestones = EXPERIENCE_MILESTONES;
}
