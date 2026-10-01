import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	{
		path: 'login',
		canActivate: [guestGuard],
		loadComponent: () => import('./features/auth/login/login.component').then((module) => module.LoginComponent),
	},
	{
		path: 'register',
		canActivate: [guestGuard],
		loadComponent: () => import('./features/auth/register/register.component').then((module) => module.RegisterComponent),
	},
	{
		path: 'pointage',
		canActivate: [authGuard],
		loadComponent: () => import('./features/pointage/pointage/pointage.component').then((module) => module.PointageComponent),
	},
	{
		path: 'historique',
		canActivate: [authGuard],
		loadComponent: () => import('./features/historique/historique/historique.component').then((module) => module.HistoriqueComponent),
	},
	{ path: '**', redirectTo: 'login' },
];
