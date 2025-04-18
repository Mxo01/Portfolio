import { Component } from "@angular/core";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { EXPERIENCE_MILESTONES } from "../../shared/utils/constants";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";

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
