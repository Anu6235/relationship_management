import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, map } from 'rxjs';
import { Member, MemberResponse, SingleMemberResponse } from '../models/member';
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

  // private getDefaultAvatarUrl(gender: string): string {
  //   const genderPath = gender.toLowerCase() === 'male' ? 'male-avatar' : 'female-avatar';

  //   return `${this.BASE_URL}/images/member-avatars/${genderPath}/avatar.png`;
  // }

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
}