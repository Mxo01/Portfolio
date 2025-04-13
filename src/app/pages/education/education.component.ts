import { Component } from "@angular/core";
import { MilestoneComponent } from "../../components/milestone/milestone.component";
import { EDUCATION_MILESTONES } from "../../utils/constants";
import { EmptyListComponent } from "../../components/empty-list/empty-list.component";

@Component({
	selector: "portfolio-education",
	standalone: true,
	imports: [MilestoneComponent, EmptyListComponent],
	templateUrl: "./education.component.html",
	styleUrl: "./education.component.scss"
})
export class EducationComponent {
	public educationMilestones = EDUCATION_MILESTONES;
}
