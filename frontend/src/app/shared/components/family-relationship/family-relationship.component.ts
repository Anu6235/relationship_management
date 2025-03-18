import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Member } from '../../../core/models/member';
import { MemberService } from '../../../core/services/member.service';

interface RelationshipResponse {
  success: boolean;
  data: {
    member: Member;
    relationships: {
      spouse: Member[];
      divorced_spouses: Member[];
      widowed_spouses: Member[];
      pending_spouses: any[]; 
      pending_divorces: any[]; 
      children: Member[];
      parents: Member[];
      marriages: any[];
    }
  };
}


@Component({
  selector: 'app-family-relationship',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './family-relationship.component.html',
  styleUrl: './family-relationship.component.css'
})
export class FamilyRelationshipComponent implements OnInit {
  @Input() memberId!: number;
  @Output() backToList = new EventEmitter<void>();
  
  relationshipData: {
    member: Member;
    spouse: Member[];
    divorced_spouses: Member[];
    widowed_spouses: Member[];
    pending_spouses: any[];
    pending_divorces: any[];  
    children: Member[];
    parents: Member[];
    marriages: any[];
  } | null = null;
  
  loading = true;
  error = false;
  errorMessage = '';
  baseUrl = '';

  constructor(
    private memberService: MemberService,
    private router: Router
  ) {
    this.baseUrl = 'http://localhost:5000';
  }

  ngOnInit(): void {
    if (this.memberId) {
      this.fetchRelationshipData();
    } else {
      this.error = true;
      this.errorMessage = 'No member ID provided';
      this.loading = false;
    }
  }

  fetchRelationshipData(): void {
    this.loading = true;
    this.memberService.getRelationships(this.memberId)
      .subscribe({
        next: (response: RelationshipResponse) => {
          if (response.success && response.data) {
            this.relationshipData = {
              member: response.data.member,
              spouse: response.data.relationships.spouse,
              divorced_spouses: response.data.relationships.divorced_spouses,
              widowed_spouses: response.data.relationships.widowed_spouses,
              pending_spouses: response.data.relationships.pending_spouses.map(request => ({
                ...request,
                request_id: request.request_id
              })),
              pending_divorces: response.data.relationships.pending_divorces?.map(request => ({
                ...request,
                request_id: request.request_id
              })) || [],
              children: response.data.relationships.children,
              parents: response.data.relationships.parents,
              marriages: response.data.relationships.marriages
            };
          } else {
            this.error = true;
            this.errorMessage = 'Invalid data format received';
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = true;
          this.errorMessage = 'Error loading data: ' + (err.message || 'Unknown error');
          this.loading = false;
        }
      });
  }

  goBack(): void {
    this.backToList.emit();
  }

  navigateToMember(id: number | undefined): void {
    if (id) {
      // Load the relationship data for the new member
      this.memberId = id;
      this.fetchRelationshipData();
    }
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    return `${this.baseUrl}${imagePath}`;
  }

  handleImageError(event: any, member: Member) {
    const imgElement = event.target;
    imgElement.style.display = 'none';
    
    const parentElement = imgElement.parentElement;
    if (!parentElement) return;
    
    // Check if we already created an initials div for this element
    const existingInitials = parentElement.querySelector('div');
    if (existingInitials) {
      existingInitials.style.display = 'flex';
      return;
    }
    
    // Else create a new initials div
    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'avatar-initials';
    const initials = `${member.first_name.charAt(0)}${member.last_name.charAt(0)}`;
    initialsDiv.textContent = initials;
    
    parentElement.appendChild(initialsDiv);
  }

  formatDate(date: Date | string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-'; // Check for invalid date
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); 
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getBooleanText(value: boolean): string {
    return value ? 'Yes' : 'No';
  }

  getGenderClass(gender: string): string {
    if (!gender) return 'bg-gray-100 text-gray-800 gender-default';
    
    switch (gender.toLowerCase().trim()) {
      case 'male':
        return 'bg-blue-100 text-blue-800 gender-male';
      case 'female':
        return 'bg-pink-100 text-pink-800 gender-female';
      default:
        return 'bg-gray-100 text-gray-800 gender-default';
    }
  }

  getStatus(status: string): string {
    if (!status) return 'text-gray-600 status-default';
    
    switch (status.toLowerCase().trim()) {
      case 'active':
        return 'text-green-600 font-medium status-active';
      case 'inactive':
        return 'text-gray-600 status-inactive';
      case 'suspended':
        return 'text-red-600 font-medium status-suspended';
      default:
        return 'text-gray-600 status-default';
    }
  }

  getMaritalStatus(status: string): string {
    if (!status) return 'bg-gray-100 text-gray-800 marital-default';
    
    switch (status.toLowerCase().trim()) {
      case 'single':
        return 'bg-gray-100 text-gray-800 marital-single';
      case 'married':
        return 'bg-green-100 text-green-800 marital-married';
      case 'widowed':
        return 'bg-purple-100 text-purple-800 marital-widowed';
      case 'divorced':
        return 'bg-orange-100 text-orange-800 marital-divorced';
      default:
        return 'bg-gray-100 text-gray-800 marital-default';
    }
  }

  toSentenceCase(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  confirmMarriage(requestId: number): void {
    console.log('Marriage request ID:', requestId);
    console.log('Member ID:', this.memberId);
    if (!requestId) {
      console.error('Invalid request ID');
      return;
    }
    
    this.memberService.confirmMarriage(requestId, this.memberId)
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            // Remove the request from pending_spouses
            if (this.relationshipData && this.relationshipData.pending_spouses) {
              this.relationshipData.pending_spouses = this.relationshipData.pending_spouses.filter(
                spouse => spouse.request_id !== requestId
              );
            }
            
            // Refresh relationship data to show updated marriage status
            this.fetchRelationshipData();
          } else {
            console.error('Failed to confirm marriage:', response);
          }
        },
        error: (error) => {
          console.error('Error confirming marriage:', error);
        }
      });
  }
  
  rejectMarriage(requestId: number): void {
    if (!requestId) {
      console.error('Invalid request ID');
      return;
    }
    
    this.memberService.declineMarriage(requestId, this.memberId)
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            // Remove the request from pending_spouses
            if (this.relationshipData && this.relationshipData.pending_spouses) {
              this.relationshipData.pending_spouses = this.relationshipData.pending_spouses.filter(
                spouse => spouse.request_id !== requestId
              );
            }
          } else {
            console.error('Failed to reject marriage:', response);
          }
        },
        error: (error) => {
          console.error('Error rejecting marriage:', error);
        }
      });
  }

  confirmDivorce(requestId: number): void {
    console.log('Divorce request ID:', requestId);
    console.log('Member ID:', this.memberId);
    if (!requestId) {
      console.error('Invalid request ID');
      return;
    }
    
    this.memberService.confirmDivorce(requestId, this.memberId)
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            // Remove the request from pending_divorces
            if (this.relationshipData && this.relationshipData.pending_divorces) {
              this.relationshipData.pending_divorces = this.relationshipData.pending_divorces.filter(
                request => request.request_id !== requestId
              );
            }
            
            // Refresh relationship data to show updated marriage status
            this.fetchRelationshipData();
          } else {
            console.error('Failed to confirm divorce:', response);
          }
        },
        error: (error) => {
          console.error('Error confirming divorce:', error);
        }
      });
  }
  
  rejectDivorce(requestId: number): void {
    if (!requestId) {
      console.error('Invalid request ID');
      return;
    }
    
    this.memberService.declineDivorce(requestId, this.memberId)
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            // Remove the request from pending_divorces
            if (this.relationshipData && this.relationshipData.pending_divorces) {
              this.relationshipData.pending_divorces = this.relationshipData.pending_divorces.filter(
                request => request.request_id !== requestId
              );
            }
          } else {
            console.error('Failed to reject divorce:', response);
          }
        },
        error: (error) => {
          console.error('Error rejecting divorce:', error);
        }
      });
  }
}