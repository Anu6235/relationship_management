import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { UserResponse, User, LoginRequest, LoginResponse } from '../models/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:5000/api';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private http = inject(HttpClient);
  private router = inject(Router);

  constructor() {
    this.checkTokenAndAuthenticate();
    this.setupTabCloseDetection();
  }

  private checkTokenAndAuthenticate(): void {
    const token = localStorage.getItem('token');
    if (token) {
      const wasTabClosed = sessionStorage.getItem('app_session') === null;
      
      if (wasTabClosed) {
        this.logOut(true);
        return;
      }
      
      this.isAuthenticatedSubject.next(true);
      this.http.get<UserResponse>(`${this.API_URL}/auth/admin`).subscribe({
        next: (response) => {
          if (response.success) {
            this.currentUserSubject.next(response.data);
          }
        },
        error: () => {
          console.warn("Failed to load user profile, but keeping authentication state");
        }
      });
    }
  }

  // Setup detection for tab close vs page refresh
  private setupTabCloseDetection(): void {
    sessionStorage.setItem('app_session', 'active');
}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            // Set session marker when logging in
            sessionStorage.setItem('app_session', 'active');
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
          if (response.success) {
            this.currentUserSubject.next(response.data);
          }
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }


  logOut(navigate = true): void {
    localStorage.removeItem('token');
    sessionStorage.removeItem('app_session');
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    if (navigate) {
      this.router.navigate(['/login']);
    }
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