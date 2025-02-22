import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-verification-modal',
  imports: [CommonModule],
  templateUrl: './verification-modal.component.html',
  styleUrl: './verification-modal.component.css'
})
export class VerificationModalComponent {
  @Input() isVisible = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm() {
    this.confirmed.emit();
  }

  onCancel() {
    this.cancelled.emit();
  }
}