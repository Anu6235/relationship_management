import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Member } from '../../../core/models/member';

@Component({
  selector: 'app-delete-member-modal',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './delete-member-modal.component.html',
  styleUrl: './delete-member-modal.component.css'
})
export class DeleteMemberModalComponent {
    @Input() isVisible: boolean = false;
    @Input() member: Member | null = null;
    @Output() confirmed = new EventEmitter<void>();
    @Output() cancelled = new EventEmitter<void>();

    onConfirm(): void {
      this.confirmed.emit();
    }

    onCancel(): void {
      this.cancelled.emit();
    }
  }