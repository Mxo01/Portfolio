import { Component, Signal, computed } from '@angular/core';
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
export class NavbarComponent {
  theme: Signal<Theme> = computed(() => this.themeService.theme());

  constructor(private themeService: ThemeService) {}

  toAbout(): void {
    document.getElementById('about')!.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
  }

  toProjects(): void {
    document.getElementById('projects')!.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
  }

  toggleTheme(): void {
	const theme = localStorage.getItem('theme') === 'light' ? 'dark' : 'light' as Theme;
    this.themeService.setTheme(theme);
  }
}
