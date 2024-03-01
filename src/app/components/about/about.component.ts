import { Component } from '@angular/core';
import { Theme } from '../../models/theme.model';
import { ThemeService } from '../../services/theme.service';
import { NgClass, NgStyle } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [NgClass, NgStyle],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css', "../../../styles.css"]
})
export class AboutComponent {
  public theme: Theme = 'light';

  constructor(private themeService: ThemeService) {}

  public ngOnInit(): void {
    this.themeService.themeObs.subscribe((theme: Theme) => {
      this.theme = theme;
    });
  }
}
