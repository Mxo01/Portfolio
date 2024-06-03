import { NgClass } from '@angular/common';
import { Component, Signal, computed } from '@angular/core';
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
    public theme: Signal<Theme> = computed(() => this.themeService.theme());

    constructor(
      private themeService: ThemeService
    ) {}
}
