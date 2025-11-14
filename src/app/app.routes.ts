import { Routes } from "@angular/router";
import { ExperienceComponent } from "./pages/experience/experience.component";
import { EducationComponent } from "./pages/education/education.component";
import { ProjectsComponent } from "./pages/projects/projects.component";
import { PATHS } from "./shared/utils/constants";
import { HomeComponent } from "./pages/home/home.component";
import { AuthComponent } from "./pages/auth/auth.component";

export const routes: Routes = [
	{
		path: "",
		redirectTo: PATHS.HOME,
		pathMatch: "full"
	},
	{
		path: PATHS.HOME,
		component: HomeComponent,
		children: [
			{
				path: "",
				redirectTo: PATHS.EXPERIENCE,
				pathMatch: "full"
			},
			{
				path: PATHS.EXPERIENCE,
				component: ExperienceComponent,
				data: { animation: PATHS.EXPERIENCE }
			},
			{
				path: PATHS.EDUCATION,
				component: EducationComponent,
				data: { animation: PATHS.EDUCATION }
			},
			{
				path: PATHS.PROJECTS,
				component: ProjectsComponent,
				data: { animation: PATHS.PROJECTS }
			}
		]
	},
	{
		path: PATHS.AUTH,
		component: AuthComponent
	},
	{
		path: "**",
		redirectTo: PATHS.HOME,
		pathMatch: "full"
	}
];
