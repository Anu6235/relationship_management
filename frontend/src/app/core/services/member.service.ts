import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ParentTable } from '../models/member';
import {
  DeathData,
  MarriageData,
  Member,
  MemberResponse,
  RelationshipResponse,
  SingleMemberResponse,
} from '../models/member';


@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private readonly API_URL = 'relationship-management.onrender.com/api/members';
  private readonly BASE_URL = 'relationship-management.onrender.com';
  private http = inject(HttpClient);

  constructor() {}

  // =================== MEMBER MANAGEMENT ===================

  // Get all members (with optional gender filter)
  getMembers(gender?: string): Observable<MemberResponse> {
    let url = this.API_URL;
    if (gender) {
      url += `?gender=${gender}`; // Append query parameter if gender is provided
    }

    return this.http.get<MemberResponse>(url).pipe(
      map((response) => {
        if (response.data && Array.isArray(response.data)) {
          response.data = response.data.map((member) => this.processImageUrls(member));
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Get single member
  getMember(id: number): Observable<SingleMemberResponse> {
    return this.http.get<SingleMemberResponse>(`${this.API_URL}/${id}`).pipe(
      map((response) => {
        if (response.data) {
          response.data = this.processImageUrls(response.data);
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Create a new member
  createMember(memberData: any, imageFile: File | null): Observable<SingleMemberResponse> {
    const formData = new FormData();
    Object.keys(memberData).forEach((key) => {
      formData.append(key, memberData[key] instanceof Date ? memberData[key].toISOString() : memberData[key]);
    });
    if (imageFile) {
      formData.append('profile_image', imageFile);
    }
    return this.http.post<SingleMemberResponse>(this.API_URL, formData).pipe(
      map((response) => {
        if (response.data) {
          response.data = this.processImageUrls(response.data);
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Update a member
  updateMember(id: number, memberData: any, imageFile: File | null, removeImage = false): Observable<SingleMemberResponse> {
    const formData = new FormData();
    Object.keys(memberData).forEach((key) => {
      if (memberData[key] !== null) {
        formData.append(key, memberData[key] instanceof Date ? memberData[key].toISOString() : memberData[key].toString());
      }
    });
    if (imageFile) {
      formData.append('profile_image', imageFile);
    }
    if (removeImage) {
      formData.append('remove_image', 'true');
    }
    return this.http.put<SingleMemberResponse>(`${this.API_URL}/${id}`, formData).pipe(
      map((response) => {
        if (response.data) {
          response.data = this.processImageUrls(response.data);
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Delete a member
  deleteMember(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Verify a member
  verifyMember(memberId: number): Observable<SingleMemberResponse> {
    return this.http.put<SingleMemberResponse>(`${this.API_URL}/${memberId}/verify`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // =================== MARRIAGE MANAGEMENT ===================

  // Create a marriage request
  createMarriageRequest(marriageData: MarriageData): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/marriage`, marriageData).pipe(
      catchError(this.handleError)
    );
  }

  // Confirm a marriage
  confirmMarriage(marriageId: number, respondingMemberId: number): Observable<any> {
    console.log(marriageId,'marriageId')
    console.log(respondingMemberId,'respondingMemberId')
    return this.http.put<any>(`${this.API_URL}/marriage/${marriageId}/confirm`, {
      responding_member_id: respondingMemberId,
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Decline a marriage request
  declineMarriage(marriageId: number, respondingMemberId: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/marriage/${marriageId}/decline`, {
      responding_member_id: respondingMemberId,
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get pending marriage requests for a member
  getPendingMarriageRequests(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/marriage-requests/${memberId}`).pipe(
      map(response => {
        // Process image URLs for husband and wife in each request
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach((request: ParentTable) => {
            if (request.husband) {
              request.husband = this.processImageUrls(request.husband);
            }
            if (request.wife) {
              request.wife = this.processImageUrls(request.wife);
            }
          });
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // =================== DIVORCE MANAGEMENT ===================

// Create a divorce request for existing marriage
createDivorceRequestForExisting(divorceData: { 
  marriage_id: number; 
  divorce_date: Date; 
  requested_by: number 
}): Observable<any> {
  return this.http.post(`${this.API_URL}/divorce/existing`, divorceData).pipe(
    catchError(this.handleError)
  );
}

// Create a divorce request for marriage not in system
createDivorceRequestForNew(divorceData: { 
  husband_id: number; 
  wife_id: number; 
  marriage_date: Date;
  divorce_date: Date; 
  requested_by: number 
}): Observable<any> {
  return this.http.post(`${this.API_URL}/divorce/new`, divorceData).pipe(
    catchError(this.handleError)
  );
}

// Confirm a divorce
confirmDivorce(
  divorceId: number, 
  respondingMemberId: number, 
  marriageDate?: Date
): Observable<any> {
  return this.http.put(`${this.API_URL}/divorce/${divorceId}/confirm`, {
    responding_member_id: respondingMemberId,
    marriage_date: marriageDate
  }).pipe(
    catchError(this.handleError)
  );
}

// Decline a divorce request
declineDivorce(
  divorceId: number, 
  respondingMemberId: number
): Observable<any> {
  return this.http.put(`${this.API_URL}/divorce/${divorceId}/decline`, {
    responding_member_id: respondingMemberId,
  }).pipe(
    catchError(this.handleError)
  );
}

// Get pending divorce requests for a member
getPendingDivorceRequests(memberId: number): Observable<any> {
  return this.http.get(`${this.API_URL}/divorce-requests/${memberId}`).pipe(
    catchError(this.handleError)
  );
}

  // =================== RELATIONSHIP MANAGEMENT ===================

  // Get all relationships for a member
  getRelationships(memberId: number): Observable<RelationshipResponse> {
    return this.http.get<RelationshipResponse>(`${this.API_URL}/${memberId}/relationships`).pipe(
      map(response => {
        // Process all member objects that have images
        if (response.data) {
          if (response.data.member) {
            response.data.member = this.processImageUrls(response.data.member);
          }
          
          // Process relationship objects
          const relationships = response.data.relationships;
          if (relationships) {
            // Process spouse
            if (relationships.spouse) {
              relationships.spouse = this.processImageUrls(relationships.spouse);
            }
            
            // Process divorced spouses
            if (relationships.divorced_spouses && Array.isArray(relationships.divorced_spouses)) {
              relationships.divorced_spouses = relationships.divorced_spouses.map(spouse => 
                this.processImageUrls(spouse)
              );
            }
            
            // Process widowed spouses
            if (relationships.widowed_spouses && Array.isArray(relationships.widowed_spouses)) {
              relationships.widowed_spouses = relationships.widowed_spouses.map(spouse => 
                this.processImageUrls(spouse)
              );
            }
            
            // Process pending spouses
            if (relationships.pending_spouses && Array.isArray(relationships.pending_spouses)) {
              relationships.pending_spouses = relationships.pending_spouses.map(spouse => 
                this.processImageUrls(spouse)
              );
            }
            
            // Process children
            if (relationships.children && Array.isArray(relationships.children)) {
              relationships.children = relationships.children.map(child => 
                this.processImageUrls(child)
              );
            }
            
            // Process parents
            if (relationships.parents && Array.isArray(relationships.parents)) {
              relationships.parents = relationships.parents.map(parent => 
                this.processImageUrls(parent)
              );
            }
          }
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }


  // Get all marriages for a member
  getMemberMarriages(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${memberId}/marriages`).pipe(
      catchError(this.handleError)
    );
  }

  // =================== DEATH MANAGEMENT ===================

 // Mark a member as deceased
markMemberDeceased(memberId: number, deathDate?: string): Observable<any> {
  // Fix: Remove the duplicate 'members/' in the path
  return this.http.put<any>(`${this.API_URL}/${memberId}/mark-deceased`, {
    death_date: deathDate || new Date().toISOString(),
  }).pipe(
    catchError(this.handleError)
  );
}
  // Mark a marriage as widowed
  markMarriageWidowed(marriageId: number, deceasedSpouseId: number, deathDate?: string): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/marriage/${marriageId}/widowed`, {
      deceased_spouse_id: deceasedSpouseId,
      death_date: deathDate || new Date().toISOString(),
    }).pipe(
      catchError(this.handleError)
    );
  }

  // =================== UTILITY METHODS ===================

  // Process image URLs
  private processImageUrls(member: Member): Member {
    const updatedMember = { ...member };

    if (updatedMember.profile_image) {
      updatedMember.profile_image_url = `${this.BASE_URL}${updatedMember.profile_image}`;
    } else {
      updatedMember.profile_image_url = null;
    }

    return updatedMember;
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = error.error?.message || `Error Code: ${error.status}, Message: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  //NEW ADDTIONS
  // Add these to your MemberService
getUnmarriedMembersByGender(gender: string): Observable<MemberResponse> {
  return this.http.get<MemberResponse>(`${this.API_URL}/unmarried-by-gender/${gender}`).pipe(
    map((response) => {
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map((member) => this.processImageUrls(member));
      }
      return response;
    }),
    catchError(this.handleError)
  );
}


  // Add these to your MemberService
  getWifeDetailsByHusbandId(id: any): Observable<MemberResponse> {
    return this.http.get<MemberResponse>(`${this.API_URL}/get_wife/${id}`).pipe(
      map((response) => {
        if (response.data && Array.isArray(response.data)) {
          response.data = response.data.map((member) => this.processImageUrls(member));
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

getDeceasedMembersByGender(gender: string): Observable<MemberResponse> {
  return this.http.get<MemberResponse>(`${this.API_URL}/deceased-by-gender/${gender}`).pipe(
    map((response) => {
      if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map((member) => this.processImageUrls(member));
      }
      return response;
    }),
    catchError(this.handleError)
  );
}



getMarriageBySpouseIds(husbandId: any, wifeId: any): Observable<MemberResponse> {
  return this.http.get<MemberResponse>(
    `${this.API_URL}/get_marriage/spouses`, 
    { params: { husband_id: husbandId.toString(), wife_id: wifeId.toString() } }
  ).pipe(
    map((response) => {
      
      return response;
    }),
    catchError(this.handleError)
  );
}
}