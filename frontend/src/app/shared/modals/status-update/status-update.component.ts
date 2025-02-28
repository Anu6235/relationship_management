// import { Component, Input, Output, EventEmitter } from '@angular/core';
// import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { DeathData, Member } from '../../../core/models/member';
// import { MemberService } from '../../../core/services/member.service';
// import { CommonModule } from '@angular/common';


// @Component({
//   selector: 'app-status-update',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   template: `
//     <div class="border rounded-lg shadow-sm p-4 mt-4" *ngIf="isEditing">
//       <h3 class="text-lg font-medium mb-4">Update Marriage Status</h3>
      
//       <form [formGroup]="statusForm" class="space-y-4">
//         <div class="form-group">
//           <label class="block text-sm font-medium mb-1">Current Status: {{ member.marital_status }}</label>
//           <select formControlName="status" class="w-full p-2 border rounded">
//             <option value="Divorced">Divorced</option>
//             <option value="Widowed">Widowed</option>
//           </select>
//         </div>

//         <div class="form-group">
//           <label class="block text-sm font-medium mb-1">
//             {{statusForm.get('status')?.value === 'Divorced' ? 'Divorce Date' : 'Death Date'}}
//           </label>
//           <input 
//             type="date" 
//             formControlName="date" 
//             class="w-full p-2 border rounded"
//             [max]="today">
//         </div>

//         <div *ngIf="statusForm.get('status')?.value === 'Widowed'" class="form-group">
//           <label class="block text-sm font-medium mb-1">Deceased Spouse</label>
//           <select formControlName="deceased_member_id" class="w-full p-2 border rounded">
//             <option [value]="member.id">{{member.first_name}} {{member.last_name}}</option>
//             <option [value]="member.spouse_id">{{spouseName}}</option>
//           </select>
//         </div>

//         <div class="mt-2 text-sm text-red-600" *ngIf="errorMessage">
//           {{ errorMessage }}
//         </div>

//         <div class="flex justify-end space-x-2 mt-4">
//           <button 
//             type="button"
//             class="px-4 py-2 text-gray-600 hover:text-gray-800"
//             (click)="cancelEdit()">
//             Cancel
//           </button>
//           <button 
//             type="submit"
//             class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
//             [disabled]="!statusForm.valid || isSubmitting"
//             (click)="updateStatus()">
//             {{ isSubmitting ? 'Updating...' : 'Update' }}
//           </button>
//         </div>
//       </form>
//     </div>

//     <button 
//       *ngIf="!isEditing && member.marital_status === 'Married'"
//       (click)="startEdit()"
//       class="text-blue-600 hover:text-blue-800 underline">
//       Update Marriage Status
//     </button>
//   `
// })
// export class StatusUpdateComponent {
//   @Input() member!: Member;
//   @Input() spouse?: Member | null;
//   @Output() statusUpdated = new EventEmitter<void>();
  
//   isEditing = false;
//   isSubmitting = false;
//   errorMessage = '';
//   statusForm: FormGroup;
//   today = new Date().toISOString().split('T')[0];

//   get spouseName(): string {
//     return this.spouse ? `${this.spouse.first_name} ${this.spouse.last_name}` : 'Loading...';
//   }

//   constructor(
//     private memberService: MemberService,
//     private fb: FormBuilder
//   ) {
//     this.statusForm = this.fb.group({
//       status: ['', Validators.required],
//       date: ['', Validators.required],
//       deceased_member_id: ['']
//     });

//     this.statusForm.get('status')?.valueChanges.subscribe(status => {
//       const deceasedControl = this.statusForm.get('deceased_member_id');
//       if (status === 'Widowed') {
//         deceasedControl?.setValidators(Validators.required);
//       } else {
//         deceasedControl?.clearValidators();
//       }
//       deceasedControl?.updateValueAndValidity();
//     });
//   }

//   startEdit() {
//     if (!this.member.marriage_date) {
//       this.errorMessage = 'Marriage date not found';
//       return;
//     }
//     this.isEditing = true;
//     this.errorMessage = '';
//   }

//   cancelEdit() {
//     this.isEditing = false;
//     this.statusForm.reset();
//     this.errorMessage = '';
//   }

//   updateStatus() {
//     if (this.statusForm.valid && !this.isSubmitting) {
//       this.isSubmitting = true;
//       this.errorMessage = '';
      
//       const formValue = this.statusForm.value;
//       const marriageId = this.member.id!; // Assuming member.id is the marriage_id in this context

//       const request = formValue.status === 'Divorced' 
//         ? this.memberService.recoredDivorce(marriageId, new Date(formValue.date))
//         : this.memberService.recordDeath(marriageId, {
//             deceased_member_id: Number(formValue.deceased_member_id),
//             death_date: new Date(formValue.date)
//           } as DeathData);

//       request.subscribe({
//         next: () => {
//           this.statusUpdated.emit();
//           this.isEditing = false;
//           this.statusForm.reset();
//           this.isSubmitting = false;
//         },
//         error: (error) => {
//           console.error(`Error recording ${formValue.status}:`, error);
//           this.errorMessage = `Failed to update status. ${error.message || 'Please try again.'}`;
//           this.isSubmitting = false;
//         }
//       });
//     }
//   }
// }