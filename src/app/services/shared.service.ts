import { Injectable, signal } from "@angular/core";
import { Project } from "../models/project.model";
import { Experience } from "../models/experience.model";

@Injectable({
	providedIn: "root",
})
export class SharedService {
	project = signal<Project>("GymBro");
	totalExperience = signal<Experience>({ years: 0, months: 0 });

	constructor() {
		this.calculateTotalExperience();
	}

	private calculateTotalExperience() {
		const pastExperiences: Experience[] = [{ years: 0, months: 3 }];

		const lastWorkingExperienceStartDate = new Date(2024, 2);
		const currentDate = new Date();

		let years =
			currentDate.getFullYear() -
			lastWorkingExperienceStartDate.getFullYear();
		let months =
			currentDate.getMonth() - lastWorkingExperienceStartDate.getMonth();

		pastExperiences.forEach(experience => {
			years += experience.years;
			months += experience.months;

			if (months > 12) (months -= 12), years++;
		});

		this.totalExperience.set({ years, months });
	}

	setProject(project: Project) {
		this.project.set(project);
	}
}
