import { Injectable, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionService implements OnDestroy {
  private static readonly SESSION_CLOSE_KEY = 'session_close_intended';
  private timeoutId: any = null;

  constructor() {
    this.initCloseDetection();
    // Clear any lingering close flags on startup
    sessionStorage.removeItem(SessionService.SESSION_CLOSE_KEY);
  }

  initCloseDetection(): void {
    // Listen for tab/browser close events
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    // Listen for refresh events
    window.addEventListener('unload', this.handleUnload.bind(this));
  }

  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    // Set a flag that we're potentially closing the browser
    sessionStorage.setItem(SessionService.SESSION_CLOSE_KEY, 'true');
    
    // Set a short timeout to clear the flag (will execute on refresh but not on close)
    this.timeoutId = setTimeout(() => {
      sessionStorage.removeItem(SessionService.SESSION_CLOSE_KEY);
    }, 0);
  }

  private handleUnload(): void {
    // On refresh, this will execute and clear the timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // On browser close, this code won't execute fully, leaving the flag
    if (!sessionStorage.getItem(SessionService.SESSION_CLOSE_KEY)) {
      // This is a refresh, not a close - set a flag that will survive the refresh
      localStorage.setItem('was_refresh', 'true');
    }
  }

  isClosedSession(): boolean {
    // Check if we have the close flag but not the refresh flag
    const wasRefresh = localStorage.getItem('was_refresh') === 'true';
    localStorage.removeItem('was_refresh');
    return !wasRefresh && sessionStorage.getItem(SessionService.SESSION_CLOSE_KEY) === 'true';
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    window.removeEventListener('unload', this.handleUnload.bind(this));
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}