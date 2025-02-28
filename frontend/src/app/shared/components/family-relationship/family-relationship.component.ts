import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Member } from '../../../core/models/member';
import { MemberService } from '../../../core/services/member.service';


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
    spouse: Member | null;
    children: Member[];
    parents: Member[];
  } | null = null;
  
  loading = true;
  error = false;
  errorMessage = '';
  baseUrl = '';

  constructor(
    private memberService: MemberService,
    private router: Router
  ) {
    // Set the base URL for API calls
    // Replace with your actual API URL from environment config if available
    this.baseUrl ='http://localhost:5000';
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
        next: (data) => {
          this.relationshipData = data;
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

  confirmMarriage(marriageId: number): void {
    this.memberService.confirmMarriage(marriageId).subscribe({
      next: (response) => {
        // Refresh relationship data
        this.fetchRelationshipData();
      },
      error: (error) => {
        console.error('Error confirming marriage:', error);
      }
    });
  }

  // New method to handle image URLs
  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    
    // If the path is already a full URL, return it as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Otherwise, join with the base URL
    // Make sure the path doesn't have leading slash if baseUrl ends with slash
    if (imagePath.startsWith('/') && this.baseUrl.endsWith('/')) {
      return this.baseUrl + imagePath.substring(1);
    }
    
    // Make sure we have a slash between baseUrl and imagePath
    if (!this.baseUrl.endsWith('/') && !imagePath.startsWith('/')) {
      return `${this.baseUrl}/${imagePath}`;
    }
    
    return this.baseUrl + imagePath;
  }

  handleImageError(event: any, member: Member) {
    const imgElement = event.target;
    imgElement.style.display = 'none';
    
    const parentElement = imgElement.parentElement;
    if (!parentElement) return;
    
    // Check if we already created an initials div for this element
    const existingInitials = parentElement.querySelector('div');
    if (existingInitials) {
      // If it exists but is hidden, show it
      existingInitials.style.display = 'flex';
      return;
    }
    
    // Otherwise create a new initials div
    const initialsDiv = document.createElement('div');
    initialsDiv.className = 'w-full h-full flex items-center justify-center bg-blue-500 text-white rounded-full';
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
    if (!gender) return 'gender-default';
    
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
    if (!status) return 'status-default';
    
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
    if (!status) return 'marital-default';
    
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
}