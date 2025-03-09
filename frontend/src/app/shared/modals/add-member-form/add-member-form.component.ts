// import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
// import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { HttpErrorResponse } from '@angular/common/http';
// import { MemberService } from '../../../core/services/member.service';
// import { CommonModule } from '@angular/common';
// import { Member, MarriageData } from '../../../core/models/member';

// @Component({
//   selector: 'app-add-member-form',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule],
//   templateUrl: './add-member-form.component.html',
//   styleUrl: './add-member-form.component.css'
// })
// export class AddMemberFormComponent implements OnInit {
//   @Input() isVisible = false;
//   @Output() memberAdded = new EventEmitter<any>();
//   @Output() cancelAdd = new EventEmitter<void>();

//   memberForm: FormGroup;
//   selectedImage: File | null = null;
//   imagePreview: string | ArrayBuffer | null = null;
//   potentialSpouses: Member[] = [];
//   showSpouseSelection: boolean = false;
//   formSubmitting: boolean = false;
//   errorMessage: string = '';
//   marriageDate: Date | null = null;
//   deceasedSpouses: Member[] = [];
//   showMarriageDatePicker: boolean = false;
//   currentUserId: number = 1; // This should be retrieved from your auth service
  

//   genderOptions = [
//     { value: 'male', label: 'Male' },
//     { value: 'female', label: 'Female' }
//   ];

//   maritalStatusOptions = [
//     { value: 'Single', label: 'Single' },
//     { value: 'Married', label: 'Married' },
//     { value: 'Divorced', label: 'Divorced' },
//     { value: 'Widowed', label: 'Widowed' }
//   ];

//   statusOptions = [
//     { value: 'Active', label: 'Active' },
//     { value: 'Inactive', label: 'Inactive' }
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
//       created_at: [new Date()],
//       updated_at: [new Date()]
//     });

// // Watch for changes in marital status
// this.memberForm.get('marital_status')?.valueChanges.subscribe(value => {
//   const lowercaseValue = value?.toLowerCase();

//   this.memberForm.patchValue({
//     spouse_id: null,
//     marriage_date: null,
//     divorce_date: null,
//     deceased_spouse_id: null
//   });
  
//   this.showSpouseSelection = false;
//   this.showMarriageDatePicker = false;
  
//   if (lowercaseValue === 'married' || lowercaseValue === 'divorced' || lowercaseValue === 'widowed') {
//     this.showSpouseSelection = true;
//     this.showMarriageDatePicker = true;
//     // Let onSpouseSelected handle loading the appropriate list
//     this.onSpouseSelected();
//   }
// });
//   }

//   ngOnInit(): void {
//     // If you need to load any initial data from user service
//     // this.currentUserId = this.authService.getCurrentUser().id;
//   }

//   onSubmit(): void {
//     if (this.memberForm.invalid) return;
    
//     // Prevent double submission
//     if (this.formSubmitting) return;
//     this.formSubmitting = true;
//     this.errorMessage = '';
    
//     const formValues = this.memberForm.value;
//     const spouseId = formValues.spouse_id;
//     const maritalStatus = formValues.marital_status?.toLowerCase();
    
//     // Ensure proper date formatting
//     formValues.dob = formValues.dob ? new Date(formValues.dob).toISOString().split('T')[0] : null;
//     formValues.marriage_date = formValues.marriage_date ? new Date(formValues.marriage_date).toISOString().split('T')[0] : null;
//     formValues.divorce_date = formValues.divorce_date ? new Date(formValues.divorce_date).toISOString().split('T')[0] : null;
//     formValues.verified_at = formValues.verified_at ? new Date(formValues.verified_at).toISOString() : null;
//     formValues.created_at = new Date().toISOString();
//     formValues.updated_at = new Date().toISOString();
  
//     // Ensure boolean values are properly formatted
//     formValues.is_verified = Boolean(formValues.is_verified);
//     formValues.deceased = Boolean(formValues.deceased);
    
//     // Validate widowed status
//     if (maritalStatus === 'widowed' && spouseId) {
//       // Check if selected spouse is actually deceased
//       const selectedSpouse = this.deceasedSpouses.find(spouse => spouse.id === spouseId);
//       if (!selectedSpouse) {
//         this.errorMessage = 'To record as widowed, you must select a deceased spouse.';
//         this.formSubmitting = false;
//         return;
//       }
//     }
    
//     // Create the member
//     this.memberService.createMember(formValues, this.selectedImage).subscribe({
//       next: (response) => {
//         const newMemberId = response.data.id;
        
//         // Handle relationships based on marital status
//         if (response.success && spouseId) {
//           const gender = formValues.gender;
//           const marriageDate = formValues.marriage_date || new Date().toISOString().split('T')[0];
          
//           if (maritalStatus === 'married') {
//             // Determine husband_id and wife_id based on gender
//             const husbandId = gender === 'male' ? newMemberId : spouseId;
//             const wifeId = gender === 'female' ? newMemberId : spouseId;
            
//             // Create the marriage request - Set the requested_by as the newly created member ID
//             this.createMarriageRequest(husbandId, wifeId, marriageDate, newMemberId);
//           } 
//           else if (maritalStatus === 'divorced') {
//             // Determine husband_id and wife_id based on gender
//             const husbandId = gender === 'male' ? newMemberId : spouseId;
//             const wifeId = gender === 'female' ? newMemberId : spouseId;
            
//             const divorceDate = formValues.divorce_date || new Date().toISOString().split('T')[0];
            
//             // Create the divorce request - Set the requested_by as the newly created member ID
//             this.createDivorceRequest(husbandId, wifeId, marriageDate, divorceDate, newMemberId);
//           }
//           else if (maritalStatus === 'widowed') {
//             // Widowed status is handled by selecting a deceased spouse
//             // Just emit the created member as no further action is needed
//             this.memberAdded.emit(response.data);
//             this.resetForm();
//           }
//         } else {
//           // If no relationship to create, just emit the added member
//           this.memberAdded.emit(response.data);
//           this.resetForm();
//         }
//         this.formSubmitting = false;
//       },
//       error: (error) => {
//         // Error handling
//         this.formSubmitting = false;
//         console.error('Error creating member:', error);
//         this.errorMessage = 'Failed to create member. Please try again.';
        
//         // Show more specific error if available
//         if (error instanceof HttpErrorResponse) {
//           if (error.error && error.error.message) {
//             this.errorMessage = error.error.message;
//           } else if (error.status === 0) {
//             this.errorMessage = 'Server is unreachable. Please check your connection.';
//           } else if (error.status === 400) {
//             this.errorMessage = 'Invalid data provided. Please check your form.';
//           } else if (error.status === 409) {
//             this.errorMessage = 'This member information conflicts with an existing record.';
//           }
//         }
//       }
//     });
//   }

//   onCancel(): void {
//     this.resetForm();
//     this.cancelAdd.emit();
//     this.isVisible = false;
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

//   loadPotentialSpouses(): void {
//     const gender = this.memberForm.get('gender')?.value;
//     if (!gender) return;
    
//     const oppositeGender = gender === 'male' ? 'female' : 'male';
//     this.memberService.getUnmarriedMembersByGender(oppositeGender).subscribe({
//       next: (response) => {
//         this.potentialSpouses = response.data || [];
//         console.log('Potential spouses with mobile numbers:', 
//           this.potentialSpouses.map(s => ({
//             name: `${s.first_name} ${s.last_name}`,
//             mobile: s.mobile_number,
//             mobileType: typeof s.mobile_number
//           }))
//         );
//       },
//       error: (error) => {
//         console.error('Error loading potential spouses:', error);
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
//       },
//       error: (error) => {
//         console.error('Error loading deceased spouses:', error);
//       }
//     });
//   }

//   onImageSelected(event: Event): void {
//     const input = event.target as HTMLInputElement;
//     if (input.files && input.files.length) {
//       this.selectedImage = input.files[0];

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
//   }
  
//   onSpouseSelected(): void {
//     const gender = this.memberForm.get('gender')?.value;
    
//     // Check if gender is selected
//     if (!gender) {
//       this.errorMessage = 'Please select a gender first';
//       // Clear spouse selection
//       this.memberForm.patchValue({
//         spouse_id: null
//       });
//       this.potentialSpouses = [];
//       return;
//     }
    
//     // Reset error message if gender is selected
//     this.errorMessage = '';
    
//     // Determine opposite gender
//     const oppositeGender = gender === 'male' ? 'female' : 'male';
    
//     // Get marital status
//     const maritalStatus = this.memberForm.get('marital_status')?.value?.toLowerCase();
    
//     // Load appropriate members based on marital status
//     if (maritalStatus === 'widowed') {
//       this.memberService.getDeceasedMembersByGender(oppositeGender).subscribe({
//         next: (response) => {
//           this.deceasedSpouses = response.data || [];
//         },
//         error: (error) => {
//           console.error('Error loading deceased spouses:', error);
//           this.errorMessage = 'Failed to load deceased members';
//         }
//       });
//     } else {
//       // For married or divorced status, load all members of opposite gender
//       this.memberService.getMembers(oppositeGender).subscribe({
//         next: (response) => {
//           this.potentialSpouses = response.data || [];
//         },
//         error: (error) => {
//           console.error('Error loading potential spouses:', error);
//           this.errorMessage = 'Failed to load potential spouses';
//         }
//       });
//     }
//   }

//   createMarriageRequest(husbandId: number, wifeId: number, marriageDate: string, requestedBy: number): void {
//     const marriageData: MarriageData = {
//       husband_id: husbandId,
//       wife_id: wifeId,
//       marriage_date: new Date(marriageDate),
//       requested_by: requestedBy
//     };
    
//     this.memberService.createMarriageRequest(marriageData).subscribe({
//       next: (response) => {
//         this.memberAdded.emit(response.data);
//         this.resetForm();
//       },
//       error: (error) => {
//         console.error('Error creating marriage request:', error);
//         this.formSubmitting = false;
//         this.errorMessage = 'Failed to create marriage relationship. The member was added but marriage information could not be saved.';
//       }
//     });
//   }

//   createDivorceRequest(husbandId: number, wifeId: number, marriageDate: string, divorceDate: string, requestedBy: number): void {
//     // First create a marriage record
//     const marriageData: MarriageData = {
//       husband_id: husbandId,
//       wife_id: wifeId,
//       marriage_date: new Date(marriageDate),
//       requested_by: requestedBy  // Use the parameter instead of this.currentUserId
//     };
    
//     this.memberService.createMarriageRequest(marriageData).subscribe({
//       next: (marriageResponse) => {
//         // Then create a divorce record
//         const divorceData = {
//           husband_id: husbandId,
//           wife_id: wifeId,
//           divorce_date: new Date(divorceDate),
//           requested_by: requestedBy  // Use the parameter instead of this.currentUserId
//         };
        
//         this.memberService.createDivorceRequest(divorceData).subscribe({
//           next: (divorceResponse) => {
//             this.memberAdded.emit(divorceResponse.data);
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

//   resetForm(): void {
//     this.memberForm.reset({
//       status: 'Active',
//       deceased: false,
//       marital_status: '',
//       is_verified: false
//     });
//     this.clearImage();
//     this.errorMessage = '';
//     this.formSubmitting = false;
//     this.showSpouseSelection = false;
//   }
// }