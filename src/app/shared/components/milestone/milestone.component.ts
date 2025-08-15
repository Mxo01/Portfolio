import { Component, computed, input } from "@angular/core";
import { TagModule } from "primeng/tag";
import { NgClass } from "@angular/common";
import { GalleriaModule, GalleriaResponsiveOptions } from "primeng/galleria";
import { AvatarListComponent } from "../avatar-list/avatar-list.component";
import { ImageModule } from "primeng/image";
import { ButtonModule } from "primeng/button";
import { Avatar } from "primeng/avatar";
import { Milestone } from "../../models/milestone.model";
import { calculateExperience, mapMilestoneMediaToGalleriaImages } from "../../utils/utils";

@Component({
	selector: "portfolio-milestone",
	imports: [
		TagModule,
		Avatar,
		ButtonModule,
		ImageModule,
		NgClass,
		GalleriaModule,
		AvatarListComponent
	],
	templateUrl: "./milestone.component.html",
	styleUrl: "./milestone.component.scss"
})
export class MilestoneComponent {
	public milestone = input.required<Milestone>();

	public experienceDuration = computed(() => calculateExperience([this.milestone().period]));
	public galleriaImages = computed(() =>
		mapMilestoneMediaToGalleriaImages(this.milestone().media)
	);
	public isGalleriaVisible = false;
	public responsiveOptions: GalleriaResponsiveOptions[] = [
		{ breakpoint: "1024px", numVisible: 5 },
		{ breakpoint: "768px", numVisible: 3 },
		{ breakpoint: "560px", numVisible: 1 }
	];
}
