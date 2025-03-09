import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ContentComponent } from './layout/content/content.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ContentComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'members',
        loadComponent: () => import('./features/members/members.component')
          .then(m => m.MembersComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component')
          .then(m => m.SettingsComponent)
      },
    //   {
    //     path: 'cards',
    //     loadComponent: () => import('./components/cards/cards.component')
    //       .then(m => m.CardsComponent)
    //   },
    //   {
    //     path: 'forms',
    //     loadComponent: () => import('./components/forms/forms.component')
    //       .then(m => m.FormsComponent)
    //   },
    //   {
    //     path: 'typography',
    //     loadComponent: () => import('./components/typography/typography.component')
    //       .then(m => m.TypographyComponent)
    //   }
    ]
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  },

];