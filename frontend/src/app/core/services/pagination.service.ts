import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  private paginationState = new BehaviorSubject<PaginationState>({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });

  paginationState$ = this.paginationState.asObservable();

  updateState(state: Partial<PaginationState>) {
    const currentState = this.paginationState.getValue();
    const newState = { ...currentState, ...state };
    
    if (state.totalItems !== undefined || state.pageSize !== undefined) {
      newState.totalPages = Math.ceil(newState.totalItems / newState.pageSize);
    }
    
    this.paginationState.next(newState);
  }

  setPage(page: number) {
    const currentState = this.paginationState.getValue();
    if (page >= 1 && page <= currentState.totalPages) {
      this.updateState({ currentPage: page });
    }
  }

  getPageRange(): number[] {
    const state = this.paginationState.getValue();
    const range: number[] = [];
    const maxVisiblePages = 7;
    
    if (state.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= state.totalPages; i++) {
        range.push(i);
      }
      return range;
    }

    range.push(1);

    let start = Math.max(2, state.currentPage - 2);
    let end = Math.min(state.totalPages - 1, state.currentPage + 2);

    if (start > 2) {
      range.push(-1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    if (end < state.totalPages - 1) {
      range.push(-1);
    }

    range.push(state.totalPages);

    return range;
  }
}