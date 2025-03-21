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
  relationship_type?: string; 
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
    relationships: {
      spouse: Member[];
      divorced_spouses: Member[];
      widowed_spouses: Member[];
      pending_spouses: Member[];
      pending_divorces: any[];
      pending_widowed: any[];
      children: Member[];
      parents: Member[];
      marriages: ParentTable[];
    }
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
  member_id: number;
  death_date: Date;
}

export interface WidowedData {
  husband_id: number;
  wife_id: number;
  marriage_date: Date;
  requested_by: number;
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

export interface MemberParentTable {
  id: number;
  child_id: number;
  father_id: number | null;
  mother_id: number | null;
  parent_table_id: number;
  status: 'pending' | 'confirmed' | 'widowed' | 'divorced';
  relationship_type: 'biological' | 'adoptive' | 'step';
  requested_by: number;
  child?: Member;
  father?: Member;
  mother?: Member;
  parentMarriage?: ParentTable;
  requester?: Member;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ParentChildResponse {
  success: boolean;
  data: MemberParentTable[] | {
    relationships: MemberParentTable[],
    groupedByStatus?: {
      confirmed: MemberParentTable[],
      widowed: MemberParentTable[],
      divorced: MemberParentTable[],
      pending: MemberParentTable[]
    }
  } | {
    relationships: MemberParentTable[],
    parentsByMarriage: ParentsByMarriage[],
    groupedByStatus: {
      confirmed: MemberParentTable[],
      widowed: MemberParentTable[],
      divorced: MemberParentTable[],
      pending: MemberParentTable[]
    }
  };
  message?: string;
}

export interface ParentChildRelationshipData {
  parent_table_id: number;
  child_id: number;
  relationship_type: 'biological' | 'adoptive' | 'step';
  requested_by: number;
}

export interface ParentsByMarriage {
  marriage_id: number;
  marriage_status: string;
  marriage_date?: Date;
  divorce_date?: Date;
  death_date?: Date;
  status: string;
  requested_by: number;
  requester?: Member;
  parents: Member[];
}

export interface ParentChildStatusUpdate {
  parent_table_id: number;
  new_status: 'confirmed' | 'widowed' | 'divorced';
}