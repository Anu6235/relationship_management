import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MemberService } from '../../../core/services/member.service';
import { CommonModule } from '@angular/common';

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
      created_at: [new Date()],
      updated_at: [new Date()]
    });
  }

  ngOnInit(): void {}

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

  onSubmit(): void {
    if (this.memberForm.valid) {
      const formData = this.memberForm.value;

      formData.dob = new Date(formData.dob);
      formData.verified_at = formData.verified_at ? new Date(formData.verified_at): null;
      formData.created_at = new Date();
      formData.updated_at = new Date();

      this.memberService.createMember(formData, this.selectedImage).subscribe({
        next: (response) => {
          this.memberAdded.emit(response.data);
          this.memberForm.reset();
          this.selectedImage = null;
          this.imagePreview = null;
          this.isVisible = false;
        },
        error: (error) => {
          console.error('Error creating member:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.memberForm.reset();
    this.selectedImage = null;
    this.imagePreview = null;
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
  }
  return '';
}
}