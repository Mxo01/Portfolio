import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { Picture } from "../../models/picture.model";
import { FormsModule } from "@angular/forms";
import { Avatar } from "primeng/avatar";
import { Button } from "primeng/button";
import { FileUpload, FileUploadEvent } from "primeng/fileupload";
import { FloatLabel } from "primeng/floatlabel";
import { InputText } from "primeng/inputtext";
import { Tooltip } from "primeng/tooltip";
import { moveItem, uploadLogo } from "../../utils/utils";

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: "portfolio-reorderable-logos",
	imports: [Avatar, Tooltip, Button, FileUpload, FloatLabel, FormsModule, InputText],
	templateUrl: "./reorderable-logos.component.html",
	styleUrls: ["./reorderable-logos.component.scss", "../../../../styles.scss"]
})
export class ReorderableLogosComponent {
	public logos = input.required<Picture[]>();
	public isMobile = input.required<boolean>();

	public logosUpdate = output<Picture[]>();

	public moveLogoItem(logos: Picture[], startingIndex: number, direction: "up" | "down") {
		return moveItem(logos, startingIndex, direction);
	}

	public async onLogoUpload(event: FileUploadEvent, index: number) {
		const file: File = event.files[0];

		if (!file) return;

		this.logosUpdate.emit(await uploadLogo(this.logos(), file, index));
	}

	public removeLogo(index: number) {
		this.logosUpdate.emit(this.logos().filter((_, logoIndex) => index !== logoIndex));
	}
}
