import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { UserResponse, User, LoginRequest, LoginResponse } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:5000/api';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private http = inject(HttpClient);

  constructor() {
    this.checkInitialAuth();
   }

   private checkInitialAuth() {
    const token = localStorage.getItem('token');
    if (token) {
      this.isAuthenticatedSubject.next(true);
      this.loadUserProfile().subscribe();
    }
   }

   login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            this.isAuthenticatedSubject.next(true);
            this.loadUserProfile().subscribe();
          }
        }),
        catchError(error => {
          return throwError(() => error?.error?.message || 'Login failed');
        })
      );
  }

  loadUserProfile(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.API_URL}/auth/admin`)
      .pipe(
        tap(response => {
          if (response.success && response.data.role === 'admin') {
            this.currentUserSubject.next(response.data);
          } else {
            this.logOut(); // Logout if user is not an admin
          }
        }),
        catchError(error => {
          this.logOut();
          return throwError(() => error?.error?.message || 'Failed to load profile');
        })
      );
  }

  logOut(): void {
    localStorage.removeItem('token');
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): Observable<boolean> {
    return this.isAuthenticatedSubject.asObservable();
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}