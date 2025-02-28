import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MemberService } from '../../../core/services/member.service';

@Component({
  selector: 'app-marriage-confirmation-modal',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './marriage-confirmation-modal.component.html',
  styleUrl: './marriage-confirmation-modal.component.css'
})
export class MarriageConfirmationModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() memberId: number | null = null;
  @Output() modalClosed = new EventEmitter<void>();
  @Output() marriageConfirmed = new EventEmitter<any>();

  loading = false;
  pendingMarriageRequest: any = null;
  partnerMember: any = null;
  isProposer: boolean = false;
  requestMessage: string = '';

  constructor(private memberService: MemberService) {}

  ngOnInit(): void {
    if (this.isVisible && this.memberId) {
      this.fetchPendingMarriageRequests();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isVisible'] || changes['memberId']) && this.isVisible && this.memberId) {
      this.fetchPendingMarriageRequests();
    }
  }

  fetchPendingMarriageRequests(): void {
    if (!this.memberId) return;
    
    this.loading = true;
    this.memberService.getPendingMarriageRequestsForMember(this.memberId)
      .subscribe({
        next: (response) => {
          if (response.data && response.data.length > 0) {
            this.pendingMarriageRequest = response.data[0];
            this.determineRolesAndFetchPartnerInfo();
          } else {
            this.pendingMarriageRequest = null;
            this.partnerMember = null;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error fetching marriage requests:', error);
          this.loading = false;
        }
      });
  }

  determineRolesAndFetchPartnerInfo(): void {
    if (!this.pendingMarriageRequest) return;

    // Determine if current user is husband or wife
    const isHusband = this.memberId === this.pendingMarriageRequest.husband_id;
    const isWife = this.memberId === this.pendingMarriageRequest.wife_id;
    
    // Determine if current user is proposer based on marriage proposal type
    const husbandProposed = this.pendingMarriageRequest.proposal_type === 'husband_to_wife';
    this.isProposer = (isHusband && husbandProposed) || (isWife && !husbandProposed);
    
    // Get the partner's ID
    const partnerId = isHusband ? this.pendingMarriageRequest.wife_id : this.pendingMarriageRequest.husband_id;
    
    this.memberService.getMember(partnerId)
      .subscribe({
        next: (response) => {
          this.partnerMember = response.data;
          
          // Set appropriate message based on roles
          if (this.isProposer) {
            this.requestMessage = `You have sent a marriage request to ${this.partnerMember.first_name} ${this.partnerMember.last_name}.`;
          } else {
            this.requestMessage = `${this.partnerMember.first_name} ${this.partnerMember.last_name} has requested to marry you.`;
          }
        },
        error: (error) => {
          console.error('Error fetching partner info:', error);
        }
      });
  }

  confirmMarriage(): void {
    if (!this.pendingMarriageRequest || !this.partnerMember) {
      console.error('No valid marriage request found');
      return;
    }
    
    // The partner's ID is needed for confirmation
    const partnerId = this.isProposer 
      ? (this.memberId === this.pendingMarriageRequest.husband_id 
         ? this.pendingMarriageRequest.wife_id 
         : this.pendingMarriageRequest.husband_id)
      : (this.memberId === this.pendingMarriageRequest.husband_id 
         ? this.pendingMarriageRequest.wife_id 
         : this.pendingMarriageRequest.husband_id);
    
    this.loading = true;
    this.memberService.confirmMarriage(partnerId)
      .subscribe({
        next: (response) => {
          console.log('Marriage confirmation response:', response);
          this.loading = false;
          
          // Only emit success if the API returns success
          if (response && response.success) {
            this.marriageConfirmed.emit({
              marriage: this.pendingMarriageRequest,
              partner: this.partnerMember
            });
            this.onCancel();
          } else {
            console.error('API returned success: false', response);
          }
        },
        error: (error) => {
          console.error('Error confirming marriage:', error);
          this.loading = false;
        }
      });
  }

  onCancel(): void {
    this.modalClosed.emit();
  }
}