import { Component } from "@angular/core";
import { MilestoneComponent } from "../../components/milestone/milestone.component";
import { EDUCATION_MILESTONES } from "../../utils/constants";

@Component({
	selector: "portfolio-education",
	standalone: true,
	imports: [MilestoneComponent],
	templateUrl: "./education.component.html",
	styleUrl: "./education.component.scss"
})
export class EducationComponent {
	public educationMilestones = EDUCATION_MILESTONES;
}
