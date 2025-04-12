import { StateService } from "./../../services/state.service";
import { Component, computed, inject, input } from "@angular/core";
import { Avatar } from "primeng/avatar";
import { AvatarGroup } from "primeng/avatargroup";
import { Picture } from "../../models/picture.model";
import { TooltipModule } from "primeng/tooltip";

@Component({
	selector: "portfolio-avatar-list",
	standalone: true,
	imports: [Avatar, AvatarGroup, TooltipModule],
	templateUrl: "./avatar-list.component.html",
	styleUrl: "./avatar-list.component.scss"
})
export class AvatarListComponent {
	private _stateService = inject(StateService);

	public avatars = input<Picture[]>([]);
	public isCollapsed = input<boolean>(false);
	public max = input<number>(3);
	public description = input<string>("");

	public collapsedAvatars = computed(() => this.avatars().splice(0, this.max()));
	public isMobile = computed(() => this._stateService.isMobile());
}
