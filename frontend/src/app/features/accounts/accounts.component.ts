import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoiceStatus, Ledger, LedgerType } from '../../core/models/ledger';
import { LedgerService } from '../../core/services/ledger.service';
import { Member } from '../../core/models/member';
import { LedgerPdfService } from '../../core/services/ledger-pdf.service';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.css'
})
export class AccountsComponent implements OnInit{
  ledgers: Ledger[] = [];
  members: Member[] = [];
  ledgerTypes: LedgerType[] = [];
  filteredLedgers: Ledger[] = [];
  selectedLedgerTypeId: number | null = null;
  totalAmount: number = 0;
  isLoading: boolean = false;
  schedulerStatus: boolean = false;

  iconColors: string[] = [
    'text-blue-500 bg-blue-100',
    'text-green-500 bg-green-100',
    'text-orange-500 bg-orange-100',   
    'text-red-500 bg-red-100',
    'text-gray-500 bg-gray-100',
    'text-teal-500 bg-teal-100',
  ];

  constructor(
    private ledgerService: LedgerService,
    private ledgerPdfService: LedgerPdfService,
  ) {}

  ngOnInit(): void {
    this.loadLedgerTypes();
    this.loadAllLedgers();
    this.checkSchedulerStatus();
  }
  private loadLedgers(): void {
    this.isLoading = true;
    this.ledgerService.getAllLedgers()
      .subscribe({
        next: (response) => {
          this.ledgers = response.data;
          this.filteredLedgers = [...this.ledgers];
          this.calculateTotalAmount();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading ledgers:', error);
          this.isLoading = false;
        }
      });
  }

  loadLedgerTypes(): void {
    this.isLoading = true;
    this.ledgerService.getAllLedgerTypes().subscribe({
      next: (response) => {
        if (response.success) {
          this.ledgerTypes = response.data;
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading ledger types:', error);
        this.isLoading = false;
      }
    });
  }

  loadAllLedgers(): void {
    this.isLoading = true;
    this.ledgerService.getAllLedgers().subscribe({
      next: (response) => {
        if (response.success) {
          this.ledgers = response.data;
          this.filteredLedgers = [...this.ledgers];
          this.calculateTotalAmount();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ledgers:', error);
        this.isLoading = false;
      }
    });
  }

  checkSchedulerStatus(): void {
    this.ledgerService.getSchedulerStatus().subscribe({
      next: (response) => {
        if (response.success) {
          this.schedulerStatus = response.data.isRunning;
        }
      },
      error: (error) => {
        console.error('Error checking scheduler status:', error);
      }
    });
  }

  toggleScheduler(): void {
    if (this.schedulerStatus) {
      this.ledgerService.stopScheduler().subscribe({
        next: (response) => {
          if (response.success) {
            this.schedulerStatus = false;
            //toaster
          }
        },
        error: (error) => {
          console.error('Error stopping scheduler:', error);
        }
      });
    } else {
      this.ledgerService.startScheduler().subscribe({
        next: (response) => {
          if (response.success) {
            this.schedulerStatus = true;
            //toaster
          }
        },
        error: (error) => {
          console.error('Error starting scheduler:', error);
        }
      });
    }
  }

  filterLedgersByType(ledgerTypeId: number | null): void {
    this.selectedLedgerTypeId = ledgerTypeId;

    if (ledgerTypeId === null) {
      // Show all ledgers
      this.filteredLedgers = [...this.ledgers];
    } else {
      // Filter ledger by type
      this.filteredLedgers = this.ledgers.filter(ledger => ledger.ledger_type_id === ledgerTypeId);
    }

    this.calculateTotalAmount();
  }

  calculateTotalAmount(): void {
    this.totalAmount = this.filteredLedgers.reduce((sum, ledger) => sum + ledger.total_amount, 0);
  }

  getStatusClass(status: number): string {
    switch (status) {
      case InvoiceStatus.Pending:
        return 'text-orange-700 bg-orange-100';
      case InvoiceStatus.Paid:
        return 'text-green-700 bg-green-100';
      case InvoiceStatus.Overdue:
        return 'text-red-700 bg-red-100';
      case InvoiceStatus.Cancelled:
        return 'text-gray-700 bg-gray-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  }

  getStatusText(status: number): string {
    switch (status) {
      case InvoiceStatus.Pending:
        return 'Pending';
      case InvoiceStatus.Paid:
        return 'Paid';
      case InvoiceStatus.Overdue:
        return 'Overdue';
      case InvoiceStatus.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  toTitleCase(str: string): string {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0'); 
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  formatCurrency(amount: number): string {
    if (amount == null) return '₹0.00'; 
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  }

  downloadLedger(ledger: Ledger): void {
    // this.toastr.info('Generating PDF, please wait...');
    
    this.ledgerPdfService.downloadLedgerAsPdf(ledger)
      .then(() => {
        // this.toastr.success('PDF downloaded successfully');
      })
      .catch(error => {
        console.error('Error generating PDF:', error);
        // this.toastr.error('Failed to generate PDF');
      });
  }

  deleteLedger(id: number): void {
    if (confirm('Are you sure you want to delete this ledger?')) {
      this.ledgerService.deleteLedger(id).subscribe({
        next: (response) => {
          if (response.success) {
            // this.toastr.success('Ledger configuration deleted successfully', 'Success');
            this.loadLedgers();
          } else {
            // this.toastr.error('Failed to delete ledger configuration', 'Error');
          }
        },
        error: (error) => {
          console.error('Error deleting ledger configuration:', error);
            // toaster
        }
      });
    }
  }

  generateLedgersByType(ledgerTypeId: number): void {
    this.isLoading = true;
    this.ledgerService.generateLedgersforLedgerType(ledgerTypeId).subscribe({
      next: (response) => {
        if (response.success) {
          //toaster
          this.loadAllLedgers();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error generating ledgers:', error);
        this.isLoading = false;
      }
    });
  }

  generateAllLedgers(): void {
    this.isLoading = true;
    this.ledgerService.generateLedgers().subscribe({
      next: (response) => {
        if (response.success) {
          //toaster
          this.loadAllLedgers();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error generating all ledgers:', error);
        this.isLoading = false;
        //toaster
      }
    });
  }

  getLedgerCountByType(ledgerTypeId: number): number {
    return this.ledgers.filter(ledger => ledger.ledger_type_id === ledgerTypeId).length;
  }

  getIconColor(index: number): string {
    return this.iconColors[index % this.iconColors.length];
  }

  recalculateFines(): void {
    this.isLoading = true;
    this.ledgerService.recalculateFines().subscribe({
      next: (response) => {
        if (response.success) {
          //toaster
          this.loadAllLedgers();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error recalculating fines:', error);
        this.isLoading = false;
       // toaster
      }
    });
  }

  payLedger(id: number): void {
    this.isLoading = true;
    this.ledgerService.payLedger(id).subscribe({
      next: (response) => {
        if (response.success) {
        // toaster
          this.loadAllLedgers();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error paying ledger:', error);
        this.isLoading = false;
        // toaster
      }
    });
  }
}



