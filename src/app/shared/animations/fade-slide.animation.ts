import { trigger, transition } from "@angular/animations";
import { slideTo } from "../utils/utils";

export const slideInAnimation = trigger("routeAnimations", [
	transition(
		"education => experience, projects => education, projects => experience",
		slideTo("right")
	),
	transition(
		"experience => education, education => projects, experience =>  projects",
		slideTo("left")
	)
]);
