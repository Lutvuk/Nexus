import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { NexusDashboardComponent } from './components/nexus-dashboard/nexus-dashboard.component';
import { NexusBoardComponent } from './components/nexus-board/nexus-board.component';
import { CardDetailComponent } from './components/card-detail/card-detail.component';
import { JoinWorkspaceComponent } from './pages/join-workspace/join-workspace.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [guestGuard]
    },
    {
        path: 'register',
        component: RegisterComponent,
        canActivate: [guestGuard]
    },
    {
        path: 'dashboard',
        component: NexusDashboardComponent,
        canActivate: [authGuard]
    },
    {
        path: 'board/:id',
        component: NexusBoardComponent,
        canActivate: [authGuard],
        children: [
            {
                path: 'card/:cardId',
                component: CardDetailComponent
            }
        ]
    },
    {
        path: 'join/:token',
        component: JoinWorkspaceComponent,
        canActivate: [authGuard]
    },
    {
        path: '**',
        component: NotFoundComponent
    }
];
