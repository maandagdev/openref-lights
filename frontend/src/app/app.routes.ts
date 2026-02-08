import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { RefereeComponent } from './pages/referee/referee';
import { JuryComponent } from './pages/jury/jury';
import { DisplayComponent } from './pages/display/display';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'referee/:position', component: RefereeComponent },
  { path: 'jury', component: JuryComponent },
  { path: 'display', component: DisplayComponent },
  { path: '**', redirectTo: '' },
];
