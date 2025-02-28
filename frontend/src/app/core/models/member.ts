export interface Member {
  id: number;
  profile_image?: string;
  profile_image_url?: string | null;
  first_name: string;
  last_name: string;
  dob: Date;
  gender: "male" | "female";
  mobile_number: string;
  email: string;
  aadhar_number: string;
  address: string;
  is_verified: boolean;
  verified_by: number | null;
  verified_at: Date | null;
  status: "active" | "inactive";
  deceased: boolean;
  marital_status: "Single" | "Married" | "Widowed" | "Divorced";
  spouse_id?: number;
  parent_id?: string;
  children?: string[];
  profile_picture?: string;
  marriage_date?: Date;
  divorce_date?: Date;
  death_date?: Date;
  pending_marriage_requests?: MarriageRequest[];
  spouse?: Member | null; 

  verifier?: {
    id: number,
    username: string,
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemberResponse {
  success: boolean;
  data: Member[];
}

export interface SingleMemberResponse {
  success: boolean;
  data: Member;
}

export interface RelationshipResponse {
  success: boolean;
  data: {
    member: Member;
    spouse: Member | null;
    children: Member[];
    parents: Member[]
  };
}

export interface MarriageData {
  husband_id: number;
  wife_id: number;
  marriage_date: Date;
  status?: 'pending' | 'confirmed' | 'divorced';
}

export interface DeathData {
  deceased_member_id: number;
  death_date: Date;
}

export interface MarriageRequest {
  id: number;
  request_id: number;
  requester?: Member;
  requestee_id: number;
  requestee?: Member;
  status: 'pending' | 'approved' | 'rejected';
  created_at : Date | string;
}
