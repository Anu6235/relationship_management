import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppConfigService } from '../../core/services/app-config.service';
import { ToastrService } from 'ngx-toastr';
import { LedgerType, MemberField } from '../../core/models/ledger';
import { LedgerService } from '../../core/services/ledger.service';
import { Subscription, interval } from 'rxjs';
import { AddLedgerModalComponent } from '../../shared/modals/add-ledger-modal/add-ledger-modal.component';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    AddLedgerModalComponent,
  ],
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit, OnDestroy {
  configForm: FormGroup;
  ledgerForm: FormGroup;
  fileName: string | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isSubmitting = false;
  isAddLedgerModalOpen = false;
  ledgerToEdit = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  ledgerTypes: LedgerType[] = [];
  ledgerTypeToEdit: LedgerType | null = null;

  memberFields: MemberField[] = [
    { label: 'Marital Status', value: 'marital_status', options: ['single', 'married', 'divorced', 'widowed'] },
    { label: 'Gender', value: 'gender', options: ['male', 'female', 'other'] },
    { label: 'Status', value: 'status', options: ['active', 'inactive', 'suspended'] },
    { label: 'Deceased', value: 'deceased', options: ['yes', 'no'] }
  ];

  // For interval timer
  private ledgerCreationSubscription?: Subscription;
  private lastLedgerCreationTime: { [key: number]: Date } = {};

  constructor(
    private fb: FormBuilder,
    private appConfigService: AppConfigService,
    private ledgerService: LedgerService,
    // private toastr: ToastrService
  ) {
    this.configForm = this.fb.group({
      appName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contact: ['', Validators.required]
    });

    this.ledgerForm = this.fb.group({
      ledgerTypeId: [null, Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      fee: [0, [Validators.required, Validators.min(0)]],
      dueDate: [new Date().toISOString().split('T')[0], Validators.required],
      durationValue: [30, [Validators.required, Validators.min(1)]],
      durationUnit: ['day', Validators.required],
      conditions: this.fb.array([this.createCondition()]),
      isActive: [false] // Default to OFF
    });
  }

  ngOnInit() {
    this.loadCurrentConfig();
    this.loadLedgerTypes();

    // Setup listener for the isActive toggle
    this.ledgerForm.get('isActive')?.valueChanges.subscribe(isActive => {
      const typeId = this.ledgerForm.get('ledgerTypeId')?.value;
      if (isActive) {
        this.startLedgerCreation(typeId);
      } else {
        this.stopLedgerCreation();
      }
    });
  }

  ngOnDestroy() {
    this.stopLedgerCreation();
  }

  loadCurrentConfig() {
    this.appConfigService.getAppConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.configForm.patchValue({
            appName: response.data.app_name,
            email: response.data.email,
            contact: response.data.contact
          });
          if (response.data.logo) {
            this.previewUrl = `http://localhost:5000${response.data.logo}`;
            this.fileName = response.data.logo.split('/').pop() || 'Uploaded logo';
          }
        }
      },
      error: (error) => {
        console.error('Error loading configuration:', error);
      }
    });
  }

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      this.fileName = file.name; 
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.configForm.valid) {
      this.isSubmitting = true;
      const formData = new FormData();
      formData.append('appName', this.configForm.get('appName')?.value);
      formData.append('email', this.configForm.get('email')?.value);
      formData.append('contact', this.configForm.get('contact')?.value);

      if (this.selectedFile) {
        formData.append('logo', this.selectedFile);
      }

      this.appConfigService.saveAppConfig(formData).subscribe({
        next: (response) => {
          if (response.success) {
            // this.toastr.success('Configuration saved successfully!', 'Success');
            if (this.selectedFile) {
              this.fileName = this.selectedFile.name;
            }
          } else {
            // this.toastr.error('Failed to save configuration', 'Error');
          }
        },
        error: (error) => {
          console.error('Error saving configuration:', error);
          // this.toastr.error('Error saving configuration', 'Error');
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  get conditions() {
    return this.ledgerForm.get('conditions') as FormArray;
  }

  createCondition() {
    return this.fb.group({
      field: ['marital_status', Validators.required],
      value: ['married', Validators.required]
    });
  }

  addCondition() {
    this.conditions.push(this.createCondition());
  }

  removeCondition(index: number) {
    this.conditions.removeAt(index);
  }

  getFieldOptions(fieldName: string): string[] {
    const field = this.memberFields.find(f => f.value === fieldName);
    return field?.options || [];
  }

  loadLedgerTypes() {
    this.ledgerService.getAllLedgerTypes().subscribe({
      next: (response) => {
        if (response.success) {
          this.ledgerTypes = response.data;
          
          // If ledger types exist, select the first one and load its details
          if (this.ledgerTypes.length > 0) {
            const firstType = this.ledgerTypes[0];
            this.ledgerForm.patchValue({
              ledgerTypeId: firstType.id,
              description: firstType.description,
              amount: firstType.amount,
              durationValue: firstType.duration_value,
              durationUnit: firstType.duration_unit,
              isActive: firstType.is_active
            });

            // Parse condition_config if it exists
            if (firstType.condition_config) {
              this.loadConditions(firstType.condition_config);
            }

            // If the selected ledger type is active, start the ledger creation process
            if (firstType.is_active) {
              this.startLedgerCreation(firstType.id);
            }
          }
        }
      },
      error: (error) => {
        console.error('Error loading ledger types:', error);
        // this.toastr.error('Failed to load ledger types', 'Error');
      }
    });
  }

  loadConditions(conditionConfig: any) {
    // Clear existing conditions except the first one
    while (this.conditions.length > 0) {
      this.conditions.removeAt(0);
    }

    // Add conditions from config
    Object.entries(conditionConfig).forEach(([field, value]) => {
      this.conditions.push(
        this.fb.group({
          field: [field, Validators.required],
          value: [value, Validators.required]
        })
      );
    });

    // If no conditions were added, create an empty one
    if (this.conditions.length === 0) {
      this.addCondition();
    }
  }

  onLedgerTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const typeId = parseInt(select.value, 10);
    
    // Stop any existing timers
    this.stopLedgerCreation();
    
    if (typeId) {
      this.ledgerService.getLedgerTypeById(typeId).subscribe({
        next: (response) => {
          if (response.success) {
            const ledgerType = response.data;
            this.ledgerForm.patchValue({
              description: ledgerType.description,
              amount: ledgerType.amount,
              durationValue: ledgerType.duration_value,
              durationUnit: ledgerType.duration_unit,
              isActive: ledgerType.is_active
            });

            if (ledgerType.condition_config) {
              this.loadConditions(ledgerType.condition_config);
            }

            // If the selected ledger type is active, start the ledger creation process
            if (ledgerType.is_active) {
              this.startLedgerCreation(typeId);
            }
          }
        },
        error: (error) => {
          console.error('Error loading ledger type details:', error);
        }
      });
    }
  }

  // Called when toggle is switched
  updateLedgerStatus() {
    if (this.ledgerForm.valid) {
      this.isSubmitting = true;
      
      // Convert form values to match LedgerType interface
      const conditionConfig: any = {};
      this.conditions.controls.forEach(control => {
        const field = control.get('field')?.value;
        const value = control.get('value')?.value;
        if (field && value) {
          conditionConfig[field] = value;
        }
      });

      const typeId = this.ledgerForm.get('ledgerTypeId')?.value;
      const isActive = this.ledgerForm.get('isActive')?.value;
      
      const ledgerTypeData: Partial<LedgerType> = {
        description: this.ledgerForm.get('description')?.value,
        amount: this.ledgerForm.get('amount')?.value,
        is_active: isActive,
        duration_value: this.ledgerForm.get('durationValue')?.value,
        duration_unit: this.ledgerForm.get('durationUnit')?.value,
        condition_config: conditionConfig
      };

      this.ledgerService.updateLedgerType(typeId, ledgerTypeData).subscribe({
        next: (response) => {
          if (response.success) {
            // Status message based on toggle state
            const statusMessage = isActive ? 
              'Ledger creation enabled. Ledgers will be generated according to the schedule.' : 
              'Ledger creation disabled.';
            
            // this.toastr.success(statusMessage, 'Status Updated');
            
            // If we're turning it on, create a ledger immediately
            if (isActive) {
              this.generateLedgers(typeId);
            }
          } else {
            // this.toastr.error('Failed to update ledger status', 'Error');
          }
        },
        error: (error) => {
          console.error('Error updating ledger status:', error);
          // this.toastr.error('Error updating ledger status', 'Error');
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

  generateLedgers(ledgerTypeId: number) {
    // Check if we've recently created a ledger for this type to prevent duplicates
    const now = new Date();
    const lastCreated = this.lastLedgerCreationTime[ledgerTypeId];
    
    if (lastCreated) {
      const durationValue = this.ledgerForm.get('durationValue')?.value || 30;
      const durationUnit = this.ledgerForm.get('durationUnit')?.value || 'day';
      
      let minimumInterval = 0; // Milliseconds
      
      switch (durationUnit) {
        case 'minute':
          minimumInterval = durationValue * 60 * 1000;
          break;
        case 'hour':
          minimumInterval = durationValue * 60 * 60 * 1000;
          break;
        case 'day':
          minimumInterval = durationValue * 24 * 60 * 60 * 1000;
          break;
        case 'month':
          // Approximate a month as 30 days
          minimumInterval = durationValue * 30 * 24 * 60 * 60 * 1000;
          break;
      }
      
      const elapsed = now.getTime() - lastCreated.getTime();
      
      if (elapsed < minimumInterval) {
        // this.toastr.info(`Ledger creation skipped - next creation in ${Math.ceil((minimumInterval - elapsed) / (60 * 1000))} minutes`, 'Information');
        return;
      }
    }
    
    this.ledgerService.generateLedgers(ledgerTypeId).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the last creation time for this ledger type
          this.lastLedgerCreationTime[ledgerTypeId] = new Date();
          // this.toastr.success('Ledgers generated successfully!', 'Success');
        } else {
          // this.toastr.warning('Failed to generate ledgers', 'Warning');
        }
      },
      error: (error) => {
        console.error('Error generating ledgers:', error);
        // this.toastr.error('Error generating ledgers', 'Error');
      }
    });
  }

  startLedgerCreation(ledgerTypeId: number) {
    // Stop any existing timer
    this.stopLedgerCreation();
    
    // Convert the interval to milliseconds for timer
    const durationValue = this.ledgerForm.get('durationValue')?.value || 30;
    const durationUnit = this.ledgerForm.get('durationUnit')?.value || 'day';
    
    let intervalMs = 60000; // Default to 1 minute check
    
    switch (durationUnit) {
      case 'minute':
        intervalMs = durationValue * 60 * 1000;
        break;
      case 'hour':
        intervalMs = durationValue * 60 * 60 * 1000;
        break;
      case 'day':
        intervalMs = Math.min(durationValue * 24 * 60 * 60 * 1000, 3600000); // Max 1 hour
        break;
      case 'month':
        intervalMs = 3600000; // 1 hour
        break;
    }
    
    const checkIntervalMs = Math.min(intervalMs, 60000); 
    
    // Create the subscriptionuse
    this.ledgerCreationSubscription = interval(checkIntervalMs).subscribe(() => {
      if (this.ledgerForm.get('isActive')?.value) {
        this.generateLedgers(ledgerTypeId);
      } else {
        // Stop the interval if the toggle is off
        this.stopLedgerCreation();
      }
    });
    
    // Generate once immediately when activated
    this.generateLedgers(ledgerTypeId);
  }

  stopLedgerCreation() {
    if (this.ledgerCreationSubscription) {
      this.ledgerCreationSubscription.unsubscribe();
      this.ledgerCreationSubscription = undefined;
    }
  }

  addNewLedgerType() {
    // Reset form for new ledger type creation
    this.ledgerForm.patchValue({
      ledgerTypeId: null,
      description: '',
      amount: 0,
      fee: 0,
      durationValue: 30,
      durationUnit: 'day',
      isActive: false
    });

    // Reset conditions
    while (this.conditions.length > 0) {
      this.conditions.removeAt(0);
    }
    this.addCondition();

  }

  openNewLedgerModal(): void {
    this.isAddLedgerModalOpen = true;
  }

  closeAddLedgerModal(): void {
    this.isAddLedgerModalOpen = false;
    this.ledgerTypeToEdit = null;
  }

  saveLedgerConfig(ledgerConfig: any): void {
    this.isSubmitting = true;
    
    if (this.ledgerTypeToEdit) {
      // Update existing ledger type
      this.ledgerService.updateLedgerType(this.ledgerTypeToEdit.id, ledgerConfig).subscribe({
        next: (response) => {
          if (response.success) {
            // this.toastr.success('Ledger configuration updated successfully!', 'Success');
            this.closeAddLedgerModal();
            this.loadLedgerTypes();
            
            // If the updated ledger type is active, restart the ledger creation process
            if (ledgerConfig.is_active) {
              this.startLedgerCreation(this.ledgerTypeToEdit!.id);
            }
          } else {
            // this.toastr.error('Failed to update ledger configuration', 'Error');
          }
        },
        error: (error) => {
          console.error('Error updating ledger configuration:', error);
          // this.toastr.error('Error updating ledger configuration', 'Error');
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      // Create new ledger type
      this.ledgerService.createLedgerType(ledgerConfig).subscribe({
        next: (response) => {
          if (response.success) {
            // this.toastr.success('Ledger configuration added successfully!', 'Success');
            this.closeAddLedgerModal();
            this.loadLedgerTypes();
            
            // If the new ledger type is active, start the ledger creation process
            if (ledgerConfig.is_active) {
              this.startLedgerCreation(response.data.id);
            }
          } else {
            // this.toastr.error('Failed to add ledger configuration', 'Error');
          }
        },
        error: (error) => {
          console.error('Error adding ledger configuration:', error);
          // this.toastr.error('Error adding ledger configuration', 'Error');
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }

getConditionArray(conditionConfig: any): Array<{field: string, value: string}> {
  if (!conditionConfig) return [];
  
  return Object.entries(conditionConfig).map(([field, value]) => ({
    field,
    value: value as string
  }));
}

getConditionClass(condition: string): string {
  switch (condition) {
    case 'married':
      return 'condition-married';
    case 'single':
      return 'condition-single';
    case 'divorced':
      return 'condition-divorced';
    case 'widowed':
      return 'condition-widowed';
    case 'male':
      return 'condition-male';
    case 'female':
      return 'condition-female';
    case 'other':
      return 'condition-other';
    case 'active':
      return 'condition-active';
    case 'inactive':
      return 'condition-inactive';
    case 'suspended':
      return 'condition-suspended';
    case 'yes': 
      return 'condition-deceased';
    case 'no': 
      return 'condition-alive';
    default:
      return 'condition-default';
  }
}

formatConditionValue(value: string): string {
  if (value === 'yes') return 'Deceased';
  if (value === 'no') return 'Alive';

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

editLedgerType(ledgerType: LedgerType): void {
  this.ledgerTypeToEdit = ledgerType;
  this.isAddLedgerModalOpen = true;
}

updateLedgerConfig(updateData: {id: number, data: any}): void {
  this.isSubmitting = true;
  
  // Update existing ledger type
  this.ledgerService.updateLedgerType(updateData.id, updateData.data).subscribe({
    next: (response) => {
      if (response.success) {
        // this.toastr.success('Ledger configuration updated successfully!', 'Success');
        this.closeAddLedgerModal();
        
        // Refresh the ledger types list
        this.loadLedgerTypes();
        
        // If the updated ledger type is active, restart the ledger creation process
        if (updateData.data.is_active) {
          this.startLedgerCreation(updateData.id);
        }
      } else {
        // this.toastr.error('Failed to update ledger configuration', 'Error');
      }
    },
    error: (error) => {
      console.error('Error updating ledger configuration:', error);
      // this.toastr.error('Error updating ledger configuration', 'Error');
    },
    complete: () => {
      this.isSubmitting = false;
      this.ledgerToEdit = false; // Reset
    }
  });
}

closeEditLedgerModal(): void {
  this.ledgerToEdit = false; 
}

deleteLedgerType(id: number): void {
  if (confirm('Are you sure you want to delete this ledger configuration?')) {
    this.ledgerService.deleteLedgerType(id).subscribe({
      next: (response) => {
        if (response.success) {
          // this.toastr.success('Ledger configuration deleted successfully', 'Success');
          this.loadLedgerTypes();
        } else {
          // this.toastr.error('Failed to delete ledger configuration', 'Error');
        }
      },
      error: (error) => {
        console.error('Error deleting ledger configuration:', error);
        // this.toastr.error('Error deleting ledger configuration', 'Error');
      }
    });
  }
}

formatCurrency(value: number): string {
  if (value == null) return '₹0.00'; 
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);
}

formatDate(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0'); 
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
}