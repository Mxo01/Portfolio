import { Component, input } from "@angular/core";

@Component({
	selector: "portfolio-empty-list",
	imports: [],
	templateUrl: "./empty-list.component.html",
	styleUrl: "./empty-list.component.scss"
})
export class EmptyListComponent {
	public icon = input<string>("pi pi-inbox");
	public title = input<string>();
	public description = input<string>();
}
