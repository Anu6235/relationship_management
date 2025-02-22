export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
}

export interface User {
   id: number;
   username: string;
   role: string;
   last_login: Date;
   password_reset: Date;
   createdAt: string;
   updatedAt: string;   
}

export interface UserResponse {
    success: boolean;
    data: User;
}
