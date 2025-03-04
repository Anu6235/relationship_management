// import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { Member, MarriageRequest } from '../../../core/models/member';
// import { AuthService } from '../../../core/services/auth.service';
// import { MemberService } from '../../../core/services/member.service';

// @Component({
//   selector: 'app-relationship-request-modal',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './relationship-request-modal.component.html',
//   styleUrl: './relationship-request-modal.component.css'
// })
// export class RelationshipRequestModalComponent implements OnInit {
//   @Input() isVisible = false;
//   @Input() currentMember: Member | null = null;
//   @Output() requestProcessed = new EventEmitter<void>();
//   @Output() cancelModal = new EventEmitter<void>();

//   pendingMarriageRequests: MarriageRequest[] = [];
//   outgoingMarriageRequests: MarriageRequest[] = [];
//   isLoading = false;
//   processingRequest = false;
//   errorMessage = '';

//   constructor(
//     private memberService: MemberService,
//     private authService: AuthService
//   ) {}

//   ngOnInit(): void {
//     this.loadMarriageRequests();
//   }

//   /**
//    * Load all pending marriage requests for the current member
//    */
//   loadMarriageRequests(): void {
//     if (!this.currentMember?.id) return;
    
//     this.isLoading = true;
//     this.memberService.getPendingMarriageRequests(this.currentMember.id).subscribe({
//       next: (response) => {
//         if (response.success) {
//           // Filter marriage requests into incoming and outgoing
//           this.pendingMarriageRequests = response.data.filter((req: MarriageRequest) => 
//             req.requestee_id === this.currentMember?.id && req.status === 'pending'
//           );
          
//           this.outgoingMarriageRequests = response.data.filter((req: MarriageRequest) => 
//             req.request_id === this.currentMember?.id && req.status === 'pending'
//           );
//         }
//         this.isLoading = false;
//       },
//       error: (error) => {
//         this.errorMessage = error.message || 'Failed to load marriage requests';
//         this.isLoading = false;
//       }
//     });
//   }

//   /**
//    * Accept a marriage request
//    * @param request The marriage request to accept
//    */
//   acceptMarriageRequest(request: MarriageRequest): void {
//     if (!this.currentMember?.id) return;
    
//     this.processingRequest = true;
//     this.memberService.confirmMarriage(request.id, this.currentMember.id).subscribe({
//       next: (response) => {
//         if (response.success) {
//           // Remove the processed request from the list
//           this.pendingMarriageRequests = this.pendingMarriageRequests.filter(req => req.id !== request.id);
          
//           // Check if there are no more requests to process
//           if (this.pendingMarriageRequests.length === 0 && this.outgoingMarriageRequests.length === 0) {
//             this.closeModal();
//           }
          
//           this.requestProcessed.emit();
//         }
//         this.processingRequest = false;
//       },
//       error: (error) => {
//         this.errorMessage = error.message || 'Failed to accept marriage request';
//         this.processingRequest = false;
//       }
//     });
//   }

//   /**
//    * Decline a marriage request
//    * @param request The marriage request to decline
//    */
//   declineMarriageRequest(request: MarriageRequest): void {
//     if (!this.currentMember?.id) return;
    
//     this.processingRequest = true;
//     this.memberService.declineMarriage(request.id, this.currentMember.id).subscribe({
//       next: (response) => {
//         if (response.success) {
//           // Remove the processed request from the list
//           this.pendingMarriageRequests = this.pendingMarriageRequests.filter(req => req.id !== request.id);
          
//           // Check if there are no more requests to process
//           if (this.pendingMarriageRequests.length === 0 && this.outgoingMarriageRequests.length === 0) {
//             this.closeModal();
//           }
          
//           this.requestProcessed.emit();
//         }
//         this.processingRequest = false;
//       },
//       error: (error) => {
//         this.errorMessage = error.message || 'Failed to decline marriage request';
//         this.processingRequest = false;
//       }
//     });
//   }

//   /**
//    * Close the modal
//    */
//   closeModal(): void {
//     this.isVisible = false;
//     this.cancelModal.emit();
//   }

//   /**
//    * Get formatted date string
//    * @param date Date to format
//    * @returns Formatted date string
//    */
//   formatDate(date: Date | string): string {
//     if (!date) return '';
//     return new Date(date).toLocaleDateString();
//   }

//   /**
//    * Check if there are no requests at all
//    */
//   get hasNoRequests(): boolean {
//     return this.pendingMarriageRequests.length === 0 && this.outgoingMarriageRequests.length === 0;
//   }
// }