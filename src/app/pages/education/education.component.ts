import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";
import { EducationService } from "../../shared/services/http/education.service";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-education",
	imports: [MilestoneComponent, EmptyListComponent],
	templateUrl: "./education.component.html",
	styleUrl: "./education.component.scss"
})
export class EducationComponent {
	private _educationService = inject(EducationService);

	public education = this._educationService.getEducation();
}
