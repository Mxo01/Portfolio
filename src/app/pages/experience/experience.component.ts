import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";
import { ExperienceService } from "../../shared/services/http/experience.service";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-experience",
	imports: [MilestoneComponent, EmptyListComponent],
	templateUrl: "./experience.component.html",
	styleUrl: "./experience.component.scss"
})
export class ExperienceComponent {
	private _experienceService = inject(ExperienceService);

	public experiences = this._experienceService.getExperience();
}
