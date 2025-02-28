import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MemberService } from '../../../core/services/member.service';

@Component({
  selector: 'app-marriage-request-notification',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './marriage-request-notification.component.html',
  styleUrl: './marriage-request-notification.component.css'
})
export class MarriageRequestNotificationComponent implements OnInit {
  @Input() member: any;
  hasPendingMarriageRequest = false;

  constructor(private memberService: MemberService) {}

  ngOnInit(): void {
    this.checkForPendingMarriageRequests();
  }

  private checkForPendingMarriageRequests(): void {
    if (!this.member || !this.member.id) return;

    this.memberService.getPendingMarriageRequestsForMember(this.member.id)
      .subscribe({
        next: (response) => {
          this.hasPendingMarriageRequest = response.data && response.data.length > 0;
        },
        error: (error) => {
          console.error('Error fetching marriage requests:', error);
        }
      });
  }
}
