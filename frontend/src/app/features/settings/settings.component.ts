import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppConfigService } from '../../core/services/app-config.service';
import { ToastrService } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit{
  configForm: FormGroup;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isSubmitting = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private appConfigService: AppConfigService,
    private toastr: ToastrService
  ) {
    this.configForm = this.fb.group({
      appName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      contact: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadCurrentConfig();
  }

  loadCurrentConfig() {
    this.appConfigService.getAppConfig().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.configForm.patchValue({
            appName: response.data.app_name,
            email: response.data.email,
            contact: response.data.contact
          });
          if (response.data.logo) {
            this.previewUrl = `http://localhost:5000${response.data.logo}`;
          }
        }
      },
      error: (error) => {
        console.error('Error loading configuration:', error);
      }
    });
  }

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.configForm.valid) {
      this.isSubmitting = true;
      const formData = new FormData();
      formData.append('appName', this.configForm.get('appName')?.value);
      formData.append('email', this.configForm.get('email')?.value);
      formData.append('contact', this.configForm.get('contact')?.value);

      if (this.selectedFile) {
        formData.append('logo', this.selectedFile);
      }

      this.appConfigService.saveAppConfig(formData).subscribe({
        next: (response) => {
          if (response.success) {
            this.toastr.success('Configuration saved successfully!', 'Success');
          } else {
            this.toastr.error('Failed to save configuration', 'Error');
          }
        },
        error: (error) => {
          console.error('Error saving configuration:', error);
          this.toastr.error('Error saving configuration', 'Error');
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }
}