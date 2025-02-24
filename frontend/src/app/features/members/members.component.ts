import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Member } from '../../core/models/member';
import { MemberService } from '../../core/services/member.service';
import { AuthService } from '../../core/services/auth.service';
import { AddMemberFormComponent } from '../../shared/modals/add-member-form/add-member-form.component';
import { EditMemberFormComponent } from '../../shared/modals/edit-member-form/edit-member-form.component';
import { DeleteMemberModalComponent } from '../../shared/modals/delete-member-modal/delete-member-modal.component';
import { VerificationModalComponent } from '../../shared/modals/verification-modal/verification-modal.component';
import { PaginationService, PaginationState } from '../../core/services/pagination.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    CommonModule,
    AddMemberFormComponent,
    EditMemberFormComponent,
    DeleteMemberModalComponent,
    VerificationModalComponent,
  ],
  templateUrl: './members.component.html',
  styleUrl: './members.component.css'
})
export class MembersComponent implements OnInit {
  @Output() memberAdded = new EventEmitter<Member>();
  @Output() memberEdited = new EventEmitter<Member>();
  members: Member[] = [];
  loading: boolean = true;
  error: string = '';
  currentUser: any = null;
  isAddModalOpen = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  isVerificationModalOpen = false;
  deleteMessage = '';
  memberToDelete: Member | null = null;
  selectedMember: Member | null = null;
  memberToVerify: string | null = null;
  paginatedMembers: any[] = [];
  currentPaginationState: PaginationState;
  private paginationSubscription: Subscription = new Subscription();

  constructor(
    private memberService: MemberService,
    private authService: AuthService,
    private paginationService: PaginationService,
  ) {
    this.currentPaginationState = {
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0
    }
  }

  ngOnInit(): void {
    this.loadMembers();
  
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      console.log('Current user:', user);
    });
  
    this.paginationSubscription = this.paginationService.paginationState$.subscribe(state => {
      this.currentPaginationState = state;
      this.updatePaginatedMembers();
    });
  }
  
  private updatePaginatedMembers(): void {
    const startIndex = (this.currentPaginationState.currentPage - 1) * this.currentPaginationState.pageSize;
    const endIndex = startIndex + this.currentPaginationState.pageSize;
    this.paginatedMembers = this.members.slice(startIndex, endIndex);
  }

  ngOnDestroy() {
    if (this.paginationSubscription) {
      this.paginationSubscription.unsubscribe();
    }
  }

  onPageChange(page: number) {
    this.paginationService.setPage(page);
  }

  getStartIndex(): number {
    return (this.currentPaginationState.currentPage - 1) * this.currentPaginationState.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(
      this.currentPaginationState.currentPage * this.currentPaginationState.pageSize,
      this.currentPaginationState.totalItems
    );
  }

  getPageRange(): number[] {
    return this.paginationService.getPageRange();
  }

  loadMembers(): void {
    this.loading = true;
    this.memberService.getMembers().subscribe({
      next: (response) => {
        console.log('Members with verifier:', response.data);
        this.members = response.data;
        // Update pagination after members are loaded
        this.paginationService.updateState({
          totalItems: this.members.length,
          pageSize: 10,
          currentPage: 1
        });
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Failed to load members';
        this.loading = false;
      }
    });
  }

handleImageError(event: any, member: Member) {
  // If image fails to load, show initials placeholder
  this.showInitialPlaceholder(event.target, member);
  return;
}


showInitialPlaceholder(imgElement: HTMLImageElement, member: Member) {

  imgElement.style.display = 'none';


  const parentElement = imgElement.parentElement;
  if (!parentElement) return;


  const initialsDiv = document.createElement('div');
  initialsDiv.className = 'w-full h-full flex items-center justify-center bg-blue-500 text-white rounded-full';
  const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`;
  initialsDiv.textContent = initials;

  // Remove any existing initials div
  const existingInitials = parentElement.querySelector('.initials-placeholder');
  if (existingInitials) {
    parentElement.removeChild(existingInitials);
  }


  parentElement.appendChild(initialsDiv);
}

  openAddMemberModal(): void {
    this.isAddModalOpen = true;
  }

  closeAddMemberModal(): void {
    this.isAddModalOpen = false;
  }

  addMember(newMember: any): void {
    this.members = [...this.members, newMember];
    this.paginationService.updateState({
      totalItems: this.members.length
    });
    this.closeAddMemberModal();
  }

  onEdit(member: Member): void {
    this.selectedMember = { ...member };
    this.isEditModalOpen = true;
  }

  closeEditMemberModal(): void {
    this.isEditModalOpen = false;
    this.selectedMember = null;
  }

  updateMember(updatedMember: Member): void {
    const index = this.members.findIndex(m => m.id === updatedMember.id);
    if (index !== -1) {
      this.members = [
        ...this.members.slice(0, index),
        updatedMember,
        ...this.members.slice(index + 1)
      ];
      this.updatePaginatedMembers();
    }
    this.closeEditMemberModal();
  }

  openDeleteMemberModal(member: Member): void {
    this.memberToDelete = member;
    this.isDeleteModalOpen = true;
  }

  closeDeleteMemberModal(): void {
    this.isDeleteModalOpen = false;
    this.memberToDelete = null;
  }

  deleteMember(): void {
    if (this.memberToDelete?.id) {
      this.memberService.deleteMember(this.memberToDelete.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.members = this.members.filter(members => members.id !== this.memberToDelete?.id);
            this.paginationService.updateState({
              totalItems: this.members.length
            });
          }
          this.closeDeleteMemberModal();
        },
        error: (error) => {
          this.error = 'Failed to delete member';
          this.closeDeleteMemberModal();
        }
      });
    }
    }

    formatDate(date: Date | null): string {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0'); 
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
  getBooleanText(value: boolean): string {
      return value ? 'Yes' : 'No';
  }

getGenderClass(status: string): string {
  switch (status.toLowerCase().trim()) {
    case 'male':
      return 'gender-male';
    case 'female':
      return 'gender-female';
    default:
      return 'gender-default';
  }
}


getStatus(status: string): string {
  switch (status.toLowerCase().trim()) {
    case 'active':
      return 'status-active';
    case 'inactive':
      return 'status-inactive';
    case 'suspended':
      return 'status-suspended';
    default:
      return 'status-default';
  }
}

getMaritalStatus(status: string): string {
  switch (status.toLowerCase().trim()) {
    case 'single':
      return 'marital-single';
    case 'married':
      return 'marital-married';
    case 'widowed':
      return 'marital-widowed';
    case 'divorced':
      return 'marital-divorced';
    default:
      return 'marital-default';
  }
}


  toSentenceCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  getVerifierName(member: Member): string {
    if (!member.verifier) {
      console.log('No verifier data for member:', member.id);
      return '-';
    }
    return member.verifier.username;
  }

  openVerificationModal(member: Member): void {
    if (member?.id !== undefined) {
      this.memberToVerify = member.id.toString();
      this.isVerificationModalOpen = true;
    }
    else {
      console.error('Invalid member ID');
    }
  }

  closeVerificationModal() {
    this.isVerificationModalOpen = false;
    this.memberToVerify = null;
  }

  verifyMember() {
    if (this.memberToVerify) {
      this.memberService.verifyMember(parseInt(this.memberToVerify)).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const index = this.members.findIndex(m => m.id === parseInt(this.memberToVerify!));
            if (index !== -1) {
              // Update the member with the complete response data
              this.members[index] = response.data;
            }
            this.closeVerificationModal();
          }
        },
        error: (error) => {
          console.error('Error verifying member:', error);
        }
      });
    }
  }
}