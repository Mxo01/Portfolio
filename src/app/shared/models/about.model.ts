import { Kpi } from "./kpi.model";
import { Picture } from "./picture.model";

export interface AboutInfo {
	kpis: Kpi[];
	techStack: Picture[];
	companies: Picture[];
	profilePicUrl: string;
	cvUrl: string;
}
