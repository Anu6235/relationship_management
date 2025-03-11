import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { UserResponse, User, LoginRequest, LoginResponse } from '../models/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'relationship-management.onrender.com/api';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private http = inject(HttpClient);
  private router = inject(Router);

  constructor() {
    // Check if token exists on service initialization
    this.checkTokenAndAuthenticate();
  }

  // Check for token and authenticate if it exists
  private checkTokenAndAuthenticate(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.isAuthenticatedSubject.next(true);
      // Load user profile silently, don't logout on error
      this.http.get<UserResponse>(`${this.API_URL}/auth/admin`).subscribe({
        next: (response) => {
          if (response.success) {
            this.currentUserSubject.next(response.data);
          }
        },
        error: () => {
          // Don't logout on error during initialization
          console.warn("Failed to load user profile, but keeping authentication state");
        }
      });
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
          if (response.success) {
            this.currentUserSubject.next(response.data);
          }
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  // Method to handle browser close
  registerBrowserCloseEvent(): void {
    window.addEventListener('beforeunload', () => {
      if (this.isAuthenticatedSubject.value) {
        // Set a flag indicating the browser is being closed
        localStorage.setItem('browser_closing', 'true');
      }
    });
  }

  // Check if browser was closed (to be called during app initialization)
  checkBrowserCloseLogout(): void {
    const wasBrowserClosed = localStorage.getItem('browser_closing') === 'true';
    if (wasBrowserClosed) {
      this.logOut(false); // Logout without navigation
    }
    localStorage.removeItem('browser_closing');
  }

  logOut(navigate = true): void {
    localStorage.removeItem('token');
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