import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { EducationService } from "../../shared/services/education.service";
import { TabContentComponent } from "../../shared/components/tab-content/tab-content.component";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-education",
	imports: [TabContentComponent],
	templateUrl: "./education.component.html",
	styleUrl: "./education.component.scss"
})
export class EducationComponent {
	private _educationService = inject(EducationService);

	public education = this._educationService.getEducationMilestones();
}
