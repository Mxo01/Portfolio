import { Component, OnInit } from '@angular/core';
import { Theme } from '../../models/theme.model';
import { ThemeService } from '../../services/theme.service';
import { NgClass, NgStyle } from '@angular/common';
import { InfoOffcanvasComponent } from '../info-offcanvas/info-offcanvas.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [NgClass, InfoOffcanvasComponent, NgStyle],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css', '../../../styles.css']
})
export class NavbarComponent implements OnInit {
  public theme: Theme = 'light';

  public constructor(private themeService: ThemeService) {}

  public ngOnInit(): void {
    this.themeService.themeObs.subscribe(theme => {
      this.theme = theme;
    });
  }

  public toAbout(): void {
    document.getElementById('about')!.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
  }

  public toProjects(): void {
    document.getElementById('projects')!.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
  }

  public toggleTheme(): void {
    this.theme = localStorage.getItem('theme') === 'light' ? 'dark' : 'light' as Theme;
    this.themeService.setTheme(this.theme);
  }
}
