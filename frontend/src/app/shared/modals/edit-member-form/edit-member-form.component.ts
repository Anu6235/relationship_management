import { Component, OnInit, EventEmitter, Output, Input } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MemberService } from '../../../core/services/member.service';
import { CommonModule } from '@angular/common';
import { Member } from '../../../core/models/member';

@Component({
  selector: 'app-edit-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-member-form.component.html',
  styleUrls: ['./edit-member-form.component.css']
})
export class EditMemberFormComponent implements OnInit {
  @Input() isVisible = false;
  @Input() set member(value: Member | null) {
    if (value) {
      this._member = value;
      this.patchFormValues();

      if (value.profile_image_url) {
        this.imagePreview = value.profile_image_url;
      }
    }
  }

  get member(): Member | null {
    return this._member;
  }

  @Output() memberEdited = new EventEmitter<any>();
  @Output() cancelEdit = new EventEmitter<void>();

  private _member: Member | null = null;
  memberForm: FormGroup;
  selectedImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  removeExistingImage: boolean = false;

  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  maritalStatusOptions = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' }
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
      status: ['', Validators.required],
      deceased: [false],
      marital_status: ['', Validators.required]
    });
  }

  ngOnInit(): void {}

  private patchFormValues(): void {
    if (this.member) {
      const formValues = {
        ...this.member,
        dob: this.formatDateForInput(this.member.dob),
        verified_at: this.member.verified_at ? this.formatDateForInput(this.member.verified_at) : null,
        deceased: this.member.deceased ? 'true' : 'false',

        gender: this.member.gender,
        status: this.member.status,
        marital_status: this.member.marital_status,
      };
      this.memberForm.patchValue(formValues);
    }
  }

  private formatDateForInput(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedImage = input.files[0];
      this.removeExistingImage = false;

      //Preview image
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

    // Set flag to remove existing image when updating
    if (this.member?.profile_image) {
      this.removeExistingImage = true;
    }
  }

  onSubmit(): void {
    if (this.memberForm.valid && this.member?.id) {
      const formData = {
        ...this.memberForm.value,
        id: this.member.id,
        dob: new Date(this.memberForm.value.dob),
        verified_at: this.memberForm.value.verified_at ? new Date(this.memberForm.value.verified_at) : null,
        deceased: this.memberForm.value.deceased === 'true',
        updated_at: new Date()
      };

      this.memberService.updateMember(
        this.member.id,
        formData,
        this.selectedImage,
        this.removeExistingImage
      ).subscribe({
        next: (response) => {
          this.memberEdited.emit(response.data);
          this.memberForm.reset();
          this.selectedImage = null;
          this.imagePreview = null;
          this.removeExistingImage = false;
          this.isVisible = false;
        },
        error: (error) => {
          console.error('Error updating member:', error);
        }
      });
    }
  }

  onCancel(): void {
    this.memberForm.reset();
    this.selectedImage = null;
    this.imagePreview = null;
    this.removeExistingImage = false;
    this.cancelEdit.emit();
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