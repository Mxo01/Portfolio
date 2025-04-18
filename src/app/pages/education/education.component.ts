import { Component } from "@angular/core";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { EDUCATION_MILESTONES } from "../../shared/utils/constants";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";

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
