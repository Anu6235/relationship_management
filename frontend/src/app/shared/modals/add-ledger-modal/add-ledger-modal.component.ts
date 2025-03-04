import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerType, MemberField } from '../../../core/models/ledger';

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

  constructor(private fb: FormBuilder) {
    this.ledgerTypeForm = this.createLedgerTypeForm();
  }

  ngOnInit(): void {
    console.log('Edit Mode:', this.editMode);
    console.log('Ledger Data:', this.ledgerTypeToEdit);
    
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
  
    this.ledgerTypeForm.patchValue({
      name: ledgerType.name,
      description: ledgerType.description,
      amount: ledgerType.amount,
      duration_value: ledgerType.duration_value,
      duration_unit: ledgerType.duration_unit,
      fine_amount: ledgerType.fine_amount || 0,
      fine_interval_value: ledgerType.fine_interval_value || 10,
      fine_interval_unit: ledgerType.fine_interval_unit || 'day',
      is_active: ledgerType.is_active
    });
  
    // Clear existing conditions safely
    while (this.conditions.length > 0) {
      this.conditions.removeAt(0);
    }
  
    // Handle condition_config correctly
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
      // If no conditions exist, add an empty one
      this.addCondition();
    }
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
      
      // Convert form values to match LedgerType interface
      const conditionConfig: any = {};
      this.conditions.controls.forEach(control => {
        const field = control.get('field')?.value;
        const value = control.get('value')?.value;
        if (field && value) {
          conditionConfig[field] = value;
        }
      });

      const formData = {
        ...this.ledgerTypeForm.value,
        condition_config: conditionConfig
      };

      this.save.emit(formData);
      this.isSubmitting = false;
    }
  }

  onCancel() {
    this.close.emit();
  }
}