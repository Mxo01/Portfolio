import { NgClass } from '@angular/common';
import { Component } from '@angular/core';
import { Theme } from '../../models/theme.model';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-info-offcanvas',
  standalone: true,
  imports: [NgClass],
  templateUrl: './info-offcanvas.component.html',
  styleUrl: './info-offcanvas.component.css'
})
export class InfoOffcanvasComponent {
    public theme: Theme = "light";

    constructor(
      private themeService: ThemeService
    ) {}

    public ngOnInit(): void {
      this.themeService.themeObs.subscribe((theme: Theme) => {
        this.theme = theme;
      });
    }
}
