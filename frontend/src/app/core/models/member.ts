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
  marital_status: "single" | "married" | "widowed" | "divorced";
  spouse_id?: number;
  parent_id?: number[] | string; 
  children?: string[];
  profile_picture?: string;
  deceased_spouse_id?: number;
  marriage_date?: Date;
  divorce_date?: Date;
  death_date?: Date;
  pending_marriage_requests?: MarriageRequest[];
  spouse?: Member | null; 
  husbandMarriages?: ParentTable[];
  wifeMarriages?: ParentTable[];
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

export interface ParentTable {
  id: number;
  husband_id: number | null;
  wife_id: number | null;
  requested_by: number;
  marriage_date?: Date;
  divorce_date?: Date;
  death_date?: Date;
  deceased_spouse_id?: number;
  status: 'pending' | 'confirmed' | 'divorced' | 'widowed';
  is_current: boolean;
  husband?: Member;
  wife?: Member;
  deceasedSpouse?: Member;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarriageData {
  husband_id: number;
  wife_id: number;
  marriage_date: Date;
  status?: 'pending' | 'confirmed' | 'divorced' | 'widowed';
  requested_by: number;
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
  created_at: Date | string;
}

export interface MemberFilterParams {
  gender?: 'male' | 'female';
  marital_status?: 'single' | 'married' | 'widowed' | 'divorced';
  status?: 'active' | 'inactive';
  is_verified?: boolean;
  deceased?: boolean;
}