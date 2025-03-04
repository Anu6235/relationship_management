import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  @Output() requestAction = new EventEmitter<{type: string, request: any}>();
  
  hasPendingMarriageRequest = false;
  hasPendingDivorceRequest = false;
  hasPendingBothRequests = false;
  pendingRequest: any = null;

  constructor(private memberService: MemberService) {}

  ngOnInit(): void {
    this.checkForPendingRequests();
  }

  private checkForPendingRequests(): void {
    if (!this.member || !this.member.id) return;
    
    // Check for pending marriage requests
    this.memberService.getPendingMarriageRequestsForMember(this.member.id)
      .subscribe({
        next: (response) => {
          if (response.data && response.data.length > 0) {
            this.pendingRequest = response.data[0];
            
            // Determine type of pending request
            if (this.pendingRequest.divorce_date) {
              // If there's a divorce date but status is not 'divorced', it's a pending divorce
              if (this.pendingRequest.status !== 'divorced') {
                // If status is 'pending', both marriage and divorce are pending
                if (this.pendingRequest.status === 'pending') {
                  this.hasPendingBothRequests = true;
                } else {
                  // Status is 'confirmed', only divorce is pending
                  this.hasPendingDivorceRequest = true;
                }
              }
            } else {
              // No divorce date, only marriage is pending
              this.hasPendingMarriageRequest = this.pendingRequest.status === 'pending';
            }
          }
        },
        error: (error) => {
          console.error('Error fetching relationship requests:', error);
        }
      });
  }

  handleRequest(): void {
    if (!this.pendingRequest) return;
    
    if (this.hasPendingBothRequests) {
      this.requestAction.emit({ 
        type: 'both', 
        request: this.pendingRequest 
      });
    } else if (this.hasPendingMarriageRequest) {
      this.requestAction.emit({ 
        type: 'marriage', 
        request: this.pendingRequest 
      });
    } else if (this.hasPendingDivorceRequest) {
      this.requestAction.emit({ 
        type: 'divorce', 
        request: this.pendingRequest 
      });
    }
  }

  getNotificationColor(): string {
    if (this.hasPendingBothRequests) {
      return 'yellow';
    } else if (this.hasPendingDivorceRequest) {
      return 'red';
    } else if (this.hasPendingMarriageRequest) {
      return 'green';
    }
    return '';
  }
}