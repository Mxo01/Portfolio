import { Injectable } from '@angular/core';
import { Project } from '../models/project.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private project: BehaviorSubject<Project> = new BehaviorSubject<Project>('GymBro');
  public projectObs = this.project.asObservable();


  constructor() {}

  public setProject(project: Project): void {
    this.project.next(project);
  }
}
