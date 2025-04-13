import { NgClass } from "@angular/common";
import { Component, input } from "@angular/core";

@Component({
	selector: "portfolio-empty-list",
	standalone: true,
	imports: [NgClass],
	templateUrl: "./empty-list.component.html",
	styleUrl: "./empty-list.component.scss"
})
export class EmptyListComponent {
	public icon = input<string>("pi pi-inbox");
	public title = input<string>();
	public description = input<string>();
}
