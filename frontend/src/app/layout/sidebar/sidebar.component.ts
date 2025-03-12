import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AppConfigService } from '../../core/services/app-config.service';

interface MenuItem {
  title: string;
  icon: string;
  link: string;
  category?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  menuItems: MenuItem[] = [
    { category: 'Home', title: 'Dashboard', icon: 'ti ti-layout-dashboard', link: '/dashboard' },
    { category: 'APPS', title: 'Members', icon: 'ti ti-users', link: '/members' },
    { title: 'Settings', icon: 'ti ti-settings', link: '/settings' },
  ];

  logoUrl: string | null = null;
  appName: string = 'App Name';
@Output() shrink = new EventEmitter<boolean>();
 

  constructor(private appConfigService: AppConfigService) {}

  ngOnInit() {
    this.loadLogo();

    this.appConfigService.configUpdated.subscribe(() => {
      this.loadLogo();
    });
  }

  loadLogo() {
    this.appConfigService.getAppConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          if (response.data.logo) {
            this.logoUrl = `http://localhost:5000${response.data.logo}`;
          }
          if (response.data.app_name) {
            this.appName = response.data.app_name;
          }
        }
      },
      error: (error) => {
        console.error('Error loading logo:', error);
      }
    });
  }

  toggleSidebar() {
    document.querySelector('.left-sidebar')?.classList.toggle('collapse');
  }

  Shrinksidebar(){
    this.shrink.emit(false);
  }
}