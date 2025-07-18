import { Component, inject, OnInit } from "@angular/core";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";
import { ExperienceService } from "../../shared/services/http/experience.service";
import { Observable, of } from "rxjs";
import { Milestone } from "../../shared/models/milestone.model";
import { AsyncPipe } from "@angular/common";

@Component({
	selector: "portfolio-experience",
	standalone: true,
	imports: [MilestoneComponent, EmptyListComponent, AsyncPipe],
	templateUrl: "./experience.component.html",
	styleUrl: "./experience.component.scss"
})
export class ExperienceComponent implements OnInit {
	private _experienceService = inject(ExperienceService);

	public experiences$: Observable<Milestone[]> = of([]);

	ngOnInit() {
		this.experiences$ = this._experienceService.getExperience();
	}
}
