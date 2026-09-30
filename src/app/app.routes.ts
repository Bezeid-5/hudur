import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', redirectTo: 'login', pathMatch: 'full' },
	{
		path: 'login',
		loadComponent: () => import('./features/auth/login/login.component').then((module) => module.LoginComponent),
	},
	{
		path: 'register',
		loadComponent: () => import('./features/auth/register/register.component').then((module) => module.RegisterComponent),
	},
	{
		path: 'pointage',
		loadComponent: () => import('./features/pointage/pointage/pointage.component').then((module) => module.PointageComponent),
	},
	{ path: '**', redirectTo: 'login' },
];
