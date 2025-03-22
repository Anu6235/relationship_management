import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoiceStatus, Ledger, LedgerType } from '../../core/models/ledger';
import { LedgerService } from '../../core/services/ledger.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  ledgers: Ledger[] = [];
  ledgerTypes: LedgerType[] = [];
  filteredLedgers: Ledger[] = [];
  selectedStatusFilter: number | null = null;
  selectedLedgerTypeId: number | null = null;
  
  // Dashboard summary metrics
  totalAmount: number = 0;
  totalPaid: number = 0;
  totalPending: number = 0;
  totalOverdue: number = 0;
  
  // Detailed metrics by ledger type
  ledgerTypeMetrics: Map<number, {
    name: string,
    totalAmount: number,
    paidAmount: number,
    pendingAmount: number,
    overdueAmount: number,
    count: number
  }> = new Map();
  
  isLoading: boolean = false;
  
  // Color classes for different statuses
  statusColors = {
    total: 'bg-blue-600 text-white',
    paid: 'bg-green-600 text-white',
    pending: 'bg-orange-600 text-white',
    overdue: 'bg-red-600 text-white'
  };
  
  constructor(private ledgerService: LedgerService) {}

  ngOnInit(): void {
    this.loadLedgerTypes();
    this.loadAllLedgers();
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
          this.calculateDashboardMetrics();
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ledgers:', error);
        this.isLoading = false;
      }
    });
  }
  
  calculateDashboardMetrics(): void {
    // Reset metrics
    this.totalAmount = 0;
    this.totalPaid = 0;
    this.totalPending = 0;
    this.totalOverdue = 0;
    this.ledgerTypeMetrics.clear();
  
    // Initialize ledger type metrics
    this.ledgerTypes.forEach(type => {
      this.ledgerTypeMetrics.set(type.id, {
        name: type.name,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        count: 0
      });
    });
  
    // Calculate metrics
    this.ledgers.forEach(ledger => {
      // Convert amounts to subunits to avoid floating-point precision issues
      const totalAmountSubunits = Math.round(ledger.total_amount * 100);
      const paidAmountSubunits = ledger.invoice_status === InvoiceStatus.Paid ? Math.round(ledger.total_amount * 100) : 0;
      const pendingAmountSubunits = ledger.invoice_status === InvoiceStatus.Pending ? Math.round(ledger.total_amount * 100) : 0;
      const overdueAmountSubunits = ledger.invoice_status === InvoiceStatus.Overdue ? Math.round(ledger.total_amount * 100) : 0;
  
      // Update global metrics in subunits
      this.totalAmount += totalAmountSubunits;
      this.totalPaid += paidAmountSubunits;
      this.totalPending += pendingAmountSubunits;
      this.totalOverdue += overdueAmountSubunits;
  
      // Update ledger type metrics in subunits
      const typeMetrics = this.ledgerTypeMetrics.get(ledger.ledger_type_id);
      if (typeMetrics) {
        typeMetrics.totalAmount += totalAmountSubunits;
        typeMetrics.count++;
  
        switch (ledger.invoice_status) {
          case InvoiceStatus.Paid:
            typeMetrics.paidAmount += paidAmountSubunits;
            break;
          case InvoiceStatus.Pending:
            typeMetrics.pendingAmount += pendingAmountSubunits;
            break;
          case InvoiceStatus.Overdue:
            typeMetrics.overdueAmount += overdueAmountSubunits;
            break;
        }
      }
    });
  
    // Convert metrics back to base units for display
    this.totalAmount /= 100;
    this.totalPaid /= 100;
    this.totalPending /= 100;
    this.totalOverdue /= 100;
  
    this.ledgerTypeMetrics.forEach((metrics, key) => {
      metrics.totalAmount /= 100;
      metrics.paidAmount /= 100;
      metrics.pendingAmount /= 100;
      metrics.overdueAmount /= 100;
    });
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
  
  getCompletionPercentage(paid: number, total: number): number {
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  }
}