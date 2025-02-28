import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, map, catchError, throwError, of } from 'rxjs';
import { DeathData, MarriageData, Member, MemberResponse, RelationshipResponse, SingleMemberResponse } from '../models/member';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private readonly API_URL = 'http://localhost:5000/api/members';
  private readonly BASE_URL = 'http://localhost:5000';
  private http = inject(HttpClient);

  constructor(
    private authService: AuthService
  ) {}

  getMembers(): Observable<MemberResponse> {
    return this.http.get<MemberResponse>(this.API_URL).pipe(
      map(response => {
        if (response.data && Array.isArray(response.data)) {
          response.data = response.data.map(member => this.processImageUrls(member));
        }
        return response;
      })
    );
  }

  getMember(id: number): Observable<SingleMemberResponse> {
    return this.http.get<SingleMemberResponse>(`${this.API_URL}/${id}`).pipe(
      map(response => {
        if (response.data) {
          response.data = this.processImageUrls(response.data);
        }
        return response;
      })
    );
  }

  private processImageUrls(member: Member): Member {
    const updatedMember = { ...member };

    if (updatedMember.profile_image) {
      // If there's a custom uploaded image
      updatedMember.profile_image_url = `${this.BASE_URL}${updatedMember.profile_image}`;
    } else {
      // No image - will use initials
      updatedMember.profile_image_url = null;
    }

    return updatedMember;
  }

  createMember(memberData: any, imageFile: File | null): Observable<SingleMemberResponse> {
    const formData = new FormData();

    // Add all member data to formData
    Object.keys(memberData).forEach(key => {
      // Handle dates properly
      if (memberData[key] instanceof Date) {
        formData.append(key, memberData[key].toISOString());
      } else {
        formData.append(key, memberData[key]);
      }
    });

    // Add image if provided
    if (imageFile) {
      formData.append('profile_image', imageFile);
    }

    return this.http.post<SingleMemberResponse>(this.API_URL, formData).pipe(
      map(response => {
        if (response.data) {
          response.data = this.processImageUrls(response.data);
        }
        return response;
      })
    );
  }

  updateMember(id: number, memberData: any, imageFile: File | null, removeImage = false): Observable<SingleMemberResponse> {
    const formData = new FormData();

    // Add all member data to formData
    Object.keys(memberData).forEach(key => {
      if (memberData[key] instanceof Date) {
        formData.append(key, memberData[key].toISOString());
      } else if (memberData[key] !== null) {
        formData.append(key, memberData[key].toString());
      }
    });

    // Add image if provided
    if (imageFile) {
      formData.append('profile_image', imageFile);
    }

    // Add remove_image flag if true
    if (removeImage) {
      formData.append('remove_image', 'true');
    }

    return this.http.put<SingleMemberResponse>(`${this.API_URL}/${id}`, formData).pipe(
      map(response => {
        if (response.data) {
          response.data = this.processImageUrls(response.data);
        }
        return response;
      })
    );
  }

  deleteMember(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
  }

  // Verify Member method
  verifyMember(memberId: number): Observable<SingleMemberResponse> {
    return this.http.put<SingleMemberResponse>(`${this.API_URL}/${memberId}/verify`, {});
  }

  getPotentialSpouses(memberId: number): Observable<MemberResponse> {
    return this.http.get<MemberResponse>(`${this.API_URL}/potential-spouses/${memberId}`);
  }

  getUnmarriedMembersByGender(gender: string): Observable<MemberResponse> {
    return this.http.get<MemberResponse>(`${this.API_URL}/unmarried/${gender}`).pipe(
      catchError(this.handleError)
    );
  }

  getUnMarriedMembersOfOppositeGender(gender: string): Observable<MemberResponse> {
    return this.getUnmarriedMembersByGender(gender === 'male' ? 'female' : 'male');
  }
  
confirmMarriage(marriageId: number): Observable<SingleMemberResponse> {
  return this.http.put<SingleMemberResponse>(`${this.API_URL}/marriage/${marriageId}/confirm`, {}).pipe(
    map(response => {
      // Make sure to process any member data in the response
      if (response.data) {
        response.data = this.processImageUrls(response.data);
      }
      return response;
    }),
    catchError(this.handleError)
  );
}

    // Get pending marriage requests for a member
  getPendingMarriageRequestsForMember(memberId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/marriage-requests/${memberId}`).pipe(
      catchError(this.handleError)
    );
  }

  createMarriageRequest(husbandId: number, wifeId: number, marriageDate: string): Observable<any> {
    return this.http.post(`${this.API_URL}/marriage`, {
      husband_id: husbandId,
      wife_id: wifeId,
      marriage_date: marriageDate
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = error.error?.message || `Error Code: ${error.status}, Message: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // getRelationships(memberId: number): Observable<{
  //   member: Member;
  //   spouse: Member | null;
  //   children: Member[];
  //   parents: Member[];
  // }> {
  //   return this.http.get<{
  //     member: Member;
  //     spouse: Member | null;
  //     children: Member[];
  //     parents: Member[];
  //   }>(`${this.API_URL}/${memberId}/relationships`);
  // }

getRelationships(memberId: number): Observable<any> {
  return this.http.get<any>(`${this.API_URL}/${memberId}/relationships`)
    .pipe(
      map(response => {
        if (response.success) {
          return response.data;
        } else {
          throw new Error(response.message);
        }
      }),
      catchError(error => {
        console.error('Error fetching relationships', error);
        return throwError(() => new Error(error.message));
      })
    );
}

  // recordDivorce(marriageId: number, divorceDate: Date): Observable<SingleMemberResponse> {
  //   return this.http.put<SingleMemberResponse>(`${this.API_URL}/marriage/${marriageId}/divorce`, {
  //     divorce_date: divorceDate
  //   });
  // }

  // recordDeath(memberId: number, data: DeathData): Observable<SingleMemberResponse> {
  //   return this.http.put<SingleMemberResponse>(`${this.API_URL}/${memberId}/death`, data);
  // }

  // getRelationships(memberId: number): Observable<{
  //   member: Member;
  //   spouse: Member | null;
  //   children: Member[];
  //   parents: Member[];
  // }> {
  //   return this.http.get<RelationshipResponse>(`${this.API_URL}/${memberId}/relationships`)
  //     .pipe(map(response => response.data));
  // }

  // //Get pending marriage requests for a member
  // getPendingMarriageRequests(memberId: number): Observable<any> {
  //   return this.http.get<any>(`${this.API_URL}/${memberId}/marriage-requests`);
  // }

  // //Send a marriage request
  // sendMarriageRequest(requesterId: number, requesteeId: number): Observable<any> {
  //   return this.http.post<any>(`${this.API_URL}/marriage-request`, {
  //     requester_id: requesterId,
  //     requestee_id: requesteeId
  //   });
  // }

  // //Respond to a marriage request
  // respondToMarriageRequest(requestId: number, accept: boolean): Observable<any> {
  //   return this.http.put<any>(`${this.API_URL}/marriage-request/${requestId}`, {
  //     status: accept ? 'approved' : 'rejected'
  //   }).pipe(
  //     switchMap(response => {
  //       if (accept && response.marriage_id) {
  //         // If accepted, automatically confirm the marriage
  //         return this.confirmMarriage(response.marriage_id).pipe(
  //           map(() => response)
  //         );
  //       }
  //       return of(response);
  //     })
  //   );
  // }

  // //Modify the createMarriage method to support pending status
  // createMarriage(marriageData: MarriageData): Observable<SingleMemberResponse> {
  //   if (!marriageData.status) {
  //     marriageData.status = 'pending';
  //   }

  //   return this.http.post<SingleMemberResponse>(`${this.API_URL}/marriage`, marriageData)
  // }
}