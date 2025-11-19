import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-empty-list",
	imports: [],
	templateUrl: "./empty-list.component.html",
	styleUrl: "./empty-list.component.scss"
})
export class EmptyListComponent {
	public icon = input<string>("pi pi-inbox");
	public isIconVisible = input<boolean>(true);
	public title = input<string>();
	public description = input<string>();
	public aligned = input<"left" | "center" | "right">("center");
}
