import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NexusNavbarComponent } from './components/nexus-navbar/nexus-navbar.component';
import { NexusToastComponent } from './components/nexus-toast/nexus-toast.component';
import { NexusGlobalDialogComponent } from './components/nexus-global-dialog/nexus-global-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NexusNavbarComponent, NexusToastComponent, NexusGlobalDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'nexus-frontend';
}
