import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DynamicFaviconService } from './core/services/dynamic-favicon.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit{
  constructor(private dynamicFaviconService: DynamicFaviconService) {}

  ngOnInit() {
    // The service will handle initialization and updates
  }
}
