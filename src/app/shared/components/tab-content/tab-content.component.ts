import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { MilestoneComponent } from "../milestone/milestone.component";
import { EmptyListComponent } from "../empty-list/empty-list.component";
import { Milestone } from "../../models/milestone.model";
import { Skeleton } from "primeng/skeleton";
import { StateService } from "../../services/state/state.service";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-tab-content",
	imports: [MilestoneComponent, EmptyListComponent, Skeleton],
	templateUrl: "./tab-content.component.html",
	styleUrl: "./tab-content.component.scss"
})
export class TabContentComponent {
	private readonly _stateService = inject(StateService);

	public milestones = input.required<Milestone[]>();
	public emptyTitle = input.required<string>();
	public emptyDescription = input.required<string>();
	public isLoading = input.required<boolean>();

	public tabAnimationDirection = computed(() => this._stateService.tabAnimationDirection());
}
