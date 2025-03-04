import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MemberService } from '../../../core/services/member.service';

@Component({
  selector: 'app-divorce-confirmation-modal',
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
            <h3 class="text-xl font-semibold">Divorce Request</h3>
            <button type="button" class="close-button" (click)="onCancel()">×</button>
          </div>

          <div class="modal-body">
            <!-- Displaying the pending divorce request -->
            <div *ngIf="pendingRequest && partnerMember" class="text-center">
              <div class="flex items-center justify-center mb-4">
                <div class="flex flex-col items-center">
                  <div class="relative w-20 h-20 rounded-full overflow-hidden border-2 border-red-500">
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
                  has requested a divorce. Do you want to confirm this divorce request?
                </span>
                <span *ngIf="isProposer">
                  You have requested a divorce from
                  <span class="font-semibold">
                    {{ partnerMember?.first_name }} {{ partnerMember?.last_name }}
                  </span>. Awaiting their response.
                </span>
              </p>

              <div class="flex justify-center space-x-4">
                <button type="button" class="bg-gray-500" (click)="onCancel()">Cancel</button>
                <button
                  *ngIf="!isProposer"
                  type="button"
                  class="bg-red-600"
                  (click)="confirmDivorce()"
                  [disabled]="loading"
                >
                  Confirm Divorce
                </button>
                <button *ngIf="isProposer" class="bg-gray-400" disabled>Awaiting Response</button>
              </div>
            </div>

            <!-- Display message when no pending request is available -->
            <div *ngIf="!pendingRequest && !loading" class="text-center mb-6 mt-4">
              <p>No pending divorce request found.</p>
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
  styleUrl: './divorce-confirmation-modal.component.css' 
})
export class DivorceConfirmationModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() memberId: number | null = null;
  @Input() pendingRequest: any = null;
  @Output() modalClosed = new EventEmitter<void>();
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
    
    // Check who initiated the divorce
    // This logic would depend on how your backend tracks who initiated the divorce
    // For example, you might have a divorce_initiator_id field
    this.isProposer = this.pendingRequest.divorce_initiator_id === this.memberId;
    
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

  confirmDivorce(): void {
    // if (!this.pendingRequest || !this.partnerMember) {
    //   console.error('No valid divorce request found');
    //   return;
    // }
    
    // this.loading = true;
    // this.memberService.confirmDivorce(this.pendingRequest.id)
    //   .subscribe({
    //     next: (response) => {
    //       this.loading = false;
          
    //       if (response && response.success) {
    //         this.divorceConfirmed.emit({
    //           divorce: this.pendingRequest,
    //           partner: this.partnerMember
    //         });
    //         this.onCancel();
    //       } else {
    //         console.error('API returned success: false', response);
    //       }
    //     },
    //     error: (error) => {
    //       console.error('Error confirming divorce:', error);
    //       this.loading = false;
    //     }
    //   });
  }

  onCancel(): void {
    this.modalClosed.emit();
  }
}