import { Component, input } from "@angular/core";
import { TagModule } from "primeng/tag";
import { NgClass } from "@angular/common";
import { Milestone } from "../../models/milestone.model";

@Component({
	selector: "portfolio-milestone",
	standalone: true,
	imports: [TagModule, NgClass],
	templateUrl: "./milestone.component.html",
	styleUrl: "./milestone.component.scss"
})
export class MilestoneComponent {
	public milestone = input.required<Milestone>();
}
