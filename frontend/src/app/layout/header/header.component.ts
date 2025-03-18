import { Component, EventEmitter, Output } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor(private authService: AuthService) {}
  @Output() expand = new EventEmitter<boolean>();
  onLogout(): void {
    this.authService.logOut();
  }
  expandSidebar(){
    this.expand.emit(true);
  }


}