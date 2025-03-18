import { Component, OnInit, EventEmitter, Output, Input, ChangeDetectorRef } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MemberService } from '../../../core/services/member.service';
import { CommonModule } from '@angular/common';
import { Member, MarriageData } from '../../../core/models/member';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './member-form.component.html',
  styleUrls: ['./member-form.component.css']
})
export class MemberFormComponent implements OnInit {
  @Input() isVisible = false;
  @Input() mode: 'add' | 'edit' = 'add';
  wife: any;
  parent_data: any;
  @Input() set member(value: Member | null) {
    if (value) {
      this._member = value;
      

      if (value.profile_image_url) {
        this.imagePreview = value.profile_image_url;
      }
      
      // Check if member is married and load spouse selection accordingly
      if (value.marital_status?.toLowerCase() === 'married') {
        this.showSpouseSelection = true;
        this.showMarriageDatePicker = true;
        this.onSpouseSelected();
      } else if (value.marital_status?.toLowerCase() === 'divorced') {
        this.showSpouseSelection = true;
        this.showMarriageDatePicker = true;
        this.showDivorceDatePicker = true;
        this.onSpouseSelected();
      } else if (value.marital_status?.toLowerCase() === 'widowed') {
        this.showSpouseSelection = true;
        this.showMarriageDatePicker = true;
        // this.loadDeceasedSpouses();
      }
    }
  }

  get member(): Member | null {
    return this._member;
  }

  @Output() memberSaved = new EventEmitter<any>();
  @Output() cancelForm = new EventEmitter<void>();

  private _member: Member | null = null;
  memberForm: FormGroup;
  selectedImage: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  removeExistingImage: boolean = false;
  potentialSpouses: Member[] = [];
  deceasedSpouses: Member[] = [];
  showSpouseSelection: boolean = false;
  showMarriageDatePicker: boolean = false;
  showDivorceDatePicker: boolean = false;
  errorMessage: string = '';
  formSubmitting: boolean = false;
  spouseSearchControl = new FormControl('');
  showDropdown: boolean[] = [];
  spouseSearchText = '';
  selectedSpouseName = '';
  private subscriptions: Subscription[] = [];


  genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  maritalStatusOptions = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' }
  ];

  get nonSingleMaritalStatusOptions() {
    return this.maritalStatusOptions.filter(option => option.value !== 'Single');
  }

  constructor(
    private fb: FormBuilder,
    private memberService: MemberService,
    private cdr: ChangeDetectorRef 
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
      spouse_id: [null],
      marriage_date: [null],
      divorce_date: [null],
      deceased_spouse_id: [null],
      requested_by: [null],
      maritalStatuses: this.fb.array([]),
      updated_at: [new Date()]
    });

    this.addMaritalStatus();

    this.showDropdown = [false];

    // Subscribe to spouse_id changes to update the search field
    const spouseIdSubscription = this.memberForm.get('spouse_id')?.valueChanges.subscribe(value => {
      if (!value) {
        this.spouseSearchControl.setValue('');
        this.selectedSpouseName = '';
      }
    });
    
    if (spouseIdSubscription) {
      this.subscriptions.push(spouseIdSubscription);
    }

    // Watch for changes in marital status
    this.memberForm.get('marital_status')?.valueChanges.subscribe(value => {
      const lowercaseValue = value?.toLowerCase();

      this.memberForm.patchValue({
        spouse_id: null,
        marriage_date: null,
        divorce_date: null,
        deceased_spouse_id: null,
      });
      
      this.showSpouseSelection = false;
      this.showMarriageDatePicker = false;
      this.showDivorceDatePicker = false;
      
      if (lowercaseValue === 'married') {
        this.showSpouseSelection = true;
        this.showMarriageDatePicker = true;
        this.onSpouseSelected();
      } else if (lowercaseValue === 'divorced') {
        this.showSpouseSelection = true;
        this.showMarriageDatePicker = true;
        this.showDivorceDatePicker = true;
        this.onSpouseSelected();

        if (this.mode === 'edit' && this.member?.marital_status?.toLowerCase() === 'married') {
          this.memberForm.patchValue({
            spouse_id: this.wife || this.member?.spouse_id,
            marriage_date: this.parent_data?.marriage_date ? this.formatDateForInput(this.parent_data?.marriage_date) : null
          });
          
          // Update spouse display name if needed
          if (this.wife) {
            this.memberService.getMember(this.wife).subscribe({
              next: (response) => {
                if (response.data) {
                  const spouse = response.data;
                  this.selectedSpouseName = `${spouse.first_name} ${spouse.last_name} (${spouse.mobile_number || ''})`;
                  this.spouseSearchControl.setValue(this.selectedSpouseName);
                }
              },
              error: (error) => {
                console.error('Error loading spouse details:', error);
              }
            });
          }
        }
      } else if (lowercaseValue === 'widowed') {
        this.showSpouseSelection = true;
        this.showMarriageDatePicker = true;
        // this.loadDeceasedSpouses();
      }
    });

    // Listen for changes to gender to reload potential spouses
    this.memberForm.get('gender')?.valueChanges.subscribe(value => {
      if (value) {
        const maritalStatus = this.memberForm.get('marital_status')?.value?.toLowerCase();
        if (maritalStatus === 'married' || maritalStatus === 'divorced') {
          this.onSpouseSelected();
        } else if (maritalStatus === 'widowed') {
          // this.loadDeceasedSpouses();
        }
      }
    });
  }

  async ngOnInit(): Promise<void> {
    console.log(this.mode,'mode')
    await this.memberService.getWifeDetailsByHusbandId(
      this.member?.id
    ).subscribe(async (res: any) => {
      console.log(res, 'res');
      this.wife = res?.data?.id;

      await this.memberService.getMarriageBySpouseIds(this.member?.id, this.wife).subscribe((res:any)=>{
        console.log(res,'res')
        this.parent_data = res?.data
      })
    })
    setTimeout(() => {
      this.patchFormValues();
    }, 1000);
  }


  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async patchFormValues(): Promise<void> {
    console.log(this.wife,'this.wife')
    if (this.member) {
      console.log(this.maritalStatusOptions,'maritalStatusOptions')
      const maritalStatusOption = this.maritalStatusOptions.find(
        option => option.value.toLowerCase() === this.member?.marital_status?.toLowerCase()
      );
      console.log(this.member,'this.member')
      console.log(maritalStatusOption,'maritalStatusOption')
      console.log(this.parent_data,'this.parent_data')

      let status_dict={
        "active":"Active",
        "inactive":"Inactive"
      }
  
      const formValues = {
        ...this.member,
        dob: this.formatDateForInput(this.member.dob),
        verified_at: this.member.verified_at ? this.formatDateForInput(this.member.verified_at) : null,
        deceased: this.member.deceased ? true : false,
        gender: this.member.gender,
        status: status_dict[this.member.status],
        marital_status: maritalStatusOption ? maritalStatusOption.value : '',
        spouse_id: this.wife || null,
        marriage_date: this.parent_data?.marriage_date ? this.formatDateForInput(this.parent_data?.marriage_date) : null,
        divorce_date: this.member.divorce_date ? this.formatDateForInput(this.member.divorce_date) : null,
        deceased_spouse_id: this.member.deceased_spouse_id || null
      };
      console.log(formValues,'formValues')
      
      this.memberForm.patchValue(formValues);
    }
    if (this.wife) {
      this.memberService.getMember(this.wife).subscribe({
        next: (response) => {
          if (response.data) {
            const spouse = response.data;
            this.selectedSpouseName = `${spouse.first_name} ${spouse.last_name} (${spouse.mobile_number || ''})`;
            
            if (this.member?.marital_status?.toLowerCase() === 'widowed') {
              this.selectedSpouseName += ' (deceased)';
            }
            
            this.spouseSearchControl.setValue(this.selectedSpouseName);
          }
        },
        error: (error) => {
          console.error('Error loading spouse details:', error);
        }
      });
    }
  }

  private formatDateForInput(date: Date | string | null): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  // loadPotentialSpouses(): void {
  //   const gender = this.memberForm.get('gender')?.value;
  //   if (!gender) return;
    
  //   // Get potential spouses of opposite gender
  //   const oppositeGender = gender === 'male' ? 'female' : 'male';
    
  //   // Using the correct method from MemberService
  //   this.memberService.getUnmarriedMembersByGender(oppositeGender).subscribe({
  //     next: (response) => {
  //       // Get the list of potential spouses
  //       this.potentialSpouses = response.data || [];
        
  //       // If the member already has a spouse, add that spouse to the list to allow keeping the same spouse
  //       if (this.mode === 'edit' && this.member?.spouse_id) {
  //         this.memberService.getMember(this.member.spouse_id).subscribe({
  //           next: (spouseResponse) => {
  //             if (spouseResponse.data) {
  //               // Check if the spouse is already in the list (shouldn't be, but just in case)
  //               const existingSpouse = this.potentialSpouses.find(s => s.id === spouseResponse.data.id);
  //               if (!existingSpouse) {
  //                 this.potentialSpouses.unshift(spouseResponse.data);
  //               }
  //             }
  //           },
  //           error: (error) => {
  //             console.error('Error loading existing spouse:', error);
  //             this.errorMessage = 'Failed to load existing spouse information.';
  //           }
  //         });
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error loading potential spouses:', error);
  //       this.errorMessage = 'Failed to load potential spouses. Please try again.';
  //     }
  //   });
  // }

  // loadDeceasedSpouses(): void {
  //   const gender = this.memberForm.get('gender')?.value;
  //   if (!gender) return;
    
  //   // Get deceased spouses of opposite gender
  //   const oppositeGender = gender === 'male' ? 'female' : 'male';
  //   this.memberService.getDeceasedMembersByGender(oppositeGender).subscribe({
  //     next: (response) => {
  //       this.deceasedSpouses = response.data || [];
        
  //       // If the member already has a deceased spouse, add it to the list
  //       if (this.mode === 'edit' && this.member?.deceased_spouse_id) {
  //         this.memberService.getMember(this.member.deceased_spouse_id).subscribe({
  //           next: (spouseResponse) => {
  //             if (spouseResponse.data) {
  //               const existingDeceased = this.deceasedSpouses.find(s => s.id === spouseResponse.data.id);
  //               if (!existingDeceased) {
  //                 this.deceasedSpouses.unshift(spouseResponse.data);
  //               }
  //             }
  //           },
  //           error: (error) => {
  //             console.error('Error loading existing deceased spouse:', error);
  //           }
  //         });
  //       }
  //     },
  //     error: (error) => {
  //       console.error('Error loading deceased spouses:', error);
  //       this.errorMessage = 'Failed to load deceased spouses. Please try again.';
  //     }
  //   });
  // }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.selectedImage = input.files[0];
      this.removeExistingImage = false;

      // Preview image
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

    // Set flag to remove existing image when updating in edit mode
    if (this.mode === 'edit' && this.member?.profile_image) {
      this.removeExistingImage = true;
    }
  }

  onSubmit(): void {
    if (this.memberForm.invalid) return;
    
    // Prevent double submission
    if (this.formSubmitting) return;
    this.formSubmitting = true;
    this.errorMessage = '';
    
    // Get the form values from the main form
    const formValues = this.memberForm.value;
    
    // Make sure to get the marital status from the FormArray if it exists
    if (this.maritalStatuses.length > 0) {
      const firstMaritalStatus = this.maritalStatuses.at(0).value;
      formValues.marital_status = firstMaritalStatus.maritalStatus;
      
      // If there's a spouse selected in the first marital status, use that
      if (firstMaritalStatus.spouse_id) {
        formValues.spouse_id = firstMaritalStatus.spouse_id;
      }
      
      // Use the marriage date from the marital status if available
      if (firstMaritalStatus.marriage_date) {
        formValues.marriage_date = firstMaritalStatus.marriage_date;
      }
      
      // Use the divorce date from the marital status if available
      if (firstMaritalStatus.divorce_date) {
        formValues.divorce_date = firstMaritalStatus.divorce_date;
      }
    }
    
    const spouseId = formValues.spouse_id;
    const maritalStatus = formValues.marital_status?.toLowerCase();
    
    if (this.mode === 'add') {
      this.addMember(formValues, spouseId, maritalStatus);
    } else {
      this.updateMember(formValues, spouseId, maritalStatus);
    }
  
    const maritalStatusesData = formValues.maritalStatuses.map((status: any) => {
      // Format dates
      if (status.marriage_date) {
        status.marriage_date = new Date(status.marriage_date).toISOString().split('T')[0];
      }
      if (status.divorce_date) {
        status.divorce_date = new Date(status.divorce_date).toISOString().split('T')[0];
      }
      
      return status;
    });
  
    if (this.mode === 'add' && maritalStatusesData.length > 1) {
      // Start from index 1 (second marriage) since the first one is handled by main form
      for (let i = 1; i < maritalStatusesData.length; i++) {
        const marriageStatus = maritalStatusesData[i];
        
        if (marriageStatus.maritalStatus === 'Married' && marriageStatus.spouse_id) {
          const gender = formValues.gender;
          const husbandId = gender === 'male' ? formValues.id || null : marriageStatus.spouse_id;
          const wifeId = gender === 'female' ? formValues.id || null : marriageStatus.spouse_id;
          
          // Create additional marriage
          if (husbandId && wifeId) {
            const marriageDate = marriageStatus.marriage_date || new Date().toISOString().split('T')[0];
            this.createAdditionalMarriage(husbandId, wifeId, marriageDate, formValues.id || null);
          }
        }
      }
    }
    
    console.log('Marital statuses data:', maritalStatusesData);
  }

  private createAdditionalMarriage(husbandId: number, wifeId: number, marriageDate: string, requestedBy: number | null): void {
    if (!requestedBy) return;
    
    const marriageData: MarriageData = {
      husband_id: husbandId,
      wife_id: wifeId,
      marriage_date: new Date(marriageDate),
      requested_by: requestedBy
    };
    
    this.memberService.createMarriageRequest(marriageData).subscribe({
      next: (response) => {
        console.log('Additional marriage created successfully', response);
      },
      error: (error) => {
        console.error('Error creating additional marriage:', error);
      }
    });
  }


  private addMember(formValues: any, spouseId: number | null, maritalStatus: string): void {
    // Ensure proper date formatting for creation
    formValues.dob = formValues.dob ? new Date(formValues.dob).toISOString().split('T')[0] : null;
    formValues.marriage_date = formValues.marriage_date ? new Date(formValues.marriage_date).toISOString().split('T')[0] : null;
    formValues.divorce_date = formValues.divorce_date ? new Date(formValues.divorce_date).toISOString().split('T')[0] : null;
    formValues.verified_at = formValues.verified_at ? new Date(formValues.verified_at).toISOString() : null;
    formValues.created_at = new Date().toISOString();
    formValues.updated_at = new Date().toISOString();
  
    // Ensure boolean values are properly formatted
    formValues.is_verified = Boolean(formValues.is_verified);
    formValues.deceased = Boolean(formValues.deceased);
    
    // Validate widowed status
    if (maritalStatus === 'widowed' && formValues.deceased_spouse_id) {
      // Check if selected spouse is actually deceased
      const selectedSpouse = this.deceasedSpouses.find(spouse => spouse.id === formValues.deceased_spouse_id);
      if (!selectedSpouse) {
        this.errorMessage = 'To record as widowed, you must select a deceased spouse.';
        this.formSubmitting = false;
        return;
      }
    }
    
    // Create the member
    this.memberService.createMember(formValues, this.selectedImage).subscribe({
      next: (response) => {
        const newMemberId = response.data.id;
        
        // Handle relationships based on marital status
        if (response.success && spouseId) {
          const gender = formValues.gender;
          const marriageDate = formValues.marriage_date || new Date().toISOString().split('T')[0];
          
          if (maritalStatus === 'married') {
            // Determine husband_id and wife_id based on gender
            const husbandId = gender === 'male' ? newMemberId : spouseId;
            const wifeId = gender === 'female' ? newMemberId : spouseId;
            
            // Create the marriage request
            this.createMarriage(husbandId, wifeId, marriageDate, newMemberId);
          } 
          else if (maritalStatus === 'divorced') {
            // Determine husband_id and wife_id based on gender
            const husbandId = gender === 'male' ? newMemberId : spouseId;
            const wifeId = gender === 'female' ? newMemberId : spouseId;
            
            const divorceDate = formValues.divorce_date || new Date().toISOString().split('T')[0];
            
            // Create the divorce request for new marriage (not in system yet)
            this.createDivorceForNewMarriage(husbandId, wifeId, marriageDate, divorceDate, newMemberId);
          }
          else if (maritalStatus === 'widowed' && formValues.deceased_spouse_id) {
            // Just mark the member as widowed - no further action needed
            this.memberSaved.emit(response.data);
            this.resetForm();
          }
        } else {
          // If no relationship to create, just emit the added member
          this.memberSaved.emit(response.data);
          this.resetForm();
        }
        this.formSubmitting = false;
      },
      error: (error) => {
        // Error handling
        this.formSubmitting = false;
        console.error('Error creating member:', error);
        this.errorMessage = 'Failed to create member. Please try again.';
        
        this.handleErrorResponse(error);
      }
    });
  }

  private updateMember(formValues: any, spouseId: number | null, maritalStatus: string): void {
    if (!this.member?.id) {
      this.errorMessage = 'Member ID is missing';
      this.formSubmitting = false;
      return;
    }
  
    const oldSpouseId = this.member.spouse_id;
    const oldMaritalStatus = this.member.marital_status?.toLowerCase();
  
    // Format dates properly
    const updatedMember = {
      ...formValues,
      id: this.member.id,
      dob: new Date(formValues.dob),
      verified_at: formValues.verified_at ? new Date(formValues.verified_at) : null,
      marriage_date: formValues.marriage_date ? new Date(formValues.marriage_date) : null,
      divorce_date: formValues.divorce_date ? new Date(formValues.divorce_date) : null,
      deceased: Boolean(formValues.deceased),
      updated_at: new Date()
    };
  
    this.memberService.updateMember(
      this.member.id,
      updatedMember,
      this.selectedImage,
      this.removeExistingImage
    ).subscribe({
      next: (response) => {
        // Only handle relationship changes if marital status or spouse has changed
        const hasMaritalStatusChanged = maritalStatus !== oldMaritalStatus;
        const hasSpouseChanged = spouseId !== oldSpouseId;
  
        if (hasMaritalStatusChanged || hasSpouseChanged) {
          if (maritalStatus === 'married' && spouseId) {
            // If changed to married or spouse changed while still married
            const gender = formValues.gender;
            const marriageDate = formValues.marriage_date || new Date().toISOString().split('T')[0];
  
            // Determine husband_id and wife_id based on gender
            const husbandId = gender === 'male' ? this.member!.id : spouseId;
            const wifeId = gender === 'female' ? this.member!.id : spouseId;
  
            this.createMarriage(husbandId, wifeId, marriageDate, this.member!.id);
          } else if (maritalStatus === 'divorced' && spouseId) {
            const gender = formValues.gender;
            const marriageDate = formValues.marriage_date || new Date().toISOString().split('T')[0];
            const divorceDate = formValues.divorce_date || new Date().toISOString().split('T')[0];
          
            // Determine husband_id and wife_id based on gender
            const husbandId = gender === 'male' ? this.member!.id : spouseId;
            const wifeId = gender === 'female' ? this.member!.id : spouseId;
          
            // Check if there's an existing marriage record
            this.memberService.getMarriageBySpouseIds(husbandId, wifeId).subscribe({
              next: (marriageResponse) => {
                // Check if data is an array (seems to be the case based on the error)
              // Check if data is an array (seems to be the case based on the error)
if (marriageResponse && marriageResponse.data && Array.isArray(marriageResponse.data) && marriageResponse.data.length > 0) {
  // It's an array, so use the first item
  const marriage = marriageResponse.data[0];
  if ('id' in marriage && typeof marriage.id === 'number') {
    this.createDivorceForExistingMarriage(
      marriage.id,
      divorceDate,
      this.member!.id
    );
  } else {
    console.error('Invalid marriage id in response');
    this.errorMessage = 'Invalid marriage record found.';
    this.formSubmitting = false;
  }
} else if (marriageResponse && marriageResponse.data && 
          typeof marriageResponse.data === 'object' && 
          marriageResponse.data !== null &&
          'id' in marriageResponse.data && 
          typeof marriageResponse.data.id === 'number') {
  // It's a single object with an id property
  this.createDivorceForExistingMarriage(
    marriageResponse.data.id,
    divorceDate,
    this.member!.id
  );
} 
              },
              error: (error) => {
                console.error('Error checking for existing marriage:', error);
                
                // Fallback to checking member marriages
                this.memberService.getMemberMarriages(this.member!.id).subscribe({
                  next: (marriagesResponse) => {
                    if (marriagesResponse.data && Array.isArray(marriagesResponse.data) && marriagesResponse.data.length > 0) {
                      // Find the active marriage with this spouse
                      const existingMarriage = marriagesResponse.data.find(
                        (m: any) => (m.husband_id === husbandId && m.wife_id === wifeId) ||
                          (m.husband_id === wifeId && m.wife_id === husbandId)
                      );
          
                      if (existingMarriage) {
                        // Create divorce for existing marriage
                        this.createDivorceForExistingMarriage(
                          existingMarriage.id,
                          divorceDate,
                          this.member!.id
                        );
                      } else {
                        // No matching marriage found
                        this.createDivorceForNewMarriage(
                          husbandId,
                          wifeId,
                          marriageDate,
                          divorceDate,
                          this.member!.id
                        );
                      }
                    } else {
                      // No marriages found
                      this.createDivorceForNewMarriage(
                        husbandId,
                        wifeId,
                        marriageDate,
                        divorceDate,
                        this.member!.id
                      );
                    }
                  },
                  error: (secondError) => {
                    console.error('Error finding existing marriage:', secondError);
                    this.formSubmitting = false;
                    this.errorMessage = 'Failed to process marriage information for divorce.';
                  }
                });
              }
            });
          } else if (maritalStatus === 'widowed' && formValues.deceased_spouse_id) {
            // Just update the member as widowed
            this.memberSaved.emit(response.data);
            this.resetForm();
          } else {
            // Other status changes (e.g., to single)
            this.memberSaved.emit(response.data);
            this.resetForm();
          }
        } else {
          // No relationship status changes
          this.memberSaved.emit(response.data);
          this.resetForm();
        }
        this.formSubmitting = false;
      },
      error: (error) => {
        this.formSubmitting = false;
        console.error('Error updating member:', error);
        this.errorMessage = 'An error occurred while updating the member. Please try again.';
  
        this.handleErrorResponse(error);
      }
    });
  
    this.cdr.detectChanges();
  }

  private handleErrorResponse(error: any): void {
    if (error instanceof HttpErrorResponse) {
      if (error.error && error.error.message) {
        this.errorMessage = error.error.message;
      } else if (error.error && error.error.errors && error.error.errors.length > 0) {
        // Handle validation errors from the server
        this.errorMessage = error.error.errors.map((err: any) => err.message).join(', ');
      } else if (error.status === 0) {
        this.errorMessage = 'Server is unreachable. Please check your connection.';
      } else if (error.status === 400) {
        this.errorMessage = 'Invalid data provided. Please check your form.';
      } else if (error.status === 409) {
        this.errorMessage = 'This member information conflicts with an existing record.';
      }
    }
  }

  createMarriage(husbandId: number, wifeId: number, marriageDate: string, requestedBy: number): void {
    const maritalStatuses = this.memberForm.get('maritalStatuses')?.value || [];
    const gender = this.memberForm.get('gender')?.value;

    // Check for multiple spouses
    let validMarriageCount = 1;
    const additionalMarriages = [];

    // Process additional marriages from marital statuses
    for (let i = 1; i < maritalStatuses.length; i++) {
      const status = maritalStatuses[i];
      if (status.maritalStatus === 'Married' && status.spouse_id) {
        validMarriageCount++;
        additionalMarriages.push({
          spouse_id: status.spouse_id,
          marriage_date: status.marriage_date ? new Date(status.marriage_date).toISOString().split('T')[0] : marriageDate
        });
      }
    }
    
    if (validMarriageCount === 1) {
      const marriageData: MarriageData = {
        husband_id: husbandId,
        wife_id: wifeId,
        marriage_date: new Date(marriageDate),
        requested_by: requestedBy
      };
    
    this.memberService.createMarriageRequest(marriageData).subscribe({
      next: (response) => {
        this.memberSaved.emit(response.data);
        this.resetForm();
      },
      error: (error) => {
        console.error('Error creating marriage relationship:', error);
        
        this.errorMessage = 'Member information updated, but marriage details could not be modified.';
        this.memberSaved.emit(this.member);
        this.resetForm();
        this.formSubmitting = false;
      }
    });
  }
  else if (validMarriageCount > 1) {
    const marriages = [
      {
        spouse_id: gender === 'male' ? wifeId : husbandId,
        marriage_date: marriageDate
      },
      ...additionalMarriages
    ];

    // Create multiple marriages in a single request
    const data = {
      marriages,
      member_id: requestedBy,
      gender
    };

    this.memberService.createMultipleMarriage(data).subscribe({
      next: (response) => {
        this.memberSaved.emit(response.data);
        this.resetForm();
      },
      error: (error) => {
        console.error('Error creating multiple marriage relationships:', error);
        
        this.errorMessage = 'Member information updated, but marriage details could not be modified.';
        this.memberSaved.emit(this.member);
        this.resetForm();
        this.formSubmitting = false;
      }
    });
  }
}
  
  createDivorceForNewMarriage(husbandId: number, wifeId: number, marriageDate: string, divorceDate: string, requestedBy: number): void {
    const divorceData = {
      husband_id: husbandId,
      wife_id: wifeId,
      marriage_date: new Date(marriageDate),
      divorce_date: new Date(divorceDate),
      requested_by: requestedBy
    };
    
    this.memberService.createDivorceRequestForNew(divorceData).subscribe({
      next: (response) => {
        this.memberSaved.emit(response.data);
        this.resetForm();
      },
      error: (error) => {
        console.error('Error creating divorce record:', error);
        this.formSubmitting = false;
        this.errorMessage = 'Failed to record divorce information.';
      }
    });
  }

  createDivorceForExistingMarriage(marriageId: number, divorceDate: string, requestedBy: number): void {
    const divorceData = {
      marriage_id: marriageId,
      divorce_date: new Date(divorceDate),
      requested_by: requestedBy
    };
    
    this.memberService.createDivorceRequestForExisting(divorceData).subscribe({
      next: (response) => {
        this.memberSaved.emit(response.data);
        this.resetForm();
      },
      error: (error) => {
        console.error('Error creating divorce for existing marriage:', error);
        this.formSubmitting = false;
        this.errorMessage = 'Failed to record divorce information for the existing marriage.';
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
    this.selectedImage = null;
    this.imagePreview = null;
    this.removeExistingImage = false;
    this.errorMessage = '';
    this.formSubmitting = false;
    this.showSpouseSelection = false;
    this.showMarriageDatePicker = false;
    this.showDivorceDatePicker = false;
    this.isVisible = false;
    this.spouseSearchControl.setValue('');
    this.selectedSpouseName = '';
    this.showDropdown = this.showDropdown.map(() => false);

    while (this.maritalStatuses.length > 0) {
      this.maritalStatuses.removeAt(0);
    }
    this.addMaritalStatus();
  }

  onCancel(): void {
    this.resetForm();
    this.cancelForm.emit();
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

  get formTitle(): string {
    return this.mode === 'add' ? 'Add New Member' : 'Edit Member';
  }

  get submitButtonText(): string {
    return this.mode === 'add' ? 'Add Member' : 'Update Member';
  }

  get maritalStatuses(): FormArray {
    return this.memberForm.get('maritalStatuses') as FormArray;
  }

  createMaritalStatusGroup(): FormGroup {
    return this.fb.group({
      maritalStatus: ['Single', Validators.required],
      spouse_id: [null],
      spouseName: [''],
      marriage_date: [null],
      divorce_date: [null]
    });
  }

  addMaritalStatus(): void {
    // Check if there are existing marital statuses
    const lastIndex = this.maritalStatuses.length - 1;
    
    if (lastIndex >= 0) {
      const lastStatus = this.maritalStatuses.at(lastIndex).get('maritalStatus')?.value;
      
      if (lastStatus === 'Single') {
        // Show alert and prevent adding more marital statuses for single
        alert('Cannot add more marital status when single.');
        return;
      }
      
      // Create form group with non-single default for additional marital statuses
      const newGroup = this.fb.group({
        maritalStatus: ['Married', Validators.required], // Default to married instead of single
        spouse_id: [null],
        spouseName: [''],
        marriage_date: [null],
        divorce_date: [null]
      });
      
      this.maritalStatuses.push(newGroup);

      this.showDropdown[this.maritalStatuses.length - 1] = false;
      
      // Load potential spouses for the new marital status
      setTimeout(() => {
        this.onMaritalStatusChange(this.maritalStatuses.length - 1);
      }, 0);
    } else {
      // First marital status can be single
      this.maritalStatuses.push(this.createMaritalStatusGroup());
      this.showDropdown[0] = false;
    }
  }

  removeMaritalStatus(index: number): void {
    // Don't allow removing the last remaining marital status entry
    if (this.maritalStatuses.length > 1) {
      this.maritalStatuses.removeAt(index);

      this.showDropdown.splice(index, 1);
    }
  }

  // Handle marital status change
  onMaritalStatusChange(index: number): void {
    const maritalStatusControl = this.maritalStatuses.at(index);
    const status = maritalStatusControl.get('maritalStatus')?.value;
    
    // Reset spouse-related fields
    maritalStatusControl.patchValue({
      spouse_id: null,
      spouseName: '',
      marriage_date: null,
      divorce_date: null
    });
    
    // If this is the first status and it's single, allow only one entry
    if (index === 0 && status === 'Single' && this.maritalStatuses.length > 1) {
      // Keep only the first entry
      while (this.maritalStatuses.length > 1) {
        this.maritalStatuses.removeAt(1);
      }
    }
    
    // Load potential spouses based on the selected marital status
    if (status === 'Married' || status === 'Divorced') {
      this.loadPotentialSpouses(index);
    } else if (status === 'Widowed') {
      this.loadDeceasedSpouses(index);
    }
  }

  loadPotentialSpouses(index: number): void {
    const gender = this.memberForm.get('gender')?.value;
    if (!gender) {
      this.errorMessage = 'Please select a gender first';
      return;
    }
    
    // Determine opposite gender
    const oppositeGender = gender === 'male' ? 'female' : 'male';
    
    this.memberService.getMembers(oppositeGender).subscribe({
      next: (response) => {
        this.potentialSpouses = response.data || [];
      },
      error: (error) => {
        console.error('Error loading potential spouses:', error);
      }
    });
  }

  loadDeceasedSpouses(index: number): void {
    const gender = this.memberForm.get('gender')?.value;
    if (!gender) {
      this.errorMessage = 'Please select a gender first';
      return;
    }
    
    // Determine opposite gender
    const oppositeGender = gender === 'male' ? 'female' : 'male';
    
    this.memberService.getDeceasedMembersByGender(oppositeGender).subscribe({
      next: (response) => {
        this.deceasedSpouses = response.data || [];
      },
      error: (error) => {
        console.error('Error loading deceased spouses:', error);
      }
    });
  }

  selectSpouse(index: number, spouse: Member): void {
    const maritalStatusControl = this.maritalStatuses.at(index);
    
    maritalStatusControl.patchValue({
      spouse_id: spouse.id,
      spouseName: `${spouse.first_name} ${spouse.last_name} (${spouse.mobile_number || ''})`
    });
    
    this.showDropdown[index] = false;
  }

  onSpouseSelected(): void {
    const gender = this.memberForm.get('gender')?.value;
    
    // Check if gender is selected
    if (!gender) {
      this.errorMessage = 'Please select a gender first';
      // Clear spouse selection
      this.memberForm.patchValue({
        spouse_id: null
      });
      this.potentialSpouses = [];
      return;
    }
    
    // Reset error message if gender is selected
    this.errorMessage = '';
    
    // Determine opposite gender
    const oppositeGender = gender === 'male' ? 'female' : 'male';
    
    // Get marital status
    const maritalStatus = this.memberForm.get('marital_status')?.value?.toLowerCase();
    
    // Load appropriate members based on marital status
    if (maritalStatus === 'widowed') {
      this.memberService.getDeceasedMembersByGender(oppositeGender).subscribe({
        next: (response) => {
          this.deceasedSpouses = response.data || [];
        },
        error: (error) => {
          console.error('Error loading deceased spouses:', error);
          this.errorMessage = 'Failed to load deceased members';
        }
      });
    } else {
      // For married or divorced status, load all members of opposite gender
      this.memberService.getMembers(oppositeGender).subscribe({
        next: (response) => {
          this.potentialSpouses = response.data || [];
        },
        error: (error) => {
          console.error('Error loading potential spouses:', error);
          this.errorMessage = 'Failed to load potential spouses';
        }
      });
    }
  }

  filterSpouses(index: number): void {
    const maritalStatusControl = this.maritalStatuses.at(index);
    const spouseNameControl = maritalStatusControl.get('spouseName');
    const searchText = spouseNameControl?.value || '';

    this.spouseSearchText = searchText;
    this.showDropdown[index] = true;
  }
   
  onSpouseInputBlur(index: number): void {
    setTimeout(() => {
      this.showDropdown[index] = false;

      const maritalStatusControl = this.maritalStatuses.at(index);
      const spouseNameValue = maritalStatusControl.get('spouseName')?.value;
      
      
      if (spouseNameValue !== this.getSelectedSpouseName(index)) {
        maritalStatusControl.patchValue({
          spouse_id: null
        });
        
        if (!spouseNameValue) {
          maritalStatusControl.patchValue({
            spouseName: ''
          });
        }
      }
    }, 200);
  }

  private getSelectedSpouseName(index: number): string {
    const maritalStatusControl = this.maritalStatuses.at(index);
    const spouseId = maritalStatusControl.get('spouse_id')?.value;
    
    if (!spouseId) return '';
    
    // Find spouse in potential or deceased spouses
    const status = maritalStatusControl.get('maritalStatus')?.value;
    const spouseList = status === 'Widowed' ? this.deceasedSpouses : this.potentialSpouses;
    const spouse = spouseList.find(s => s.id === spouseId);
    
    if (!spouse) return '';
    
    let displayName = `${spouse.first_name} ${spouse.last_name} (${spouse.mobile_number || ''})`;
    if (status === 'Widowed') {
      displayName += ' (deceased)';
    }
    
    return displayName;
  }
  
  // Filtered spouses getters
  get filteredPotentialSpouses(): Member[] {
    if (!this.spouseSearchText) {
      return this.potentialSpouses;
    }
    
    const searchLower = this.spouseSearchText.toLowerCase();
    return this.potentialSpouses.filter(spouse => 
      spouse.first_name.toLowerCase().includes(searchLower) || 
      spouse.last_name.toLowerCase().includes(searchLower) || 
      (spouse.mobile_number && spouse.mobile_number.includes(this.spouseSearchText))
    );
  }
  
  get filteredDeceasedSpouses(): Member[] {
    if (!this.spouseSearchText) {
      return this.deceasedSpouses;
    }
    
    const searchLower = this.spouseSearchText.toLowerCase();
    return this.deceasedSpouses.filter(spouse => 
      spouse.first_name.toLowerCase().includes(searchLower) || 
      spouse.last_name.toLowerCase().includes(searchLower) || 
      (spouse.mobile_number && spouse.mobile_number.includes(this.spouseSearchText))
    );
  }
}
