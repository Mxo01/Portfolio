import { Component, computed, input } from "@angular/core";
import { TagModule } from "primeng/tag";
import { NgClass } from "@angular/common";
import { Milestone } from "../../models/milestone.model";
import { GalleriaModule, GalleriaResponsiveOptions } from "primeng/galleria";
import { AvatarListComponent } from "../avatar-list/avatar-list.component";
import { ImageModule } from "primeng/image";
import { ButtonModule } from "primeng/button";
import { mapMilestoneMediaToGalleriaImages } from "../../utils/utils";

@Component({
	selector: "portfolio-milestone",
	standalone: true,
	imports: [TagModule, ButtonModule, ImageModule, NgClass, GalleriaModule, AvatarListComponent],
	templateUrl: "./milestone.component.html",
	styleUrl: "./milestone.component.scss"
})
export class MilestoneComponent {
	public milestone = input.required<Milestone>();
	public isGalleriaVisible = false;
	public galleriaImages = computed(() =>
		mapMilestoneMediaToGalleriaImages(this.milestone().media)
	);
	public responsiveOptions: GalleriaResponsiveOptions[] = [
		{ breakpoint: "1024px", numVisible: 5 },
		{ breakpoint: "768px", numVisible: 3 },
		{ breakpoint: "560px", numVisible: 1 }
	];
}
