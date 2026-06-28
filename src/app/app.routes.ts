import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/study/study-page.component').then(
        (module) => module.StudyPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
