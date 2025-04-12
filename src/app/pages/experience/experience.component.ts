import { Component } from "@angular/core";
import { MilestoneComponent } from "../../components/milestone/milestone.component";
import { NTT_DATA_MILESTONE, SONATRACH_MILESTONE } from "../../utils/constants";

@Component({
	selector: "portfolio-experience",
	standalone: true,
	imports: [MilestoneComponent],
	templateUrl: "./experience.component.html",
	styleUrl: "./experience.component.scss"
})
export class ExperienceComponent {
	public nttDataMilestone = NTT_DATA_MILESTONE;
	public sonatrachMilestone = SONATRACH_MILESTONE;
}
