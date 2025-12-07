import { Routes } from "@angular/router";
import { PATHS } from "./shared/utils/constants";
import { HomeComponent } from "./pages/home/home.component";

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
				loadComponent: () =>
					import("./pages/experience/experience.component").then(
						m => m.ExperienceComponent
					)
			},
			{
				path: PATHS.EDUCATION,
				loadComponent: () =>
					import("./pages/education/education.component").then(m => m.EducationComponent)
			},
			{
				path: PATHS.PROJECTS,
				loadComponent: () =>
					import("./pages/projects/projects.component").then(m => m.ProjectsComponent)
			}
		]
	},
	{
		path: PATHS.AUTH,
		loadComponent: () => import("./pages/auth/auth.component").then(m => m.AuthComponent)
	},
	{
		path: "**",
		redirectTo: PATHS.HOME,
		pathMatch: "full"
	}
];
