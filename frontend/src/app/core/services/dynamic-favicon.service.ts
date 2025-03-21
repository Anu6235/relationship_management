import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { AppConfigService } from './app-config.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DynamicFaviconService {
  constructor(
    private titleService: Title,
    private appConfigService: AppConfigService
  ) {
    this.initFaviconUpdates();
  }

  private initFaviconUpdates() {
    // Initial load
    this.updateFavicon();

    // Subscribe to config updates
    this.appConfigService.configUpdated.subscribe(() => {
      this.updateFavicon();
    });
  }

  private updateFavicon() {
    this.appConfigService.getAppConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const appName = response.data.app_name || 'My Application';
          this.titleService.setTitle(appName);

          if (response.data.logo) {
            this.changeFavicon(`${environment.BASE_URL}${response.data.logo}`);
          }
        }
      },
      error: (error) => {
        console.error('Error updating favicon:', error);
      }
    });
  }

  private changeFavicon(iconPath: string) {
    // Remove existing favicons
    const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
    existingFavicons.forEach(el => el.remove());

    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = iconPath;

    // Append to head
    document.head.appendChild(link);
  }
}