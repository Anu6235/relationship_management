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
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) { }

 // Ledger Type Methods
 getAllLedgerTypes(): Observable<LedgerTypeResponse> {
  return this.http.get<LedgerTypeResponse>(`${this.baseUrl}/ledger-types`);
}

getLedgerTypeById(id: number): Observable<SingleLedgerTypeResponse> {
  return this.http.get<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types/${id}`);
}

createLedgerType(ledgerType: Partial<LedgerType>): Observable<SingleLedgerTypeResponse> {
  // Ensure start_date is converted to ISO string if it exists
  const processedLedgerType: any = { ...ledgerType };

  if (processedLedgerType.start_date) {
    processedLedgerType.start_date = 
      processedLedgerType.start_date instanceof Date 
        ? processedLedgerType.start_date.toISOString() 
        : new Date(processedLedgerType.start_date).toISOString();
  }

  console.log('Create Ledger Type - Processed Data:', processedLedgerType);
  
  return this.http.post<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types`, processedLedgerType);
}

updateLedgerType(id: number, ledgerType: Partial<LedgerType>): Observable<SingleLedgerTypeResponse> {
  const processedLedgerType: any = { ...ledgerType };

  if (processedLedgerType.start_date) {
    // Ensure UTC conversion
    const utcDate = new Date(processedLedgerType.start_date);
    processedLedgerType.start_date = utcDate.toISOString();
  }

  return this.http.put<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types/${id}`, processedLedgerType);
}

toggleLedgerTypeActivation(id: number): Observable<SingleLedgerTypeResponse> {
  return this.http.put<SingleLedgerTypeResponse>(`${this.baseUrl}/ledger-types/${id}/toggle-activation`, {});
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

recalculateFines(): Observable<any> {
  return this.http.post<any>(`${this.baseUrl}/ledgers/recalculate-fines`, {});
}

payLedger(id: number): Observable<SingleLedgerResponse> {
  return this.http.post<SingleLedgerResponse>(`${this.baseUrl}/ledgers/${id}/pay`, {});
}

getOverdueLedgers(): Observable<LedgerResponse> {
  return this.http.get<LedgerResponse>(`${this.baseUrl}/ledgers/overdue`);
}

// Scheduler Methods
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

getNextScheduledGeneration(ledgerTypeId: number): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/ledger-types/${ledgerTypeId}/next-generation`);
}

setLedgerTypeStartDate(id: number, startDate: Date): Observable<SingleLedgerTypeResponse> {
  return this.http.put<SingleLedgerTypeResponse>(
    `${this.baseUrl}/ledger-types/${id}/start-date`, 
    { start_date: startDate.toISOString() }
  );
}
}