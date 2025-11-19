import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-kpi",
	imports: [],
	templateUrl: "./kpi.component.html",
	styleUrl: "./kpi.component.scss"
})
export class KpiComponent {
	public label = input<string>();
	public value = input<string>();
}
