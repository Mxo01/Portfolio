import { Component, Signal, computed } from "@angular/core";
import { Theme } from "../../models/theme.model";
import { ThemeService } from "../../services/theme.service";
import { NgClass, NgStyle } from "@angular/common";
import { Experience } from "../../models/experience.model";
import { SharedService } from "../../services/shared.service";

@Component({
	selector: "app-about",
	standalone: true,
	imports: [NgClass, NgStyle],
	templateUrl: "./about.component.html",
	styleUrls: ["./about.component.css", "../../../styles.css"],
})
export class AboutComponent {
	theme: Signal<Theme> = computed(() => this.themeService.theme());
	totalExperience: Signal<string> = computed(() =>
		this.formatExperience(this.sharedService.totalExperience())
	);

	constructor(
		private themeService: ThemeService,
		private sharedService: SharedService
	) {}

	private formatExperience(totalExperience: Experience): string {
		const experience = totalExperience;

		if (experience.years > 0) {
			if (experience.months > 0)
				return `${experience.years} years and ${experience.months} months`;

			return `${experience.years} year${experience.years > 1 ? "s" : ""}`;
		}
		
		if (experience.months > 0)
			return `${experience.months} month${experience.months > 1 ? "s" : ""}`;

		return "1 month";
	}
}
