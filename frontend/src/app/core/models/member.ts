export interface Member {
  id?: number;
  profile_image?: string;
  profile_image_url?: string;
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