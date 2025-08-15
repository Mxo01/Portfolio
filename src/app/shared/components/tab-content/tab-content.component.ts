import { Component, input } from "@angular/core";
import { MilestoneComponent } from "../milestone/milestone.component";
import { EmptyListComponent } from "../empty-list/empty-list.component";
import { Milestone } from "../../models/milestone.model";

@Component({
	selector: "portfolio-tab-content",
	imports: [MilestoneComponent, EmptyListComponent],
	templateUrl: "./tab-content.component.html",
	styleUrl: "./tab-content.component.scss"
})
export class TabContentComponent {
	public milestones = input<Milestone[]>();
	public emptyTitle = input<string>("");
	public emptyDescription = input<string>("");
}
