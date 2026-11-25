import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-page.component').then(m => m.HomePageComponent),
  },
  {
    path: 'learn',
    loadComponent: () =>
      import('./features/study/study-page.component').then(
        (module) => module.StudyPageComponent,
      ),
  },
  {
    path: 'dictionary',
    loadComponent: () =>
      import('./features/dictionary/dictionary-page.component').then(
        (module) => module.DictionaryPageComponent,
      ),
  },
  {
    path: 'review',
    loadComponent: () => import('./features/dictionary/dictionary-page.component').then(m => m.DictionaryPageComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
