import { Component, inject, OnInit } from "@angular/core";
import { MilestoneComponent } from "../../shared/components/milestone/milestone.component";
import { EmptyListComponent } from "../../shared/components/empty-list/empty-list.component";
import { AsyncPipe } from "@angular/common";
import { EducationService } from "../../shared/services/http/education.service";
import { Observable, of } from "rxjs";
import { Milestone } from "../../shared/models/milestone.model";

@Component({
	selector: "portfolio-education",
	imports: [MilestoneComponent, EmptyListComponent, AsyncPipe],
	templateUrl: "./education.component.html",
	styleUrl: "./education.component.scss"
})
export class EducationComponent implements OnInit {
	private _educationService = inject(EducationService);

	public education$: Observable<Milestone[]> = of([]);

	ngOnInit() {
		this.education$ = this._educationService.getEducation();
	}
}
