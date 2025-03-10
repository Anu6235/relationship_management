import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, OnChanges, SimpleChanges, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerType, MemberField } from '../../../core/models/ledger';
import { LedgerService } from '../../../core/services/ledger.service';

@Component({
  selector: 'app-add-ledger-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './add-ledger-modal.component.html',
  styleUrls: ['./add-ledger-modal.component.css']
})
export class AddLedgerModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() editMode = false;
  @Input() ledgerTypeToEdit: LedgerType | null = null;
  
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<any>();
  
  ledgerTypeForm: FormGroup;
  isSubmitting = false;
  
  memberFields: MemberField[] = [
    { label: 'Marital Status', value: 'marital_status', options: ['single', 'married', 'divorced', 'widowed'] },
    { label: 'Gender', value: 'gender', options: ['male', 'female'] },
    { label: 'Status', value: 'status', options: ['active', 'inactive', 'suspended'] },
    { label: 'Deceased', value: 'deceased', options: ['yes', 'no'] }
  ];

  durationUnits = ['minute', 'hour', 'day', 'month'];

  constructor(
    private ledgerService : LedgerService,
    private fb: FormBuilder) {
    this.ledgerTypeForm = this.createLedgerTypeForm();
  }

  ngOnInit(): void {
    if (this.editMode && this.ledgerTypeToEdit) {
      this.patchFormWithLedgerTypeData(this.ledgerTypeToEdit);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ledgerTypeToEdit'] && changes['ledgerTypeToEdit'].currentValue) {
      this.patchFormWithLedgerTypeData(changes['ledgerTypeToEdit'].currentValue);
    }
  }

  createLedgerTypeForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      start_date: [null, Validators.required], // Explicitly set to null initially
      duration_value: [30, [Validators.required, Validators.min(1)]],
      duration_unit: ['day', Validators.required],
      fine_amount: [0, [Validators.required, Validators.min(0)]],
      fine_interval_value: [10, [Validators.required, Validators.min(1)]],
      fine_interval_unit: ['day', Validators.required],
      conditions: this.fb.array([this.createCondition()]),
      is_active: [true]
    });
  }

  createCondition() {
    return this.fb.group({
      field: ['marital_status', Validators.required],
      value: ['married', Validators.required]
    });
  }
  patchFormWithLedgerTypeData(ledgerType: LedgerType) {
    if (!ledgerType) return;

    console.log('Original ledger type:', ledgerType);
    console.log('Original start_date:', ledgerType.start_date);

    this.ledgerTypeForm.reset();

    // Prepare start date
    let startDate: string | null = null;
    if (ledgerType.start_date) {
      try {
        const dateObj = new Date(ledgerType.start_date);
        startDate = this.formatDateForInput(dateObj);
      } catch (error) {
        console.error('Error parsing start date:', error);
        startDate = null;
      }
    }

    this.ledgerTypeForm.patchValue({
      name: ledgerType.name || '',
      description: ledgerType.description || '',
      amount: ledgerType.amount || 0,
      start_date: startDate, 
      duration_value: ledgerType.duration_value || 30,
      duration_unit: ledgerType.duration_unit || 'day',
      fine_amount: ledgerType.fine_amount || 0,
      fine_interval_value: ledgerType.fine_interval_value || 10,
      fine_interval_unit: ledgerType.fine_interval_unit || 'day',
      is_active: ledgerType.is_active !== undefined ? ledgerType.is_active : true
    }, { emitEvent: true }); 

    this.rebuildConditions(ledgerType);

    console.log('Patched form values:', this.ledgerTypeForm.value);
  }

  rebuildConditions(ledgerType: LedgerType) {
    while (this.conditions.length !== 0) {
      this.conditions.removeAt(0);
    }

    if (ledgerType.condition_config && Object.keys(ledgerType.condition_config).length) {
      Object.entries(ledgerType.condition_config).forEach(([field, value]) => {
        this.conditions.push(
          this.fb.group({
            field: [field, Validators.required],
            value: [value, Validators.required]
          })
        );
      });
    } else {
      this.addCondition();
    }
  }
  
  formatDateForInput(date: Date): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  get conditions() {
    return this.ledgerTypeForm.get('conditions') as FormArray;
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

onSubmit() {
  if (this.ledgerTypeForm.valid) {
    this.isSubmitting = true;
    
    const conditionConfig: any = {};
    this.conditions.controls.forEach(control => {
      const field = control.get('field')?.value;
      const value = control.get('value')?.value;
      if (field && value) {
        conditionConfig[field] = value;
      }
    });

    const formValue = this.ledgerTypeForm.value;

    const formData: Partial<LedgerType> = {
      name: formValue.name,
      description: formValue.description,
      amount: formValue.amount,
      is_active: formValue.is_active,
      start_date: formValue.start_date 
        ? new Date(formValue.start_date + 'T00:00:00Z') 
        : undefined,
      duration_value: formValue.duration_value,
      duration_unit: formValue.duration_unit,
      fine_amount: formValue.fine_amount,
      fine_interval_value: formValue.fine_interval_value,
      fine_interval_unit: formValue.fine_interval_unit,
      condition_config: conditionConfig
    };

    console.log('Final form data:', formData);
    if (this.editMode && this.ledgerTypeToEdit) {
      this.ledgerService.updateLedgerType(this.ledgerTypeToEdit.id, formData)
        .subscribe({
          next: (response) => {
            console.log('Update response:', response);
            console.log('Updated start date:', response.data.start_date);
            this.save.emit(response);
            this.isSubmitting = false;
            this.close.emit();
          },
          error: (error) => {
            console.error('Error updating ledger type', error);
            this.isSubmitting = false;
          }
        });
    }
  }
}

  onCancel() {
    this.close.emit();
  }
}