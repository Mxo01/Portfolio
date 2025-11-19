import { Component, input } from "@angular/core";
import { MilestoneComponent } from "../milestone/milestone.component";
import { EmptyListComponent } from "../empty-list/empty-list.component";
import { Milestone } from "../../models/milestone.model";
import { Skeleton } from "primeng/skeleton";

@Component({
	selector: "portfolio-tab-content",
	imports: [MilestoneComponent, EmptyListComponent, Skeleton],
	templateUrl: "./tab-content.component.html",
	styleUrl: "./tab-content.component.scss"
})
export class TabContentComponent {
	public milestones = input.required<Milestone[]>();
	public emptyTitle = input.required<string>();
	public emptyDescription = input.required<string>();
	public isLoading = input.required<boolean>()
}
