import { StateService } from "./../../services/state.service";
import { Component, computed, inject, input, output } from "@angular/core";
import { Avatar } from "primeng/avatar";
import { AvatarGroup } from "primeng/avatargroup";
import { TooltipModule } from "primeng/tooltip";
import { Picture } from "../../models/picture.model";
import { Skeleton } from "primeng/skeleton";
import { Button } from "primeng/button";
import { EmptyListComponent } from "../empty-list/empty-list.component";

@Component({
	selector: "portfolio-avatar-list",
	imports: [Avatar, AvatarGroup, TooltipModule, Skeleton, Button, EmptyListComponent],
	templateUrl: "./avatar-list.component.html",
	styleUrl: "./avatar-list.component.scss"
})
export class AvatarListComponent {
	private _stateService = inject(StateService);

	public avatars = input<Picture[]>([]);
	public isCollapsed = input<boolean>(false);
	public isLoading = input<boolean>(false);
	public isEditable = input<boolean>(false);
	public max = input<number>(3);
	public description = input<string>("");
	public emptyDescription = input<string>("");

	public edit = output();

	public collapsedAvatars = computed(() => [...this.avatars()].splice(0, this.max()));
	public remainingAvatars = computed(
		() => this.avatars().length - this.collapsedAvatars().length
	);
	public isMobile = computed(() => this._stateService.isMobile());
}
