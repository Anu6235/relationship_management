import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { 
  EligibleMembersResponse, 
  Ledger, 
  LedgerResponse, 
  LedgerType, 
  LedgerTypeResponse, 
  SingleLedgerResponse, 
  SingleLedgerTypeResponse 
} from '../models/ledger';

@Injectable({
  providedIn: 'root'
})
export class LedgerService {
  private readonly baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) { }

  getAllLedgerTypes(): Observable<LedgerTypeResponse> {
    return this.http.get<LedgerTypeResponse>(`${this.baseUrl}/ledger-types`);
  }

  getLedgerTypeById(id: number): Observable<SingleLedgerTypeResponse> {
    return this.http.get<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types/${id}`);
  }

  createLedgerType(ledgerType: Partial<LedgerType>): Observable<SingleLedgerTypeResponse> {
    return this.http.post<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types`, ledgerType);
  }

  updateLedgerType(id: number, ledgerType: Partial<LedgerType>): Observable<SingleLedgerTypeResponse> {
    return this.http.put<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types/${id}`, ledgerType);
  }

  toggleLedgerTypeActivation(id: number): Observable<SingleLedgerTypeResponse> {
    return this.http.put<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types/${id}/toggle-activation`, {});
  }

  toggleAutoGeneration(id: number): Observable<SingleLedgerTypeResponse> {
    return this.http.put<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types/${id}/toggle-auto-generate`, {});
  }

  deleteLedgerType(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/ledger-types/${id}`);
  }

  getEligibleMembers(id: number): Observable<EligibleMembersResponse> {
    return this.http.get<EligibleMembersResponse>(`${this.baseUrl}/ledger-types/${id}/eligible-members`);
  }

  getAllLedgers(): Observable<LedgerResponse> {
    return this.http.get<LedgerResponse>(`${this.baseUrl}/ledgers`);
  }

  getLedgerById(id: number): Observable<SingleLedgerResponse> {
    return this.http.get<SingleLedgerResponse>(`${this.baseUrl}/ledgers/${id}`);
  }

  createLedger(ledger: Partial<Ledger>): Observable<SingleLedgerResponse> {
    return this.http.post<SingleLedgerResponse>(`${this.baseUrl}/ledgers`, ledger);
  }

  updateLedgerStatus(id: number, status: number): Observable<SingleLedgerResponse> {
    return this.http.put<SingleLedgerResponse>(`${this.baseUrl}/ledgers/${id}/status`, { invoice_status: status });
  }

  getMemberLedgers(memberId: number): Observable<LedgerResponse> {
    return this.http.get<LedgerResponse>(`${this.baseUrl}/ledgers/member/${memberId}`);
  }

  generateLedgers(ledgerTypeId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ledgers/generate/${ledgerTypeId}`, {});
  }

  // Methods for scheduler control
  getSchedulerStatus(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/scheduler/status`);
  }

  startScheduler(frequency?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/scheduler/start`, { frequency });
  }

  stopScheduler(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/scheduler/stop`, {});
  }

  checkLastLedgerCreationTime(ledgerTypeId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ledgers/last-created/${ledgerTypeId}`);
  }

  // Get next scheduled generation time for a ledger type
  getNextScheduledGeneration(ledgerTypeId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/ledger-types/${ledgerTypeId}/next-generation`);
  }
}