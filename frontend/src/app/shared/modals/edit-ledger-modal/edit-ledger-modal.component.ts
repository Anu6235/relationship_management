import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LedgerType, MemberField } from '../../../core/models/ledger';

@Component({
  selector: 'app-edit-ledger-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './edit-ledger-modal.component.html',
  styleUrls: ['./edit-ledger-modal.component.css']
})
export class EditLedgerModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() ledgerTypeToEdit: LedgerType | null = null;
  
  @Output() close = new EventEmitter<void>();
  @Output() update = new EventEmitter<any>();
  
  ledgerTypeForm: FormGroup;
  isSubmitting = false;
  
  memberFields: MemberField[] = [
    { label: 'Marital Status', value: 'marital_status', options: ['single', 'married', 'divorced', 'widowed'] },
    { label: 'Gender', value: 'gender', options: ['male', 'female', 'other'] },
    { label: 'Status', value: 'status', options: ['active', 'inactive', 'suspended'] },
    { label: 'Deceased', value: 'deceased', options: ['yes', 'no'] }
  ];

  durationUnits = ['minute', 'hour', 'day', 'month'];

  constructor(private fb: FormBuilder) {
    this.ledgerTypeForm = this.createLedgerTypeForm();
  }

  ngOnInit(): void {
    if (this.ledgerTypeToEdit) {
      this.patchFormWithLedgerTypeData(this.ledgerTypeToEdit);
    }
  }

  createLedgerTypeForm(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      start_date: [new Date(), Validators.required],
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

    while (this.conditions.length > 0) {
      this.conditions.removeAt(0);
    }

    if (ledgerType.condition_config) {
      Object.entries(ledgerType.condition_config).forEach(([field, value]) => {
        this.conditions.push(
          this.fb.group({
            field: [field, Validators.required],
            value: [value, Validators.required]
          })
        );
      });
    }

    if (this.conditions.length === 0) {
      this.addCondition();
    }

    if (ledgerType.start_date) {
      this.ledgerTypeForm.patchValue({
        start_date: new Date(ledgerType.start_date)
      });
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

      this.update.emit({
        id: this.ledgerTypeToEdit?.id,
        data: formData
      });
      this.isSubmitting = false;
    }
  }

  onCancel() {
    this.close.emit();
  }
}