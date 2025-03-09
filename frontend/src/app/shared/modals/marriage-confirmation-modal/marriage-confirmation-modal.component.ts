// import { CommonModule } from '@angular/common';
// import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
// import { MemberService } from '../../../core/services/member.service';

// interface RelationshipRequest {
//   id: number;
//   requestType: 'marriage' | 'divorce';
//   partner: any;
//   isProposer: boolean;
//   message: string;
//   timestamp?: Date;
// }

// @Component({
//   selector: 'app-marriage-confirmation-modal',
//   imports: [CommonModule],
//   standalone: true,
//   templateUrl: './marriage-confirmation-modal.component.html',
//   styleUrl: './marriage-confirmation-modal.component.css'
// })
// export class MarriageConfirmationModalComponent implements OnInit, OnChanges {
//   @Input() isVisible = false;
//   @Input() memberId: number | null = null;
//   @Output() modalClosed = new EventEmitter<void>();
//   @Output() relationshipActionCompleted = new EventEmitter<{
//     action: 'marriage_confirmed' | 'marriage_rejected' | 'divorce_confirmed' | 'divorce_rejected';
//     request: any;
//     partner: any;
//   }>();

//   loading = false;
//   marriageRequests: RelationshipRequest[] = [];
//   divorceRequests: RelationshipRequest[] = [];

//   constructor(private memberService: MemberService) {}

//   ngOnInit(): void {
//     if (this.isVisible && this.memberId) {
//       this.fetchAllPendingRequests();
//     }
//   }

//   ngOnChanges(changes: SimpleChanges): void {
//     if ((changes['isVisible'] || changes['memberId']) && this.isVisible && this.memberId) {
//       this.fetchAllPendingRequests();
//     }
//   }

//   fetchAllPendingRequests(): void {
//     if (!this.memberId) return;
    
//     this.loading = true;
    
//     // Fetch marriage requests
//     this.memberService.getPendingMarriageRequestsForMember(this.memberId)
//       .subscribe({
//         next: (response) => {
//           if (response.data && response.data.length > 0) {
//             this.processMarriageRequests(response.data);
//           } else {
//             this.marriageRequests = [];
//           }
          
//           // After marriage requests are processed, fetch divorce requests
//           this.fetchPendingDivorceRequests();
//         },
//         error: (error) => {
//           console.error('Error fetching marriage requests:', error);
//           this.loading = false;
//           this.marriageRequests = [];
//           this.fetchPendingDivorceRequests();
//         }
//       });
//   }

//   fetchPendingDivorceRequests(): void {
//     if (!this.memberId) {
//       this.loading = false;
//       return;
//     }
    
//     this.memberService.getPendingDivorceRequestsForMember(this.memberId)
//       .subscribe({
//         next: (response) => {
//           if (response.data && response.data.length > 0) {
//             this.processDivorceRequests(response.data);
//           } else {
//             this.divorceRequests = [];
//           }
//           this.loading = false;
//         },
//         error: (error) => {
//           console.error('Error fetching divorce requests:', error);
//           this.divorceRequests = [];
//           this.loading = false;
//         }
//       });
//   }

//   processMarriageRequests(requests: any[]): void {
//     this.marriageRequests = [];
    
//     requests.forEach(request => {
//       // Determine if current user is husband or wife
//       const isHusband = this.memberId === request.husband_id;
      
//       // Determine if current user is proposer based on marriage proposal type
//       const husbandProposed = request.proposal_type === 'husband_to_wife';
//       const isProposer = (isHusband && husbandProposed) || (!isHusband && !husbandProposed);
      
//       // Get the partner's ID
//       const partnerId = isHusband ? request.wife_id : request.husband_id;
      
//       // Fetch partner info
//       this.memberService.getMember(partnerId)
//         .subscribe({
//           next: (response) => {
//             if (response.data) {
//               this.marriageRequests.push({
//                 id: request.id,
//                 requestType: 'marriage',
//                 partner: response.data,
//                 isProposer: isProposer,
//                 message: isProposer ? 
//                   `You have sent a marriage request to ${response.data.first_name} ${response.data.last_name}.` :
//                   `${response.data.first_name} ${response.data.last_name} has requested to marry you.`,
//                 timestamp: request.created_at
//               });
              
//               // Sort requests by timestamp if available
//               this.marriageRequests.sort((a, b) => {
//                 if (a.timestamp && b.timestamp) {
//                   return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
//                 }
//                 return 0;
//               });
//             }
//           },
//           error: (error) => {
//             console.error('Error fetching partner info:', error);
//           }
//         });
//     });
//   }

//   processDivorceRequests(requests: any[]): void {
//     this.divorceRequests = [];
    
//     requests.forEach(request => {
//       // Determine if current user is initiator or recipient
//       const isInitiator = this.memberId === request.initiator_id;
      
//       // Get the partner's ID
//       const partnerId = isInitiator ? request.recipient_id : request.initiator_id;
      
//       // Fetch partner info
//       this.memberService.getMember(partnerId)
//         .subscribe({
//           next: (response) => {
//             if (response.data) {
//               this.divorceRequests.push({
//                 id: request.id,
//                 requestType: 'divorce',
//                 partner: response.data,
//                 isProposer: isInitiator,
//                 message: isInitiator ? 
//                   `You have requested a divorce from ${response.data.first_name} ${response.data.last_name}.` :
//                   `${response.data.first_name} ${response.data.last_name} has requested a divorce from you.`,
//                 timestamp: request.created_at
//               });
              
//               // Sort requests by timestamp if available
//               this.divorceRequests.sort((a, b) => {
//                 if (a.timestamp && b.timestamp) {
//                   return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
//                 }
//                 return 0;
//               });
//             }
//           },
//           error: (error) => {
//             console.error('Error fetching partner info:', error);
//           }
//         });
//     });
//   }

//   confirmMarriage(requestId: number): void {
//     this.loading = true;
    
//     // Find the request to get partner info
//     const request = this.marriageRequests.find(r => r.id === requestId);
//     if (!request) {
//       this.loading = false;
//       return;
//     }
    
//     this.memberService.confirmMarriage(requestId)
//       .subscribe({
//         next: (response) => {
//           this.loading = false;
          
//           if (response && response.success) {
//             // Remove the request from the list
//             this.marriageRequests = this.marriageRequests.filter(r => r.id !== requestId);
            
//             // Emit event for parent component
//             this.relationshipActionCompleted.emit({
//               action: 'marriage_confirmed',
//               request: request,
//               partner: request.partner
//             });
            
//             // If no more requests, close modal
//             if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
//               this.onCancel();
//             }
//           } else {
//             console.error('API returned success: false', response);
//           }
//         },
//         error: (error) => {
//           console.error('Error confirming marriage:', error);
//           this.loading = false;
//         }
//       });
//   }

//   rejectMarriage(requestId: number): void {
//     this.loading = true;
    
//     // Find the request to get partner info
//     const request = this.marriageRequests.find(r => r.id === requestId);
//     if (!request) {
//       this.loading = false;
//       return;
//     }
    
//     this.memberService.rejectMarriage(requestId)
//       .subscribe({
//         next: (response) => {
//           this.loading = false;
          
//           if (response && response.success) {
//             // Remove the request from the list
//             this.marriageRequests = this.marriageRequests.filter(r => r.id !== requestId);
            
//             // Emit event for parent component
//             this.relationshipActionCompleted.emit({
//               action: 'marriage_rejected',
//               request: request,
//               partner: request.partner
//             });
            
//             // If no more requests, close modal
//             if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
//               this.onCancel();
//             }
//           } else {
//             console.error('API returned success: false', response);
//           }
//         },
//         error: (error) => {
//           console.error('Error rejecting marriage:', error);
//           this.loading = false;
//         }
//       });
//   }

//   confirmDivorce(requestId: number): void {
//     this.loading = true;
    
//     // Find the request to get partner info
//     const request = this.divorceRequests.find(r => r.id === requestId);
//     if (!request) {
//       this.loading = false;
//       return;
//     }
    
//     this.memberService.confirmDivorce(requestId)
//       .subscribe({
//         next: (response) => {
//           this.loading = false;
          
//           if (response && response.success) {
//             // Remove the request from the list
//             this.divorceRequests = this.divorceRequests.filter(r => r.id !== requestId);
            
//             // Emit event for parent component
//             this.relationshipActionCompleted.emit({
//               action: 'divorce_confirmed',
//               request: request,
//               partner: request.partner
//             });
            
//             // If no more requests, close modal
//             if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
//               this.onCancel();
//             }
//           } else {
//             console.error('API returned success: false', response);
//           }
//         },
//         error: (error) => {
//           console.error('Error confirming divorce:', error);
//           this.loading = false;
//         }
//       });
//   }

//   rejectDivorce(requestId: number): void {
//     this.loading = true;
    
//     // Find the request to get partner info
//     const request = this.divorceRequests.find(r => r.id === requestId);
//     if (!request) {
//       this.loading = false;
//       return;
//     }
    
//     this.memberService.rejectDivorce(requestId)
//       .subscribe({
//         next: (response) => {
//           this.loading = false;
          
//           if (response && response.success) {
//             // Remove the request from the list
//             this.divorceRequests = this.divorceRequests.filter(r => r.id !== requestId);
            
//             // Emit event for parent component
//             this.relationshipActionCompleted.emit({
//               action: 'divorce_rejected',
//               request: request,
//               partner: request.partner
//             });
            
//             // If no more requests, close modal
//             if (this.marriageRequests.length === 0 && this.divorceRequests.length === 0) {
//               this.onCancel();
//             }
//           } else {
//             console.error('API returned success: false', response);
//           }
//         },
//         error: (error) => {
//           console.error('Error rejecting divorce:', error);
//           this.loading = false;
//         }
//       });
//   }

//   onCancel(): void {
//     this.modalClosed.emit();
//   }
// }