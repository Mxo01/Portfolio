import { Routes } from "@angular/router";
import { ExperienceComponent } from "./pages/experience/experience.component";
import { PATHS } from "./utils/constants";
import { EducationComponent } from "./pages/education/education.component";
import { ProjectsComponent } from "./pages/projects/projects.component";

export const routes: Routes = [
	{ path: "", redirectTo: PATHS.EXPERIENCE, pathMatch: "full" },
	{ path: PATHS.EXPERIENCE, component: ExperienceComponent },
	{ path: PATHS.EDUCATION, component: EducationComponent },
	{ path: PATHS.PROJECTS, component: ProjectsComponent },
	{ path: "**", redirectTo: "", pathMatch: "full" }
];
