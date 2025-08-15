import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ExperienceService } from "../../shared/services/http/experience.service";
import { TabContentComponent } from "../../shared/components/tab-content/tab-content.component";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-experience",
	imports: [TabContentComponent],
	templateUrl: "./experience.component.html",
	styleUrl: "./experience.component.scss"
})
export class ExperienceComponent {
	private _experienceService = inject(ExperienceService);

	public experiences = this._experienceService.getExperience();
}
