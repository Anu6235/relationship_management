// import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
// import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { HttpErrorResponse } from '@angular/common/http';
// import { MemberService } from '../../../core/services/member.service';
// import { CommonModule } from '@angular/common';
// import { Member, MarriageData } from '../../../core/models/member';

// @Component({
//   selector: 'app-edit-member-form',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './edit-member-form.component.html',
//   styleUrls: ['./edit-member-form.component.css']
// })
// export class EditMemberFormComponent implements OnInit {
//   @Input() isVisible = false;
//   @Input() set member(value: Member | null) {
//     if (value) {
//       this._member = value;
//       this.patchFormValues();

//       if (value.profile_image_url) {
//         this.imagePreview = value.profile_image_url;
//       }
      
//       // Check if member is married and load spouse selection accordingly
//       if (value.marital_status?.toLowerCase() === 'married') {
//         this.showSpouseSelection = true;
//         this.showMarriageDatePicker = true;
//         this.loadPotentialSpouses();
//       } else if (value.marital_status?.toLowerCase() === 'divorced') {
//         this.showSpouseSelection = true;
//         this.showMarriageDatePicker = true;
//         this.loadPotentialSpouses();
//       } else if (value.marital_status?.toLowerCase() === 'widowed') {
//         this.showSpouseSelection = true;
//         this.showMarriageDatePicker = true;
//         this.loadDeceasedSpouses();
//       }
//     }
//   }

//   get member(): Member | null {
//     return this._member;
//   }

//   @Output() memberEdited = new EventEmitter<any>();
//   @Output() cancelEdit = new EventEmitter<void>();

//   private _member: Member | null = null;
//   memberForm: FormGroup;
//   selectedImage: File | null = null;
//   imagePreview: string | ArrayBuffer | null = null;
//   removeExistingImage: boolean = false;
//   potentialSpouses: Member[] = [];
//   deceasedSpouses: Member[] = [];
//   showSpouseSelection: boolean = false;
//   showMarriageDatePicker: boolean = false;
//   errorMessage: string = '';
//   formSubmitting: boolean = false;
//   currentUserId: number = 1; // This should be retrieved from your auth service

//   genderOptions = [
//     { value: 'male', label: 'Male' },
//     { value: 'female', label: 'Female' }
//   ];

//   statusOptions = [
//     { value: 'Active', label: 'Active' },
//     { value: 'Inactive', label: 'Inactive' }
//   ];

//   maritalStatusOptions = [
//     { value: 'Single', label: 'Single' },
//     { value: 'Married', label: 'Married' },
//     { value: 'Divorced', label: 'Divorced' },
//     { value: 'Widowed', label: 'Widowed' }
//   ];

//   constructor(
//     private fb: FormBuilder,
//     private memberService: MemberService,
//   ) {
//     this.memberForm = this.fb.group({
//       first_name: ['', Validators.required],
//       last_name: ['', Validators.required],
//       dob: ['', Validators.required],
//       gender: ['', Validators.required],
//       mobile_number: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
//       email: ['', [Validators.required, Validators.email]],
//       aadhar_number: ['', [Validators.required, Validators.pattern('^[0-9]{12}$')]],
//       address: ['', Validators.required],
//       is_verified: [false],
//       verified_at: [null],
//       verified_by: [null],
//       status: ['Active', Validators.required],
//       deceased: [false],
//       marital_status: ['', Validators.required],
//       spouse_id: [null],
//       marriage_date: [null],
//       divorce_date: [null],
//       deceased_spouse_id: [null],
//       updated_at: [new Date()]
//     });

//     // Watch for changes in marital status
//     this.memberForm.get('marital_status')?.valueChanges.subscribe(value => {
//       const lowercaseValue = value?.toLowerCase();

//       this.memberForm.patchValue({
//         spouse_id: null,
//         marriage_date: null,
//         divorce_date: null,
//         deceased_spouse_id: null
//       });
      
//       this.showSpouseSelection = false;
//       this.showMarriageDatePicker = false;
      
//       if (lowercaseValue === 'married') {
//         this.showSpouseSelection = true;
//         this.showMarriageDatePicker = true;
//         this.loadPotentialSpouses();
//       } else if (lowercaseValue === 'divorced') {
//         this.showSpouseSelection = true;
//         this.showMarriageDatePicker = true;
//         this.loadPotentialSpouses();
//       } else if (lowercaseValue === 'widowed') {
//         this.showSpouseSelection = true;
//         this.showMarriageDatePicker = true;
//         this.loadDeceasedSpouses();
//       }
//     });

//     // Listen for changes to gender to reload potential spouses
//     this.memberForm.get('gender')?.valueChanges.subscribe(value => {
//       if (value) {
//         const maritalStatus = this.memberForm.get('marital_status')?.value?.toLowerCase();
//         if (maritalStatus === 'married' || maritalStatus === 'divorced') {
//           this.loadPotentialSpouses();
//         } else if (maritalStatus === 'widowed') {
//           this.loadDeceasedSpouses();
//         }
//       }
//     });
//   }

//   ngOnInit(): void {
//     // If you need to load any initial data from user service
//     // this.currentUserId = this.authService.getCurrentUser().id;
//   }

//   private patchFormValues(): void {
//     if (this.member) {
//       const maritalStatusOption = this.maritalStatusOptions.find(
//         option => option.value.toLowerCase() === this.member!.marital_status?.toLowerCase()
//       );
  
//       const formValues = {
//         ...this.member,
//         dob: this.formatDateForInput(this.member.dob),
//         verified_at: this.member.verified_at ? this.formatDateForInput(this.member.verified_at) : null,
//         deceased: this.member.deceased ? true : false,
//         gender: this.member.gender,
//         status: this.member.status,
//         marital_status: maritalStatusOption ? maritalStatusOption.value : '',
//         spouse_id: this.member.spouse_id || null,
//         marriage_date: this.member.marriage_date ? this.formatDateForInput(this.member.marriage_date) : null,
//         divorce_date: this.member.divorce_date ? this.formatDateForInput(this.member.divorce_date) : null,
//         deceased_spouse_id: this.member.deceased_spouse_id || null
//       };
      
//       console.log('Patching form values:', formValues);
//       this.memberForm.patchValue(formValues);
//     }
//   }

//   private formatDateForInput(date: Date | string | null): string {
//     if (!date) return '';
//     const d = new Date(date);
//     return d.toISOString().split('T')[0];
//   }

//   loadPotentialSpouses(): void {
//     const gender = this.memberForm.get('gender')?.value;
//     if (!gender) return;
    
//     // Get potential spouses of opposite gender
//     const oppositeGender = gender === 'male' ? 'female' : 'male';
    
//     // Using the correct method from MemberService
//     this.memberService.getUnmarriedMembersByGender(oppositeGender).subscribe({
//       next: (response) => {
//         // Get the list of potential spouses
//         this.potentialSpouses = response.data || [];
        
//         // If the member already has a spouse, add that spouse to the list to allow keeping the same spouse
//         if (this.member?.spouse_id) {
//           this.memberService.getMember(this.member.spouse_id).subscribe({
//             next: (spouseResponse) => {
//               if (spouseResponse.data) {
//                 // Check if the spouse is already in the list (shouldn't be, but just in case)
//                 const existingSpouse = this.potentialSpouses.find(s => s.id === spouseResponse.data.id);
//                 if (!existingSpouse) {
//                   this.potentialSpouses.unshift(spouseResponse.data);
//                 }
//               }
//             },
//             error: (error) => {
//               console.error('Error loading existing spouse:', error);
//               this.errorMessage = 'Failed to load existing spouse information.';
//             }
//           });
//         }
//       },
//       error: (error) => {
//         console.error('Error loading potential spouses:', error);
//         this.errorMessage = 'Failed to load potential spouses. Please try again.';
//       }
//     });
//   }

//   loadDeceasedSpouses(): void {
//     const gender = this.memberForm.get('gender')?.value;
//     if (!gender) return;
    
//     // Get deceased spouses of opposite gender
//     const oppositeGender = gender === 'male' ? 'female' : 'male';
//     this.memberService.getDeceasedMembersByGender(oppositeGender).subscribe({
//       next: (response) => {
//         this.deceasedSpouses = response.data || [];
        
//         // If the member already has a deceased spouse, add it to the list
//         if (this.member?.deceased_spouse_id) {
//           this.memberService.getMember(this.member.deceased_spouse_id).subscribe({
//             next: (spouseResponse) => {
//               if (spouseResponse.data) {
//                 const existingDeceased = this.deceasedSpouses.find(s => s.id === spouseResponse.data.id);
//                 if (!existingDeceased) {
//                   this.deceasedSpouses.unshift(spouseResponse.data);
//                 }
//               }
//             },
//             error: (error) => {
//               console.error('Error loading existing deceased spouse:', error);
//             }
//           });
//         }
//       },
//       error: (error) => {
//         console.error('Error loading deceased spouses:', error);
//         this.errorMessage = 'Failed to load deceased spouses. Please try again.';
//       }
//     });
//   }

//   onImageSelected(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     if (input.files && input.files.length) {
//       this.selectedImage = input.files[0];
//       this.removeExistingImage = false;

//       // Preview image
//       const reader = new FileReader();
//       reader.onload = () => {
//         this.imagePreview = reader.result;
//       };
//       reader.readAsDataURL(this.selectedImage);
//     }
//   }

//   clearImage(): void {
//     this.selectedImage = null;
//     this.imagePreview = null;

//     // Set flag to remove existing image when updating
//     if (this.member?.profile_image) {
//       this.removeExistingImage = true;
//     }
//   }

//   onSubmit(): void {
//     if (this.memberForm.invalid || !this.member?.id) return;
    
//     // Prevent double submission
//     if (this.formSubmitting) return;
//     this.formSubmitting = true;
//     this.errorMessage = '';
    
//     const formValues = this.memberForm.value;
//     const oldSpouseId = this.member.spouse_id;
//     const newSpouseId = formValues.spouse_id;
//     const maritalStatus = formValues.marital_status?.toLowerCase();
    
//     // Format dates properly
//     const updatedMember = {
//       ...formValues,
//       id: this.member.id,
//       dob: new Date(formValues.dob),
//       verified_at: formValues.verified_at ? new Date(formValues.verified_at) : null,
//       marriage_date: formValues.marriage_date ? new Date(formValues.marriage_date) : null,
//       divorce_date: formValues.divorce_date ? new Date(formValues.divorce_date) : null,
//       deceased: Boolean(formValues.deceased),
//       updated_at: new Date()
//     };
  
//     this.memberService.updateMember(
//       this.member.id,
//       updatedMember,
//       this.selectedImage,
//       this.removeExistingImage
//     ).subscribe({
//       next: (response) => {
//         // Handle relationship updates based on marital status
//         if (maritalStatus === 'married' && newSpouseId && (newSpouseId !== oldSpouseId)) {
//           // If the spouse has changed, create a new marriage
//           const gender = formValues.gender;
//           const marriageDate = formValues.marriage_date || new Date().toISOString().split('T')[0];
          
//           // Determine husband_id and wife_id based on gender
//           const husbandId = gender === 'male' ? this.member!.id : newSpouseId;
//           const wifeId = gender === 'female' ? this.member!.id : newSpouseId;
          
//           // Create a new marriage request
//           const marriageData: MarriageData = {
//             husband_id: husbandId,
//             wife_id: wifeId,
//             marriage_date: new Date(marriageDate),
//             requested_by: this.currentUserId // Set requested_by to the current user ID
//           };
          
//           this.createMarriageRequest(marriageData);
//         } else if (maritalStatus === 'divorced' && newSpouseId) {
//           // Handle divorce case
//           const gender = formValues.gender;
//           const marriageDate = formValues.marriage_date || new Date().toISOString().split('T')[0];
//           const divorceDate = formValues.divorce_date || new Date().toISOString().split('T')[0];
          
//           // Determine husband_id and wife_id based on gender
//           const husbandId = gender === 'male' ? this.member!.id : newSpouseId;
//           const wifeId = gender === 'female' ? this.member!.id : newSpouseId;
          
//           // Create divorce record
//           this.createDivorceRequest(husbandId, wifeId, marriageDate, divorceDate, this.currentUserId); // Pass current user ID
//         } else if (maritalStatus === 'widowed' && formValues.deceased_spouse_id) {
//           // Widowed status is handled by selecting a deceased spouse
//           // Just emit the updated member as no further action is needed
//           this.memberEdited.emit(response.data);
//           this.resetForm();
//         } else {
//           // If no relationship changes, just emit the updated member
//           this.memberEdited.emit(response.data);
//           this.resetForm();
//         }
//         this.formSubmitting = false;
//       },
//       error: (error) => {
//         this.formSubmitting = false;
//         console.error('Error updating member:', error);
//         this.errorMessage = 'An error occurred while updating the member. Please try again.';
        
//         // Handle specific errors
//         if (error instanceof HttpErrorResponse) {
//           if (error.error && error.error.message) {
//             this.errorMessage = error.error.message;
//           } else if (error.error && error.error.errors && error.error.errors.length > 0) {
//             // Handle validation errors from the server
//             this.errorMessage = error.error.errors.map((err: any) => err.message).join(', ');
//           } else if (error.status === 0) {
//             this.errorMessage = 'Server is unreachable. Please check your connection.';
//           }
//         }
//       }
//     });
//   }

//   createMarriageRequest(marriageData: MarriageData): void {
//     this.memberService.createMarriageRequest(marriageData).subscribe({
//       next: (response) => {
//         this.memberEdited.emit(response.data);
//         this.resetForm();
//       },
//       error: (error) => {
//         console.error('Error creating marriage request:', error);
//         this.errorMessage = 'Failed to create marriage relationship. The member was updated but marriage information could not be saved.';
//         this.formSubmitting = false;
//       }
//     });
//   }

//   createDivorceRequest(husbandId: number, wifeId: number, marriageDate: string, divorceDate: string, requestedBy: number): void {
//     // First create a marriage record
//     const marriageData: MarriageData = {
//       husband_id: husbandId,
//       wife_id: wifeId,
//       marriage_date: new Date(marriageDate),
//       requested_by: requestedBy // Use the parameter instead of this.currentUserId
//     };
    
//     this.memberService.createMarriageRequest(marriageData).subscribe({
//       next: (marriageResponse) => {
//         // Then create a divorce record
//         const divorceData = {
//           husband_id: husbandId,
//           wife_id: wifeId,
//           divorce_date: new Date(divorceDate),
//           requested_by: requestedBy // Use the parameter instead of this.currentUserId
//         };
        
//         this.memberService.createDivorceRequest(divorceData).subscribe({
//           next: (divorceResponse) => {
//             this.memberEdited.emit(divorceResponse.data);
//             this.resetForm();
//           },
//           error: (error) => {
//             console.error('Error creating divorce record:', error);
//             this.formSubmitting = false;
//             this.errorMessage = 'Failed to record divorce information. The marriage was created but divorce could not be saved.';
//           }
//         });
//       },
//       error: (error) => {
//         console.error('Error creating marriage record for divorce:', error);
//         this.formSubmitting = false;
//         this.errorMessage = 'Failed to record marriage information for the divorced member.';
//       }
//     });
//   }

// resetForm(): void {
//   this.memberForm.reset({
//     status: 'Active',
//     deceased: false,
//     marital_status: '',
//     is_verified: false
//   });
//   this.selectedImage = null;
//   this.imagePreview = null;
//   this.removeExistingImage = false;
//   this.errorMessage = '';
//   this.formSubmitting = false;
//   this.showSpouseSelection = false;
//   this.showMarriageDatePicker = false;
//   this.isVisible = false;
// }

//   onCancel(): void {
//     this.resetForm();
//     this.cancelEdit.emit();
//   }

//   isFieldInvalid(fieldName: string): boolean {
//     const field = this.memberForm.get(fieldName);
//     return field ? field.invalid && (field.dirty || field.touched) : false;
//   }

//   validateNumberInput(event: KeyboardEvent) {
//     const charCode = event.which ? event.which : event.keyCode;
//     if (charCode < 48 || charCode > 57) {
//       event.preventDefault();
//     }
//   }

//   getErrorMessage(fieldName: string): string {
//     const control = this.memberForm.get(fieldName);
//     if (control?.errors) {
//       if (control.errors['required']) {
//         if (fieldName === 'first_name') return 'First name is required';
//         if (fieldName === 'last_name') return 'Last name is required';
//         if (fieldName === 'mobile_number') return 'Mobile number is required';
//         if (fieldName === 'aadhar_number') return 'Aadhar number is required';
//         return `${fieldName} is required`;
//       }
//       if (control.errors['email']) return 'Invalid email format';
//       if (control.errors['pattern']) {
//         if (fieldName === 'mobile_number') return 'Mobile number must be 10 digits';
//         if (fieldName === 'aadhar_number') return 'Aadhar number must be 12 digits';
//       }
//       if (control.errors['duplicate']) {
//         if (fieldName === 'mobile_number') return 'This mobile number is already in use';
//         if (fieldName === 'aadhar_number') return 'This Aadhar number is already in use';
//         if (fieldName === 'email') return 'This email is already in use';
//       }
//     }
//     return '';
//   }
// }