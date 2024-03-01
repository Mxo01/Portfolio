import { Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { NavbarComponent } from "./components/navbar/navbar.component";
import { AboutComponent } from "./components/about/about.component";
import { ProjectsComponent } from "./components/projects/projects.component";

@Component({
	selector: "app-root",
	standalone: true,
	imports: [RouterOutlet, NavbarComponent, AboutComponent, ProjectsComponent],
	templateUrl: "./app.component.html",
	styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
	public windowWidth: number = window.innerWidth;
	private oldWindowWidth: number = this.windowWidth;

	public ngOnInit(): void {
		this.setTheme();
		this.setOverflowBehavior();

		window.addEventListener("resize", () => {
			this.windowWidth = window.innerWidth;
			if (this.windowWidth !== this.oldWindowWidth) {
				this.oldWindowWidth = this.windowWidth;
				window.scrollTo(0, 0);
			}

			this.setOverflowBehavior();
		});
	}

	private setOverflowBehavior(): void {
		if (this.windowWidth > 991) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "auto";
		}
	}

	private setTheme(): void {
		localStorage.getItem("theme")
			? localStorage.getItem("theme") == "light"
				? document.body.setAttribute("data-bs-theme", "light")
				: document.body.setAttribute("data-bs-theme", "dark")
			: document.body.setAttribute("data-bs-theme", "light");
	}
}
