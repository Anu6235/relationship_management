// import { CommonModule } from '@angular/common';
// import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
// import { MarriageRequest } from '../../../core/models/member';
// import { MemberService } from '../../../core/services/member.service';

// @Component({
//   selector: 'app-marriage-request-modal',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './marriage-request-modal.component.html',
//   styleUrl: './marriage-request-modal.component.css'
// })
// export class MarriageRequestModalComponent implements OnInit{
//   @Input() isVisible = false;
//   @Input() memberId!: number;
//   @Output() modalClosed = new EventEmitter<void>();
//   @Output() requestProcessed = new EventEmitter<{accepted: boolean, request: MarriageRequest}>();
 
//   pendingRequests: MarriageRequest[] = [];
//   loading = false;
//   error = '';

//   constructor(private memberService: MemberService) {}

//   ngOnInit(): void {
//     this.loadPendingRequests();
//   }

//   loadPendingRequests():void {
//     if (!this.memberId) return;

//     this.loading = true;
//     this.memberService.getPendingMarriageRequests(this.memberId).subscribe({
//       next: (response) => {
//         this.pendingRequests = response.data || [];
//         this.loading = false;
//       },
//       error: (err) => {
//         this.error = 'Failed to load marriage requests';
//         this.loading = false;
//         console.error(err);
//       }
//     });
//   }

//   respondToRequest(requestId: number, accept: boolean): void {
//     this.loading = true;
//     const request = this.pendingRequests.find(r => r.id === requestId);
    
//     this.memberService.respondToMarriageRequest(requestId, accept).subscribe({
//       next: () => {
//         this.loading = false;
//         if (request) {
//           this.requestProcessed.emit({ accepted: accept, request });
//         }
//         this.loadPendingRequests(); // Refresh the list
//       },
//       error: (err) => {
//         this.error = 'Failed to process marriage request';
//         this.loading = false;
//         console.error(err);
//       }
//     });
//   }

//   close(): void {
//     this.modalClosed.emit();
//   }

//   getRequesterName(request: MarriageRequest): string {
//     return request.requester 
//       ? `${request.requester.first_name} ${request.requester.last_name}`
//       : 'Unknown Member';
//   }
// }
