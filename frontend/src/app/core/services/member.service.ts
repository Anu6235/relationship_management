import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { MemberParentTable, ParentChildRelationshipData, ParentChildResponse, ParentChildStatusUpdate, ParentTable } from '../models/member';
import { environment } from '../../../environments/environment';
import {
  DeathData,
  MarriageData,
  WidowedData,
  Member,
  MemberResponse,
  RelationshipResponse,
  SingleMemberResponse,
} from '../models/member';


@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private readonly API_URL = environment.MEMBERS_URL
  private readonly BASE_URL = environment.BASE_URL;
  private http = inject(HttpClient);

  constructor() {}

  // =================== MEMBER MANAGEMENT ===================

  // Get all members (with optional gender filter)
  getMembers(gender?: string): Observable<MemberResponse> {
    let url = this.API_URL;
    if (gender) {
      url += `?gender=${gender}`; 
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

  // Mark a member as deceased triggering the automation
  markMemberAsDeceased(deathData: DeathData): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/members/mark-deceased`, deathData).pipe(
      catchError(this.handleError)
    );
  }
  
  // =================== MARRIAGE MANAGEMENT ===================

  // Create multiple marraiges at once
  createMultipleMarriage(data: { marriages: any[], member_id: number, gender: string}): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/marriages`, data).pipe(
      catchError(this.handleError)
    );
  }

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
    marriage_id?: number;
    divorce_date?: Date;
    requested_by?: number;
    divorces?: Array<{
      marriage_id: number;
      divorce_date: Date;
      requested_by: number;
    }>;
  }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/divorce/existing`, divorceData).pipe(
      catchError(this.handleError)
    );
  }

  // Create a divorce request for marriage not in system
  createDivorceRequestForNew(divorceData: {
    husband_id?: number;
    wife_id?: number;
    marriage_date?: Date;
    divorce_date?: Date;
    requested_by?: number;
    divorces?: Array<{
      husband_id: number;
      wife_id: number;
      marriage_date: Date;
      divorce_date: Date;
      requested_by: number;
    }>;
  }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/divorce/new`, divorceData).pipe(
      catchError(this.handleError)
    );
  }

    // Create multiple divorce requests for existing marriages
    createMultipleDivorceExisting(data: { 
      divorces: Array<{
        marriage_id: number;
        divorce_date: Date;
      }>;
      member_id: number;
    }): Observable<any> {
      return this.http.post<any>(`${this.API_URL}/divorce/existing-multiple`, data).pipe(
        catchError(this.handleError)
      );
    }
    
    // Create multiple divorce requests for marriages not in system
    createMultipleDivorceNew(data: { divorces: any[], member_id: number, gender: string}): Observable<any> {
      return this.http.post<any>(`${this.API_URL}/divorce/new-multiple`, data).pipe(
        catchError(this.handleError)
      );
    }

  // Confirm a divorce request
  confirmDivorce(requestId: number, respondingMemberId: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/divorce/${requestId}/confirm`, {
      responding_member_id: respondingMemberId
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  declineDivorce(requestId: number, respondingMemberId: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/divorce/${requestId}/decline`, {
      responding_member_id: respondingMemberId
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Get pending divorce requests for a member
  getPendingDivorceRequests(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/divorce-requests/${memberId}`).pipe(
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


    // =================== WIDOWED MANAGEMENT ===================

  // Create a widowed request
  createWidowedRequest(widowedData: WidowedData): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/widowed`, widowedData).pipe(
      catchError(this.handleError)
    );
  }

    // Create multiple widowed records at once
    createMultipleWidowed(data: {
      widowed_records: { spouse_id: number; marriage_date: Date }[];
      member_id: number;
      gender: string;
    }): Observable<any> {
      return this.http.post<any>(`${this.API_URL}/widowed-multiple`, data).pipe(
        catchError(this.handleError)
      );
    }

  // Confirm a widowed request
  confirmWidowedRequest(requestId: number, respondingMemberId: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/widowed/${requestId}/confirm`, {
      responding_member_id: respondingMemberId,
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Decline a widowed request
  declineWidowedRequest(requestId: number, respondingMemberId: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/widowed/${requestId}/decline`, {
      responding_member_id: respondingMemberId,
    }).pipe(
      catchError(this.handleError)
    );
  }

    // Get pending widowed requests for a specific member
  getWidowedRequests(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/widowed-requests/${memberId}`).pipe(
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

  // Get member with all widowed history
  getMemberWidowedHistory(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/${memberId}/widowed-history`).pipe(
      map(response => {
        // Process image URLs for husband and wife in each record
        if (response.data && response.data.widowed_history && Array.isArray(response.data.widowed_history)) {
          response.data.widowed_history.forEach((record: ParentTable) => {
            if (record.husband) {
              record.husband = this.processImageUrls(record.husband);
            }
            if (record.wife) {
              record.wife = this.processImageUrls(record.wife);
            }
          });
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // =================== MULTIPLE RELATIONSHIP REQUEST MANAGEMENT ===================

  // Add this method to the MemberService class
  createHybridRelationships(data: {
    marriages?: { spouse_id: number; marriage_date: Date }[];
    divorces?: { spouse_id: number; marriage_date?: Date; divorce_date: Date }[];
    widowed_records?: { spouse_id: number; marriage_date: Date }[];
    member_id: number;
    gender: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/multiple-relationship-request`, data).pipe(
      catchError(this.handleError)
    );
  }

  // =================== CHILD PARENT MANAGEMENT ===================

  // Get parent list
  getAllParentRelationships(): Observable<{
    success: boolean;
    count: number;
    data: {
      id: number;
      name: string;
      status: 'confirmed' | 'divorced' | 'widowed';
      husband_id: number | null;
      wife_id: number | null;
    }[];
  }> {
    return this.http.get<{
      success: boolean;
      count: number;
      data: {
        id: number;
        name: string;
        status: 'confirmed' | 'divorced' | 'widowed';
        husband_id: number | null;
        wife_id: number | null;
      }[];
    }>(`${this.API_URL}/relationship/parents`).pipe(
      catchError(this.handleError)
    );
  }

   // Create a parent-child relationship request
   createParentChildRelationship(relationshipData: ParentChildRelationshipData): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/parent-child`, relationshipData).pipe(
      catchError(this.handleError)
    );
  }

  // Confirm a parent-child relationship
  confirmParentChildRelationship(relationshipId: number, respondingMemberId: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/parent-child/${relationshipId}/confirm`, {
      responding_member_id: respondingMemberId
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Decline a parent-child relationship
  declineParentChildRelationship(relationshipId: number, respondingMemberId: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/parent-child/${relationshipId}/decline`, {
      responding_member_id: respondingMemberId
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Update parent-child relationship status when marriage status changes
  updateRelationshipStatus(statusData: ParentChildStatusUpdate): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/parent-child/update-status`, statusData).pipe(
      catchError(this.handleError)
    );
  }

  // Get pending parent-child relationship requests for a specific parent
  getParentChildRequests(parentId: number): Observable<ParentChildResponse> {
    return this.http.get<ParentChildResponse>(`${this.API_URL}/parent-child-requests/${parentId}`).pipe(
      map(response => {
        // Process image URLs for members if needed
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach((relationship: MemberParentTable) => {
            if (relationship.child) {
              relationship.child = this.processImageUrls(relationship.child);
            }
            if (relationship.father) {
              relationship.father = this.processImageUrls(relationship.father);
            }
            if (relationship.mother) {
              relationship.mother = this.processImageUrls(relationship.mother);
            }
          });
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Get all children for a specific parent
  getParentChildren(parentId: number): Observable<ParentChildResponse> {
    return this.http.get<ParentChildResponse>(`${this.API_URL}/member/${parentId}/children`).pipe(
      map(response => {
        // Process image URLs for children and other members
        if (response.data && 'relationships' in response.data && Array.isArray(response.data.relationships)) {
          response.data.relationships.forEach((relationship: MemberParentTable) => {
            if (relationship.child) {
              relationship.child = this.processImageUrls(relationship.child);
            }
            if (relationship.father) {
              relationship.father = this.processImageUrls(relationship.father);
            }
            if (relationship.mother) {
              relationship.mother = this.processImageUrls(relationship.mother);
            }
          });
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  // Get all parents for a specific child
  getChildParents(childId: number): Observable<ParentChildResponse> {
    return this.http.get<ParentChildResponse>(`${this.API_URL}/member/${childId}/parents`).pipe(
      map(response => {
        // Process image URLs for parents and other members
        if (response.data && 'relationships' in response.data && Array.isArray(response.data.relationships)) {
          response.data.relationships.forEach((relationship: MemberParentTable) => {
            if (relationship.father) {
              relationship.father = this.processImageUrls(relationship.father);
            }
            if (relationship.mother) {
              relationship.mother = this.processImageUrls(relationship.mother);
            }
          });
        }
        
        // Process parentsByMarriage if present
        if (response.data && 'parentsByMarriage' in response.data && Array.isArray(response.data.parentsByMarriage)) {
          response.data.parentsByMarriage.forEach(marriage => {
            if (marriage.parents && Array.isArray(marriage.parents)) {
              marriage.parents = marriage.parents.map(parent => this.processImageUrls(parent));
            }
            if (marriage.requester) {
              marriage.requester = this.processImageUrls(marriage.requester);
            }
          });
        }
        
        return response;
      }),
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
            if (relationships.spouse && Array.isArray(relationships.spouse)) {
              relationships.spouse = relationships.spouse.map(spouse => 
                this.processImageUrls(spouse)
              ) 
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
            
            // Process pending divorces 
            if (relationships.pending_divorces && Array.isArray(relationships.pending_divorces)) {
              relationships.pending_divorces = relationships.pending_divorces.map(spouse => 
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

   // Get all marriages for a specific member (new method)
  getMemberMarriages(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${memberId}/marriages`).pipe(
      map(response => {
        // Process image URLs for members in the response
        if (response.data && response.data.marriages && Array.isArray(response.data.marriages)) {
          response.data.marriages.forEach((marriage: any) => {
            if (marriage.husband) {
              marriage.husband = this.processImageUrls(marriage.husband);
            }
            if (marriage.wife) {
              marriage.wife = this.processImageUrls(marriage.wife);
            }
          });
        }
        return response;
      }),
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