import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { MemberService } from '../../../core/services/member.service';
import { CommonModule } from '@angular/common';

interface RelationshipRequest {
  id: number;
  requestType: 'marriage' | 'divorce';
  partner: any;
  isProposer: boolean;
  message: string;
  timestamp?: string;
}

@Component({
  selector: 'app-relationship-requests-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './relationship-requests-modal.component.html',
  styleUrls: ['./relationship-requests-modal.component.css']
})
export class RelationshipRequestsModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() memberId: any 
  @Output() modalClosed = new EventEmitter<void>();
  @Output() relationshipActionCompleted = new EventEmitter<{
    action: 'marriage_confirmed' | 'marriage_rejected' | 'divorce_confirmed' | 'divorce_rejected';
    request: any;
    partner: any;
  }>();

  loading = false;
  marriageRequests: RelationshipRequest[] = [];
  divorceRequests: RelationshipRequest[] = [];
  error: string | null = null;

  constructor(private memberService: MemberService) {}

  ngOnInit(): void {
    // console.log(this.memberId,'this.memberId')

    if (this.isVisible && this.memberId) {
      this.fetchAllPendingRequests();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('Modal changes:', {
      isVisible: this.isVisible,
      memberId: this.memberId
    });
    // Only fetch if both isVisible is true and memberId is available
    if (this.isVisible && this.memberId) {
      // Add a small delay to ensure all inputs are set
      setTimeout(() => this.fetchAllPendingRequests(), 0);
    }
  }

  fetchAllPendingRequests(): void {
    if (!this.memberId) {
      console.error('Cannot fetch requests: No member ID provided');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    console.log('Fetching marriage requests for member:', this.memberId);
    
    // Fetch marriage requests
    this.memberService.getPendingMarriageRequests(this.memberId)
      .subscribe({
        next: (response) => {
          console.log('Marriage requests response:', response);
          if (response.data && Array.isArray(response.data)) {
            console.log('Found marriage requests:', response.data.length);
            this.processMarriageRequests(response.data);
          } else {
            console.log('No marriage requests found or invalid data format');
            this.marriageRequests = [];
          }
          
          this.fetchPendingDivorceRequests();
        },
        error: (error) => {
          console.error('Error fetching marriage requests:', error);
          this.error = 'Failed to load marriage requests. Please try again.';
          this.loading = false;
          this.marriageRequests = [];
          this.fetchPendingDivorceRequests();
        }
      });
  }

  fetchPendingDivorceRequests(): void {
    if (!this.memberId) {
      this.loading = false;
      return;
    }
    
    this.memberService.getPendingDivorceRequests(this.memberId)
      .subscribe({
        next: (response) => {
          if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            this.processDivorceRequests(response.data);
          } else {
            this.divorceRequests = [];
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error fetching divorce requests:', error);
          this.error = this.error || 'Failed to load divorce requests. Please try again.';
          this.divorceRequests = [];
          this.loading = false;
        }
      });
  }

  processMarriageRequests(requests: any[]): void {
    this.marriageRequests = [];
    
    console.log('Processing marriage requests:', requests);
    
    const pendingRequests = requests.filter(req => req.status === 'pending');
    console.log('Pending marriage requests:', pendingRequests.length);
    
    if (pendingRequests.length === 0) {
      return;
    }

    let completedRequests = 0;
    
    console.log(pendingRequests,'pendingRequests')
    
    pendingRequests.forEach(request => {
      // Determine if current user is husband or wife
      const isHusband = this.memberId === request.husband_id;
      
      // Determine if current user is proposer based on marriage proposal type
      const husbandProposed = request.proposal_type === 'husband_to_wife';
      const isProposer = (isHusband && husbandProposed) || (!isHusband && !husbandProposed);
      
      // Get the partner's ID
      const partnerId = isHusband ? request.wife_id : request.husband_id;
      
      console.log('Fetching partner info for marriage request:', request.id, 'Partner ID:', partnerId);
      
      // Fetch partner info
      this.memberService.getMember(partnerId)
        .subscribe({
          next: (response) => {
            completedRequests++;
            
            if (response.data) {
              console.log('Found partner info for marriage request:', request.id);
              
              this.marriageRequests.push({
                id: request.id,
                requestType: 'marriage',
                partner: response.data,
                isProposer: isProposer,
                message: isProposer ? 
                  `You have sent a marriage request to ${response.data.first_name} ${response.data.last_name}.` :
                  `${response.data.first_name} ${response.data.last_name} has requested to marry you.`,
                timestamp: request.created_at
              });
              
              // Sort requests
              this.marriageRequests.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                }
                return 0;
              });
            }
            
            // If all requests completed, set loading to false
            if (completedRequests === pendingRequests.length) {
              console.log('All marriage partner info requests completed');
            }
          },
          error: (error) => {
            completedRequests++;
            console.error('Error fetching partner info:', error);
            
            // If all requests completed, set loading to false
            if (completedRequests === pendingRequests.length) {
              console.log('All marriage partner info requests completed (with some errors)');
            }
          }
        });
    });
  }

  processDivorceRequests(requests: any[]): void {
    this.divorceRequests = [];
    
    const pendingRequests = requests.filter(req => req.status === 'pending');
    
    if (pendingRequests.length === 0) {
      return;
    }
    
    pendingRequests.forEach(request => {
      // Determine if current user is initiator or recipient
      const isInitiator = this.memberId === request.initiator_id;
      
      // Get the partner's ID
      const partnerId = isInitiator ? request.recipient_id : request.initiator_id;
      
      // Fetch partner info
      this.memberService.getMember(partnerId)
        .subscribe({
          next: (response) => {
            if (response.data) {
              this.divorceRequests.push({
                id: request.id,
                requestType: 'divorce',
                partner: response.data,
                isProposer: isInitiator,
                message: isInitiator ? 
                  `You have requested a divorce from ${response.data.first_name} ${response.data.last_name}.` :
                  `${response.data.first_name} ${response.data.last_name} has requested a divorce from you.`,
                timestamp: request.created_at
              });
              
              // Sort requests by timestamp if available
              this.divorceRequests.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                }
                return 0;
              });
            }
          },
          error: (error) => {
            console.error('Error fetching partner info:', error);
          }
        });
    });
  }

  confirmMarriage(requestId: any): void {
    this.loading = true;
    this.error = null;
    console.log("Request id",requestId);
    
    // Find the request to get partner info
    const request = this.marriageRequests.find(r => r.id === requestId);
    if (!request) {
      this.loading = false;
      return;
    }
    
    this.memberService.confirmMarriage(requestId, this.memberId)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response && response.success) {
            // Remove the request from the list
            this.marriageRequests = this.marriageRequests.filter(r => r.id !== requestId);
            
            // Emit event for parent component
            this.relationshipActionCompleted.emit({
              action: 'marriage_confirmed',
              request: request,
              partner: request.partner
            });
            
            // If no more requests, close modal
            if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
              this.onCancel();
            }
          } else {
            this.error = response.message || 'Failed to confirm marriage. Please try again.';
            console.error('API returned success: false', response);
          }
        },
        error: (error) => {
          this.error = 'An error occurred while confirming the marriage. Please try again.';
          console.error('Error confirming marriage:', error);
          this.loading = false;
        }
      });
  }

  rejectMarriage(requestId: number): void {
    this.loading = true;
    this.error = null;
    
    // Find the request to get partner info
    const request = this.marriageRequests.find(r => r.id === requestId);
    if (!request) {
      this.loading = false;
      return;
    }
    
    this.memberService.declineMarriage(requestId, this.memberId!)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response && response.success) {
            // Remove the request from the list
            this.marriageRequests = this.marriageRequests.filter(r => r.id !== requestId);
            
            // Emit event for parent component
            this.relationshipActionCompleted.emit({
              action: 'marriage_rejected',
              request: request,
              partner: request.partner
            });
            
            // If no more requests, close modal
            if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
              this.onCancel();
            }
          } else {
            this.error = response.message || 'Failed to reject marriage. Please try again.';
            console.error('API returned success: false', response);
          }
        },
        error: (error) => {
          this.error = 'An error occurred while rejecting the marriage. Please try again.';
          console.error('Error rejecting marriage:', error);
          this.loading = false;
        }
      });
  }

  confirmDivorce(requestId: number): void {
    this.loading = true;
    this.error = null;
    
    // Find the request to get partner info
    const request = this.divorceRequests.find(r => r.id === requestId);
    if (!request) {
      this.loading = false;
      return;
    }
    
    this.memberService.confirmDivorce(requestId, this.memberId)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response && response.success) {
            // Remove the request from the list
            this.divorceRequests = this.divorceRequests.filter(r => r.id !== requestId);
            
            // Emit event for parent component
            this.relationshipActionCompleted.emit({
              action: 'divorce_confirmed',
              request: request,
              partner: request.partner
            });
            
            // If no more requests, close modal
            if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
              this.onCancel();
            }
          } else {
            this.error = response.message || 'Failed to confirm divorce. Please try again.';
            console.error('API returned success: false', response);
          }
        },
        error: (error) => {
          this.error = 'An error occurred while confirming the divorce. Please try again.';
          console.error('Error confirming divorce:', error);
          this.loading = false;
        }
      });
  }

  rejectDivorce(requestId: number): void {
    this.loading = true;
    this.error = null;
    
    // Find the request to get partner info
    const request = this.divorceRequests.find(r => r.id === requestId);
    if (!request) {
      this.loading = false;
      return;
    }
    
    this.memberService.declineDivorce(requestId, this.memberId!)
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response && response.success) {
            // Remove the request from the list
            this.divorceRequests = this.divorceRequests.filter(r => r.id !== requestId);
            
            // Emit event for parent component
            this.relationshipActionCompleted.emit({
              action: 'divorce_rejected',
              request: request,
              partner: request.partner
            });
            
            // If no more requests, close modal
            if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
              this.onCancel();
            }
          } else {
            this.error = response.message || 'Failed to reject divorce. Please try again.';
            console.error('API returned success: false', response);
          }
        },
        error: (error) => {
          this.error = 'An error occurred while rejecting the divorce. Please try again.';
          console.error('Error rejecting divorce:', error);
          this.loading = false;
        }
      });
  }

  onCancel(): void {
    this.modalClosed.emit();
  }
}