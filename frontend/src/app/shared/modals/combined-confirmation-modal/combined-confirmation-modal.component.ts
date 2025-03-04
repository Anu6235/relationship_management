import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MemberService } from '../../../core/services/member.service';

@Component({
  selector: 'app-combined-confirmation-modal',
  imports: [CommonModule],
  standalone: true,
  template: `
    <div *ngIf="isVisible" class="modal-wrapper">
      <!-- Modal overlay -->
      <div class="modal-overlay"></div>

      <!-- Modal content -->
      <div class="modal-container">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="text-xl font-semibold">Relationship Confirmation</h3>
            <button type="button" class="close-button" (click)="onCancel()">×</button>
          </div>

          <div class="modal-body">
            <!-- Displaying the pending marriage and divorce request -->
            <div *ngIf="pendingRequest && partnerMember" class="text-center">
              <div class="flex items-center justify-center mb-4">
                <div class="flex flex-col items-center">
                  <div class="relative w-20 h-20 rounded-full overflow-hidden border-2 border-yellow-500">
                    <img
                      [src]="partnerMember?.profile_image_url || 'assets/img/default-profile.png'"
                      alt="Profile Image"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <span class="mt-2 font-medium">
                    {{ partnerMember?.first_name }} {{ partnerMember?.last_name }}
                  </span>
                </div>
              </div>

              <p class="text-center mb-6">
                <span *ngIf="!isProposer">
                  <span class="font-semibold">
                    {{ partnerMember?.first_name }} {{ partnerMember?.last_name }}
                  </span>
                  has submitted a record indicating you were previously married 
                  and are now divorced. Please confirm both the marriage and divorce records.
                </span>
                <span *ngIf="isProposer">
                  You have submitted a record indicating you were previously married to
                  <span class="font-semibold">
                    {{ partnerMember?.first_name }} {{ partnerMember?.last_name }}
                  </span>
                  and are now divorced. Awaiting their confirmation.
                </span>
              </p>

              <div class="flex flex-col items-center space-y-4">
                <div class="bg-gray-100 p-4 rounded-md w-full max-w-md">
                  <h4 class="font-medium mb-2">Marriage Details:</h4>
                  <p>Marriage Date: {{ formatDate(pendingRequest.marriage_date) }}</p>
                </div>
                
                <div class="bg-gray-100 p-4 rounded-md w-full max-w-md">
                  <h4 class="font-medium mb-2">Divorce Details:</h4>
                  <p>Divorce Date: {{ formatDate(pendingRequest.divorce_date) }}</p>
                </div>
              </div>

              <div class="flex justify-center space-x-4 mt-6">
                <button type="button" class="bg-gray-500" (click)="onCancel()">Decline</button>
                <button
                  *ngIf="!isProposer"
                  type="button"
                  class="bg-yellow-600"
                  (click)="confirmBoth()"
                  [disabled]="loading"
                >
                  Confirm Both Records
                </button>
                <button *ngIf="isProposer" class="bg-gray-400" disabled>Awaiting Response</button>
              </div>
            </div>

            <!-- Display message when no pending request is available -->
            <div *ngIf="!pendingRequest && !loading" class="text-center mb-6 mt-4">
              <p>No pending relationship records found.</p>
              <button type="button" class="mt-4 bg-blue-600" (click)="onCancel()">Close</button>
            </div>

            <!-- Loading Spinner -->
            <div *ngIf="loading" class="flex justify-center my-6">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './combined-confirmation-modal.component.css'
})
export class CombinedConfirmationModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() memberId: number | null = null;
  @Input() pendingRequest: any = null;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() marriageConfirmed = new EventEmitter<any>();
  @Output() divorceConfirmed = new EventEmitter<any>();

  loading = false;
  partnerMember: any = null;
  isProposer: boolean = false;

  constructor(private memberService: MemberService) {}

  ngOnInit(): void {
    if (this.isVisible && this.memberId && this.pendingRequest) {
      this.determineRolesAndFetchPartnerInfo();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isVisible'] || changes['memberId'] || changes['pendingRequest']) && 
        this.isVisible && this.memberId && this.pendingRequest) {
      this.determineRolesAndFetchPartnerInfo();
    }
  }

  determineRolesAndFetchPartnerInfo(): void {
    if (!this.pendingRequest || !this.memberId) return;

    // Determine if current user is husband or wife
    const isHusband = this.memberId === this.pendingRequest.husband_id;
    
    // Get the partner's ID
    const partnerId = isHusband ? this.pendingRequest.wife_id : this.pendingRequest.husband_id;
    
    // Determine if current user is proposer
    // This might need to be adjusted based on how you track who proposed the relationship
    this.isProposer = this.pendingRequest.created_by === this.memberId;
    
    this.memberService.getMember(partnerId)
      .subscribe({
        next: (response) => {
          this.partnerMember = response.data;
        },
        error: (error) => {
          console.error('Error fetching partner info:', error);
        }
      });
  }

  confirmBoth(): void {
    if (!this.pendingRequest || !this.partnerMember) {
      console.error('No valid relationship request found');
      return;
    }
    
    this.loading = true;
    this.memberService.confirmMarriageAndDivorce(this.pendingRequest.id)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response && response.success) {
            // Emit both events with appropriate data
            this.marriageConfirmed.emit({
              marriage: this.pendingRequest,
              partner: this.partnerMember
            });
            
            this.divorceConfirmed.emit({
              divorce: this.pendingRequest,
              partner: this.partnerMember
            });
            
            this.onCancel();
          } else {
            console.error('API returned success: false', response);
          }
        },
        error: (error) => {
          console.error('Error confirming relationship records:', error);
          this.loading = false;
        }
      });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Not specified';
    
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  onCancel(): void {
    this.modalClosed.emit();
  }
}