import { Component } from "@angular/core";
import { MilestoneComponent } from "../../components/milestone/milestone.component";
import { DIPLOMA_MILESTONE, UNIVERSITY_OF_PISA_MILESTONE } from "../../utils/constants";

@Component({
	selector: "portfolio-education",
	standalone: true,
	imports: [MilestoneComponent],
	templateUrl: "./education.component.html",
	styleUrl: "./education.component.scss"
})
export class EducationComponent {
	public universityOfPisaMilestone = UNIVERSITY_OF_PISA_MILESTONE;
	public diplomaMilestone = DIPLOMA_MILESTONE;
}
