import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DynamicFaviconService } from './core/services/dynamic-favicon.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  constructor(
    private dynamicFaviconService: DynamicFaviconService,
    private authService: AuthService
  ) {}
  
  ngOnInit() {
    this.authService.registerBrowserCloseEvent();
    this.authService.checkBrowserCloseLogout();
    sessionStorage.setItem('app_session', 'active');
  }
}
