import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MemberService } from '../../../core/services/member.service';
import { CommonModule } from '@angular/common';

interface MarriageRequest {
  id: number;
  husband_id: number;
  wife_id: number;
  proposal_type: 'husband_to_wife' | 'wife_to_husband';
  status: 'pending' | 'confirmed' | 'rejected';
  created_at?: string;
}

interface DivorceRequest {
  id: number;
  initiator_id: number;
  recipient_id: number;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T[];
  message?: string;
}

@Component({
  selector: 'app-relationship-notification-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './relationship-notification-indicator.component.html',
  styleUrls: ['./relationship-notification-indicator.component.css']
})
export class RelationshipNotificationIndicatorComponent implements OnInit {
  @Input() member: any;
  @Output() requestAction = new EventEmitter<{type: string, request: MarriageRequest | DivorceRequest}>();
  
  hasPendingMarriageRequest = false;
  hasPendingDivorceRequest = false;
  hasPendingBothRequests = false;
  pendingRequest: MarriageRequest | DivorceRequest | null = null;

  constructor(private memberService: MemberService) {}

  ngOnInit(): void {
    this.checkForPendingRequests();
  }

  private checkForPendingRequests(): void {
    if (!this.member || !this.member.id) return;
    
    // Check for pending marriage requests
    this.memberService.getPendingMarriageRequests(this.member.id)
      .subscribe({
        next: (response: ApiResponse<MarriageRequest>) => {
          const marriagePending = response.data && 
                                 Array.isArray(response.data) && 
                                 response.data.filter((req: MarriageRequest) => req.status === 'pending').length > 0;
          
          // Check for pending divorce requests
          this.memberService.getPendingDivorceRequests(this.member.id)
            .subscribe({
              next: (divorceResponse: ApiResponse<DivorceRequest>) => {
                const divorcePending = divorceResponse.data && 
                                      Array.isArray(divorceResponse.data) && 
                                      divorceResponse.data.filter((req: DivorceRequest) => req.status === 'pending').length > 0;
                
                // Set indicator states
                if (marriagePending && divorcePending) {
                  this.hasPendingBothRequests = true;
                } else if (marriagePending) {
                  this.hasPendingMarriageRequest = true;
                } else if (divorcePending) {
                  this.hasPendingDivorceRequest = true;
                }
                
                // Store the first pending request for reference (if any)
                if (marriagePending) {
                  this.pendingRequest = response.data.find((req: MarriageRequest) => req.status === 'pending') || null;
                } else if (divorcePending) {
                  this.pendingRequest = divorceResponse.data.find((req: DivorceRequest) => req.status === 'pending') || null;
                }
              },
              error: (error) => {
                console.error('Error fetching divorce requests:', error);
              }
            });
        },
        error: (error) => {
          console.error('Error fetching marriage requests:', error);
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

  getNotificationTooltip(): string {
    if (this.hasPendingBothRequests) {
      return 'Pending marriage and divorce requests';
    } else if (this.hasPendingDivorceRequest) {
      return 'Pending divorce request';
    } else if (this.hasPendingMarriageRequest) {
      return 'Pending marriage request';
    }
    return '';
  }
}