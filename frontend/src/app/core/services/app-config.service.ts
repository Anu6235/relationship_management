import { HttpClient, HttpParams } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AppConfig } from '../models/app-config';
import { environment } from '../../../environments/environment'; 

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private apiUrl = environment.APP_CONFIG_URL;
  configUpdated = new EventEmitter<void>();

  constructor(private http: HttpClient) { }

  saveAppConfig(formData: FormData): Observable<{ success: boolean; data: AppConfig}> {
    return this.http.post<{success: boolean; data: AppConfig}>(this.apiUrl, formData).pipe(
      tap(() => {
        this.configUpdated.emit();
      })
    );
  }

  getAppConfig(): Observable<{ success: boolean, data: AppConfig }> {
    return this.http.get<{ success: boolean; data: AppConfig }>(this.apiUrl);
  }
}