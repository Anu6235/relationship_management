import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MemberService } from '../../../core/services/member.service';
import { CommonModule } from '@angular/common';
import { Member } from '../../../core/models/member';

@Component({
  selector: 'app-add-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-member-form.component.html',
  styleUrl: './add-member-form.component.css'
})
export class AddMemberFormComponent implements OnInit {
  @Input() isVisible = false;
  @Output() memberAdded = new EventEmitter<any>();
  @Output() cancelAdd = new EventEmitter<void>();

  memberForm: FormGroup;
  selectedImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  potentialSpouses: Member[] = [];
  showSpouseSelection: boolean = false;
  formSubmitting: boolean = false;
  errorMessage: string = '';
  

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  maritalStatusOptions = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' }
  ];

  statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];
  

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
  ) {

    this.memberForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      mobile_number: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      email: ['', [Validators.required, Validators.email]],
      aadhar_number: ['', [Validators.required, Validators.pattern('^[0-9]{12}$')]],
      address: ['', Validators.required],
      is_verified: [false],
      verified_at: [null],
      verified_by: [null],
      status: ['Active', Validators.required],
      deceased: [false],
      marital_status: ['', Validators.required],
      spouse_id: [null],
      created_at: [new Date()],
      updated_at: [new Date()]
    });

    // Watch for changes in marital status
    this.memberForm.get('marital_status')?.valueChanges.subscribe(value => {
      // Make the comparison case-insensitive
      this.showSpouseSelection = value?.toLowerCase() === 'married';
      if (this.showSpouseSelection) {
        this.loadPotentialSpouses();
      } else {
        // Clear spouse_id if marital status is not 'Married'
        this.memberForm.get('spouse_id')?.setValue(null);
      }
    });

    // Listen for changes to gender to reload potential spouses
    this.memberForm.get('gender')?.valueChanges.subscribe(value => {
      if (value && this.memberForm.get('marital_status')?.value?.toLowerCase() === 'married') {
        this.loadPotentialSpouses();
      }
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.memberForm.invalid) return;
    
    // Prevent double submission
    if (this.formSubmitting) return;
    this.formSubmitting = true;
    this.errorMessage = '';
    
    const formValues = this.memberForm.value;
    const spouseId = formValues.spouse_id;
    
    // Ensure proper date formatting
    formValues.dob = formValues.dob ? new Date(formValues.dob).toISOString().split('T')[0] : null;
    formValues.verified_at = formValues.verified_at ? new Date(formValues.verified_at).toISOString() : null;
    formValues.created_at = new Date().toISOString();
    formValues.updated_at = new Date().toISOString();

    // Ensure boolean values are properly formatted (not strings)
    formValues.is_verified = Boolean(formValues.is_verified);
    formValues.deceased = Boolean(formValues.deceased);
    
    // Pass the form values and selected image directly to the service
    this.memberService.createMember(formValues, this.selectedImage).subscribe({
      next: (response) => {
        const newMemberId = response.data.id;
        
        // If member was added successfully and is married with a selected spouse
        if (response.success && spouseId && formValues.marital_status?.toLowerCase() === 'married') {
          const gender = formValues.gender;
          const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
          
          // Determine husband_id and wife_id based on gender
          const husbandId = gender === 'male' ? newMemberId : spouseId;
          const wifeId = gender === 'female' ? newMemberId : spouseId;
          
          // Create the marriage request
          this.createMarriageRequest(husbandId, wifeId, today);
        } else {
          // If no marriage to create, just emit the added member
          this.memberAdded.emit(response.data);
          this.resetForm();
        }
        this.formSubmitting = false;
      },
      error: (error) => {
        this.formSubmitting = false;
        console.error('Error creating member:', error);
        
        // Handle specific errors
        if (error.error && error.error.message) {
          this.errorMessage = error.error.message;
        } else if (error.error && error.error.errors && error.error.errors.length > 0) {
          // Handle validation errors from the server
          this.errorMessage = error.error.errors.map((err: any) => err.message).join(', ');
        } else {
          this.errorMessage = 'An error occurred while creating the member. Please try again.';
        }
        
        // Check for specific constraint violations
        if (error.error && error.error.name === 'SequelizeUniqueConstraintError') {
          if (error.error.fields && error.error.fields.mobile_number) {
            this.errorMessage = 'This mobile number is already registered with another member.';
            this.memberForm.get('mobile_number')?.setErrors({ 'duplicate': true });
          }
          if (error.error.fields && error.error.fields.aadhar_number) {
            this.errorMessage = 'This Aadhar number is already registered with another member.';
            this.memberForm.get('aadhar_number')?.setErrors({ 'duplicate': true });
          }
          if (error.error.fields && error.error.fields.email) {
            this.errorMessage = 'This email is already registered with another member.';
            this.memberForm.get('email')?.setErrors({ 'duplicate': true });
          }
        }
      }
    });
  }

  onCancel(): void {
    this.resetForm();
    this.cancelAdd.emit();
    this.isVisible = false;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.memberForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  validateNumberInput(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.memberForm.get(fieldName);
    if (control?.errors) {
      if (control.errors['required']) {
        if (fieldName === 'first_name') return 'First name is required';
        if (fieldName === 'last_name') return 'Last name is required';
        if (fieldName === 'mobile_number') return 'Mobile number is required';
        if (fieldName === 'aadhar_number') return 'Aadhar number is required';
        return `${fieldName} is required`;
      }
      if (control.errors['email']) return 'Invalid email format';
      if (control.errors['pattern']) {
        if (fieldName === 'mobile_number') return 'Mobile number must be 10 digits';
        if (fieldName === 'aadhar_number') return 'Aadhar number must be 12 digits';
      }
      if (control.errors['duplicate']) {
        if (fieldName === 'mobile_number') return 'This mobile number is already in use';
        if (fieldName === 'aadhar_number') return 'This Aadhar number is already in use';
        if (fieldName === 'email') return 'This email is already in use';
      }
    }
    return '';
  }

  loadPotentialSpouses(): void {
    const gender = this.memberForm.get('gender')?.value;
    if (!gender) return;
    
    // Get potential spouses of opposite gender
    const oppositeGender = gender === 'male' ? 'female' : 'male';
    this.memberService.getUnmarriedMembersByGender(oppositeGender).subscribe({
      next: (response) => {
        this.potentialSpouses = response.data || [];
      },
      error: (error) => {
        console.error('Error loading potential spouses:', error);
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedImage = input.files[0];

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  clearImage(): void {
    this.selectedImage = null;
    this.imagePreview = null;
  }
  
  onSpouseSelected(): void {
    // This method can be used to handle additional logic when a spouse is selected
    const spouseId = this.memberForm.get('spouse_id')?.value;
    if (spouseId) {
      // Any additional logic needed when spouse is selected
    }
  }

  createMarriageRequest(husbandId: number, wifeId: number, marriageDate: string): void {
    this.memberService.createMarriageRequest(husbandId, wifeId, marriageDate).subscribe({
      next: (response) => {
        this.memberAdded.emit(response.data);
        this.resetForm();
      },
      error: (error) => {
        console.error('Error creating marriage request:', error);
        this.formSubmitting = false;
        this.errorMessage = 'Failed to create marriage relationship. The member was added but marriage information could not be saved.';
      }
    });
  }

  resetForm(): void {
    this.memberForm.reset({
      status: 'Active',
      deceased: false,
      marital_status: '',
      is_verified: false
    });
    this.clearImage();
    this.errorMessage = '';
    this.formSubmitting = false;
    this.showSpouseSelection = false;
  }
}