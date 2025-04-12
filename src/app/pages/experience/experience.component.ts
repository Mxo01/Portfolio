import { Component } from "@angular/core";
import { MilestoneComponent } from "../../components/milestone/milestone.component";
import { EXPERIENCE_MILESTONES } from "../../utils/constants";

@Component({
	selector: "portfolio-experience",
	standalone: true,
	imports: [MilestoneComponent],
	templateUrl: "./experience.component.html",
	styleUrl: "./experience.component.scss"
})
export class ExperienceComponent {
	public experienceMilestones = EXPERIENCE_MILESTONES;
}
