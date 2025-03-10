import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Member, RelationshipResponse } from '../../core/models/member';
import { MemberService } from '../../core/services/member.service';
import { AuthService } from '../../core/services/auth.service';
import { DeleteMemberModalComponent } from '../../shared/modals/delete-member-modal/delete-member-modal.component';
import { VerificationModalComponent } from '../../shared/modals/verification-modal/verification-modal.component';
import { PaginationService, PaginationState } from '../../core/services/pagination.service';
import { finalize, Subscription } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FamilyRelationshipComponent } from '../../shared/components/family-relationship/family-relationship.component';
import { RelationshipRequestsModalComponent } from '../../shared/modals/relationship-requests-modal/relationship-requests-modal.component';
import { MemberFormComponent } from '../../shared/modals/member-form/member-form.component';
import { RelationshipNotificationIndicatorComponent } from '../../shared/components/relationship-notification-indicator/relationship-notification-indicator.component';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    CommonModule,
    DeleteMemberModalComponent,
    RelationshipRequestsModalComponent,
    VerificationModalComponent,
    MemberFormComponent,
    RelationshipNotificationIndicatorComponent,
    FamilyRelationshipComponent
  ],
  templateUrl: './members.component.html',
  styleUrl: './members.component.css'
})
export class MembersComponent implements OnInit {
  @Output() memberAdded = new EventEmitter<Member>();
  @Output() memberEdited = new EventEmitter<Member>();
  @Input() memberId!: string;

  //View state management
  viewMode: 'list' | 'relationships' = 'list';
  selectedMemberForRelationships: Member | null = null;

  memberForm: FormGroup;
  potentialSpouses: Member[] = [];
  relationship?: {
    member: Member;
    spouse: Member | null;
    children: Member[];
    parents: Member[];
  };
  members: Member[] = [];
  member!: Member;
  spouse: Member | null = null;
  loading: boolean = true;
  error: string = '';
  currentUser: any = null;
  currentMember: any; 
  isFormModalVisible = false;
  showRelationshipModal = false;
  formMode: 'add' | 'edit' = 'add';
  formMember: Member | null = null;
  isAddModalOpen = false;
  isEditModalOpen = false;
  isDeleteModalOpen = false;
  isVerificationModalOpen = false;
  deleteMessage = '';
  memberToDelete: Member | null = null;
  selectedMember: Member | null = null;
  memberToVerify: string | null = null;
  selectedMemberForMarriageConfirmation: any = null;
  paginatedMembers: any[] = [];
  currentPaginationState: PaginationState;
  showRelationships = false;
  relationshipData: RelationshipResponse['data'] | null = null;
  selectedMemberId: any ;
  pendingMarriageNotifications: any[] = [];
  private paginationSubscription: Subscription = new Subscription();

  constructor(
    private memberService: MemberService,
    private authService: AuthService,
    private paginationService: PaginationService,
    private fb: FormBuilder,
  ) {
    this.currentPaginationState = {
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      totalPages: 0
    }

    this.memberForm = this.fb.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      dob: ['', Validators.required],
      gender: ['', [Validators.required, Validators.pattern('^(male|female)$')]],
      marital_status: ['Single'],
      spouse_id: [{ value: '', disabled: true }],
      marriage_date: [{ value: '', disabled: true }],
      mobile_number: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      aadhar_number: ['', Validators.required],
      address: ['', Validators.required],
      profile_image: [null],
      status: ['active'],
      is_verified: [false],
      deceased: [false]
    });
  }

  ngOnInit(): void {
    this.loadMembers();
    this.setupSubscriptions();
    this.setupFormSubscriptions();

    if (this.memberId) {
      this.loadMemberById(this.memberId);
    }
  
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
      if (user && user.id) {
        this.checkForPendingMarriageRequests();
      }
    });
  
    this.paginationSubscription = this.paginationService.paginationState$.subscribe(state => {
      this.currentPaginationState = state;
      this.updatePaginatedMembers();
    });
  }

  //Subscription for current user
  private setupSubscriptions(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  //Subscription to handle marital status changes
  private setupFormSubscriptions(): void {
    this.memberForm.get('marital_status')?.valueChanges.subscribe(status => {
      const spouseControl = this.memberForm.get('spouse_id');
      const MarriageDataControl = this.memberForm.get('marriage_date');

      if (status === 'Married') {
        spouseControl?.enable();
        MarriageDataControl?.enable();
        this.loadPotentialSpouses();
      }
      else {
        spouseControl?.disable();
        MarriageDataControl?.disable();
        this.potentialSpouses = [];
      }
    });
  }

  // =================== PAGINATION ===================

  // Update the paginated members list based on the current pagination state
  private updatePaginatedMembers(): void {
    const startIndex = (this.currentPaginationState.currentPage - 1) * this.currentPaginationState.pageSize;
    const endIndex = startIndex + this.currentPaginationState.pageSize;
    this.paginatedMembers = this.members.slice(startIndex, endIndex);
  }

  //Unsubscribe from pagination subscription
  ngOnDestroy() {
    if (this.paginationSubscription) {
      this.paginationSubscription.unsubscribe();
    }
  }

  // Handle page change event
  onPageChange(page: number) {
    this.paginationService.setPage(page);
  }

  // Get the start index for the current page
  getStartIndex(): number {
    return (this.currentPaginationState.currentPage - 1) * this.currentPaginationState.pageSize + 1;
  }

  // Get the end index for the current page
  getEndIndex(): number {
    return Math.min(
      this.currentPaginationState.currentPage * this.currentPaginationState.pageSize,
      this.currentPaginationState.totalItems
    );
  }

  // Get the range of pages for pagination
  getPageRange(): number[] {
    return this.paginationService.getPageRange();
  }

  // =================== MEMBER MANAGEMENT ===================

  // Load all members from the service
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

  // =================== HANDLE IMAGE ===================

  // Handle image loading errors by showing initials placeholder
  handleImageError(event: any, member: Member) {
    // If image fails to load, show initials placeholder
    this.showInitialPlaceholder(event.target, member);
    return;
  }

  // Show initials placeholder when image fails to load
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

  // =================== MEMBER FORM ===================
  
  // Open the add member modal
  openAddMemberModal(): void {
    this.formMode = 'add';
    this.formMember = null;
    this.isFormModalVisible = true;
  }

  // Close the add member modal
  onEdit(member: Member): void {
    this.formMode = 'edit';
    this.formMember = { ...member };
    this.isFormModalVisible = true;
  }

  onMemberSaved(savedMember: Member): void {
    if (this.formMode === 'add') {
      this.members = [...this.members, savedMember];
      this.memberAdded.emit(savedMember);
      this.paginationService.updateState({
        totalItems: this.members.length
      });
    } else {
      // Update existing member in the list
      const index = this.members.findIndex(m => m.id === savedMember.id);
      if (index !== -1) {
        this.members = [
          ...this.members.slice(0, index),
          savedMember,
          ...this.members.slice(index + 1)
        ];
        this.memberEdited.emit(savedMember);
        this.updatePaginatedMembers();
      }
    }
    // Close the modal
    this.isFormModalVisible = false;
  }

  onFormCancelled(): void {
    this.isFormModalVisible = false;
  }
  

  // =================== DELETE MEMBER MODAL ===================

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

  // =================== MEMBER TABLE ===================

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

  // =================== VERIFY MEMBER FORM ===================

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

  // =================== MARRIAGE MANAGEMENT ===================

  openMarriageConfirmationModal(member: any): void {
    console.log(member,
      'member'
    )
    this.selectedMemberForMarriageConfirmation = member;
    this.selectedMemberId = member.id; 
    console.log(this.selectedMemberId,'this.selectedMemberId')
    setTimeout(() => {
      this.showRelationshipModal = true;
    }, 100);
  }
  
  hideRelationshipModal(): void {
    this.showRelationshipModal = false;
    this.selectedMemberForMarriageConfirmation = null;
  }
  
  // Handle creating a marriage request
  createMarriageRequest(marriageData: any): void {
    this.memberService.createMarriageRequest(marriageData).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccessToast('Marriage request sent successfully');
          // Refresh data after creating request
          this.loadMembers();
        }
      },
      error: (error) => {
        this.error = 'Failed to send marriage request';
        console.error(error);
      }
    });
  }

  // Handle confirming a marriage
  confirmMarriage(marriageId: number): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.error('No current user found');
      return;
    }
    console.log("Confirm marriage", marriageId);
    
    
    this.memberService.confirmMarriage(marriageId, this.currentUser.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccessToast('Marriage confirmed successfully');
          this.loadMembers();
          this.checkForPendingMarriageRequests();
        }
      },
      error: (error) => {
        console.error('Error confirming marriage:', error);
      }
    });
  }

  // Handle declining a marriage request
  declineMarriage(marriageId: number): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.error('No current user found');
      return;
    }
    
    this.memberService.declineMarriage(marriageId, this.currentUser.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccessToast('Marriage request declined');
          this.checkForPendingMarriageRequests();
        }
      },
      error: (error) => {
        console.error('Error declining marriage:', error);
      }
    });
  }

 // =================== DIVORCE MANAGEMENT ===================

  // Create divorce request for existing marriage
  createDivorceRequestForExisting(divorceData: { marriage_id: number; divorce_date: Date; requested_by: number }): void {
    this.memberService.createDivorceRequestForExisting(divorceData).subscribe({
      next: (response) => {
        if (response) {
          this.showSuccessToast('Divorce request sent successfully');
          this.loadMembers();
        }
      },
      error: (error) => {
        this.error = 'Failed to send divorce request';
        console.error(error);
      }
    });
  }

  // Create divorce request for new marriage (not in system)
  createDivorceRequestForNew(divorceData: { 
    husband_id: number; 
    wife_id: number; 
    marriage_date: Date;
    divorce_date: Date; 
    requested_by: number 
  }): void {
    this.memberService.createDivorceRequestForNew(divorceData).subscribe({
      next: (response) => {
        if (response) {
          this.showSuccessToast('Divorce request sent successfully');
          this.loadMembers();
        }
      },
      error: (error) => {
        this.error = 'Failed to send divorce request';
        console.error(error);
      }
    });
  }

  // Confirm divorce
  confirmDivorce(divorceId: number, marriageDate?: Date): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.error('No current user found');
      return;
    }
    
    this.memberService.confirmDivorce(divorceId, this.currentUser.id, marriageDate).subscribe({
      next: (response) => {
        if (response) {
          this.showSuccessToast('Divorce confirmed');
          this.loadMembers();
        }
      },
      error: (error) => {
        console.error('Error confirming divorce:', error);
      }
    });
  }

  // Decline divorce
  declineDivorce(divorceId: number): void {
    if (!this.currentUser || !this.currentUser.id) {
      console.error('No current user found');
      return;
    }
    
    this.memberService.declineDivorce(divorceId, this.currentUser.id).subscribe({
      next: (response) => {
        if (response) {
          this.showSuccessToast('Divorce request declined');
        }
      },
      error: (error) => {
        console.error('Error declining divorce:', error);
      }
    });
  }
  
  // Get pending divorce requests
  checkForPendingDivorceRequests(): void {
    if (this.currentUser && this.currentUser.id) {
      this.memberService.getPendingDivorceRequests(this.currentUser.id)
        .subscribe({
          next: (response) => {
            // Handle pending divorce requests
            console.log('Pending divorce requests:', response);
          },
          error: (error) => {
            console.error('Error fetching divorce requests:', error);
          }
        });
    }
  }

  // =================== DEATH MANAGEMENT ===================

  // Mark member as deceased
  markMemberDeceased(memberId: number, deathDate?: string): void {
    this.memberService.markMemberDeceased(memberId, deathDate).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccessToast('Member marked as deceased');
          this.loadMembers();
        }
      },
      error: (error) => {
        console.error('Error marking member as deceased:', error);
      }
    });
  }

  // Mark marriage as widowed
  markMarriageWidowed(marriageId: number, deceasedSpouseId: number, deathDate?: string): void {
    this.memberService.markMarriageWidowed(marriageId, deceasedSpouseId, deathDate).subscribe({
      next: (response) => {
        if (response.success) {
          this.showSuccessToast('Marriage marked as widowed');
          this.loadMembers();
        }
      },
      error: (error) => {
        console.error('Error marking marriage as widowed:', error);
      }
    });
  }

  // =================== NOTIFICATION & RELATIONSHIP HANDLING ===================

  handleRelationshipAction(event: any): void {
    // Refresh member list to show updated relationship statuses
    this.loadMembers();
    
    // Show appropriate success notification based on the action
    switch(event.action) {
      case 'marriage_confirmed':
        this.showSuccessToast(`Marriage confirmed successfully with ${event.partner.first_name} ${event.partner.last_name}`);
        break;
      case 'marriage_rejected':
        this.showSuccessToast(`Marriage request from ${event.partner.first_name} ${event.partner.last_name} has been rejected`);
        break;
      case 'divorce_confirmed':
        this.showSuccessToast(`Divorce confirmed with ${event.partner.first_name} ${event.partner.last_name}`);
        break;
      case 'divorce_rejected':
        this.showSuccessToast(`Divorce request from ${event.partner.first_name} ${event.partner.last_name} has been rejected`);
        break;
    }
  }
  
  showSuccessToast(message: string): void {
    // Implement your toast notification here
    console.log(message);
    // You can implement a more visual toast notification if needed
  }

  clearMarriageNotification(marriageId: number): void {
    // Filter out the notification from the array
    this.pendingMarriageNotifications = this.pendingMarriageNotifications.filter(
      notification => notification.id !== marriageId
    );
  }

  checkForPendingMarriageRequests(): void {
    if (this.currentUser && this.currentUser.id) {
      this.memberService.getPendingMarriageRequests(this.currentUser.id)
        .subscribe({
          next: (response) => {
            if (response.data && response.data.length > 0) {
              this.pendingMarriageNotifications = response.data;
            } else {
              this.pendingMarriageNotifications = [];
            }
          },
          error: (error) => {
            console.error('Error fetching marriage requests:', error);
          }
        });
    }
  }

  // =================== RELATIONSHIP MANAGEMENT ===================

  viewRelationships(member: Member): void {
    this.selectedMemberId = member.id;
    this.showRelationships = true;
    this.loadRelationships(member.id);
  }

  onBackToList(): void {
    this.showRelationships = false;
    this.selectedMemberId = null;
  }

  // Load a specific member by ID
  loadMemberById(memberId: string): void {
    this.loading = true;
    this.memberService.getMember(parseInt(memberId))
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.selectedMemberForRelationships = response.data;
            this.loadRelationships(parseInt(memberId));
          } else {
            this.error = 'Member not found';
          }
        },
        error: (err) => {
          this.error = 'Failed to load member';
          console.error(err);
        }
      });
  }
  
  // View relationships for a specific member
  viewMemberRelationships(member: Member): void {
    this.selectedMemberForRelationships = member;
    this.loadRelationships(member.id);
    this.viewMode = 'relationships';
  }
  
  // Load relationships for a specific member
  loadRelationships(memberId: number): void {
    this.loading = true;
    this.memberService.getRelationships(memberId)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (response: RelationshipResponse) => {  // Ensure correct response type
          if (response.success && response.data) {
            this.relationshipData = response.data;  // Directly assign the correct structure
            this.error = '';
          }
        },
        error: (err) => {
          this.error = 'Failed to load relationships';
          console.error(err);
        }
      });
  }
  
    
  // Navigate back to the members list view
  backToMembersList(): void {
    this.viewMode = 'list';
    this.selectedMemberForRelationships = null;
    this.relationshipData = null;
  }
  
  // Load potential spouses for the current member
  private loadPotentialSpouses() {
    // This method would need to be implemented if the API supports it
    // For now, we'll use a placeholder implementation
    const memberId = this.memberForm.get('id')?.value;
    if (memberId) {
      // Filter members to find potential spouses (opposite gender, not married)
      const gender = this.memberForm.get('gender')?.value;
      const oppositeGender = gender === 'male' ? 'female' : 'male';
      
      this.potentialSpouses = this.members.filter(m => 
        m.id !== memberId && 
        m.gender.toLowerCase() === oppositeGender &&
        m.marital_status.toLowerCase() === 'single' &&
        !m.deceased
      );
    }
  }

  handleRelationshipRequest(event: {type: string, request: any}): void {
    console.log('Relationship request action:', event);
    // Show the modal with the current member ID
    this.showRelationshipModal = true;
  }

  closeRelationshipModal(): void {
    this.showRelationshipModal = false;
  }

  handleRelationshipActionCompleted(event: any): void {
    console.log('Relationship action completed:', event);
    // You can update UI or show notifications based on the action
    // e.g., marriage_confirmed, marriage_rejected, divorce_confirmed, divorce_rejected
  }
}