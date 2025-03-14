import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AppConfigService } from './app-config.service';
import { firstValueFrom } from 'rxjs';
import { InvoiceStatus, Ledger } from '../models/ledger';

@Injectable({
  providedIn: 'root'
})
export class LedgerPdfService {
  private logoUrl: string | null = null;
  private appName: string = 'Organization Management';
  private appWebsite: string = '';

  constructor(private appConfigService: AppConfigService) {
    this.loadAppConfig();
    // Subscribe to config updates
    this.appConfigService.configUpdated.subscribe(() => {
      this.loadAppConfig();
    });
  }

  private async loadAppConfig(): Promise<void> {
    try {
      const response = await firstValueFrom(this.appConfigService.getAppConfig());
      if (response.success && response.data) {
        if (response.data.logo) {
          this.logoUrl = `http://localhost:5000${response.data.logo}`;
        }
        if (response.data.app_name) {
          this.appName = response.data.app_name;
        }
      }
    } catch (error) {
      console.error('Error loading app config:', error);
    }
  }

  async downloadLedgerAsPdf(ledger: Ledger): Promise<void> {
    // Ensure latest config is loaded before generating PDF
    await this.loadAppConfig();
    
    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add header with logo and app name
    await this.addHeader(doc, pageWidth);
    
    // Add invoice title
    this.addInvoiceTitle(doc, pageWidth);
    
    // Add invoice details
    this.addInvoiceDetails(doc, ledger);
    
    // Add member details
    this.addMemberDetails(doc, ledger);
    
    // Add payment details table
    this.addPaymentTable(doc, ledger);
    
    // Add payment status
    this.addPaymentStatus(doc, ledger);
    
    // Add terms and conditions
    this.addTermsAndConditions(doc);
    
    // Add footer
    this.addFooter(doc, pageWidth);
    
    // Save the PDF
    doc.save(`Invoice_${ledger.id}.pdf`);
  }
  
  private async addHeader(doc: jsPDF, pageWidth: number): Promise<void> {
    // Add logo if available
    if (this.logoUrl) {
      try {
        const logo = await this.loadImage(this.logoUrl);
        doc.addImage(logo, 'PNG', 10, 10, 30, 30);
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }
    
    // Add app name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(this.appName, 45, 25);
    
    // Add website at right side
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(this.appWebsite, pageWidth - 10, 25, { align: 'right' });
    
    // Add horizontal line
    doc.setDrawColor(66, 133, 244); // Blue color for the line
    doc.setLineWidth(0.5);
    doc.line(10, 35, pageWidth - 10, 35);
  }
  
  private addInvoiceTitle(doc: jsPDF, pageWidth: number): void {
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 133, 244); // Blue color for INVOICE
    doc.text('INVOICE', pageWidth - 10, 20, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset to black
  }
  
  private addInvoiceDetails(doc: jsPDF, ledger: Ledger): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Right side of the document
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice no : ${ledger.id}`, pageWidth - 10, 50, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`created ${this.formatDate(ledger.invoice_created_at)}`, pageWidth - 10, 57, { align: 'right' });
    
    // Due date and status
    doc.setFontSize(10);
    doc.text(`due date: ${this.formatDate(ledger.due_date)}`, 10, 85);
    
    doc.text(`status: ${this.getStatusText(ledger.invoice_status)}`, 10, 90);
  }
  
  private addMemberDetails(doc: jsPDF, ledger: Ledger): void {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice to :', 10, 50);
    
    doc.setFontSize(14);
    const memberName = ledger.member ? 
      `${this.capitalize(ledger.member.first_name)} ${this.capitalize(ledger.member.last_name)}` : 
      'Unknown Member';
    doc.text(memberName, 10, 57);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (ledger.member) {
      doc.text(ledger.member.mobile_number || 'N/A', 10, 64);
      doc.text(ledger.member.email || 'N/A', 10, 71);
      doc.text(ledger.member.address || 'N/A', 10, 78);
    }
  }
  
  private addPaymentTable(doc: jsPDF, ledger: Ledger): void {
    const startY = 100;
    const tableHeaders = ['NO', 'DESCRIPTION', 'AMOUNT', 'FINE', 'TOTAL'];
    
    // Generate table data
    const tableData = [];
    
    // Add ledger item
    tableData.push([
      '1', 
      ledger.ledger_name || ledger.ledgerType?.name || 'Service Fee', 
      ledger.amount,
      ledger.fine || 0,
      ledger.total_amount
    ]);
    
    // Calculate tax (assuming 15% tax as in the reference image)
    const subTotal = ledger.total_amount;
    const taxRate = 0.15;
    const taxAmount = subTotal * taxRate;
    const grandTotal = subTotal + taxAmount;
    
    // @ts-ignore
    doc.autoTable({
      startY: startY,
      head: [tableHeaders],
      body: tableData,
      foot: [],
      styles: { fontSize: 10 },
      headStyles: { 
        fillColor: [66, 133, 244],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [230, 242, 255]
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      },
      // didParseCell: (data) => {
      //   // Format currency cells
      //   if (data.column.index >= 2 && data.column.index <= 4 && data.section === 'body') {
      //     data.cell.text = [this.formatCurrency(data.cell.raw as number)];
      //   }
      // }
    });
    
    // Add summary information
    const tableEnd = (doc as any).lastAutoTable.finalY + 5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryX = 140;
    doc.text('Sub Total :', summaryX, tableEnd);
    doc.text('Tax 15% :', summaryX, tableEnd + 7);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 133, 244); // Blue color
    doc.text('GRAND TOTAL :', summaryX, tableEnd + 20);
    doc.setTextColor(0, 0, 0); // Reset to black
    
    const valuesX = 190;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatCurrency(subTotal), valuesX, tableEnd, { align: 'right' });
    doc.text(this.formatCurrency(taxAmount), valuesX, tableEnd + 7, { align: 'right' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(66, 133, 244); // Blue color
    doc.text(this.formatCurrency(grandTotal), valuesX, tableEnd + 20, { align: 'right' });
    doc.setTextColor(0, 0, 0); // Reset to black
    
    // Draw line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(10, tableEnd + 25, doc.internal.pageSize.getWidth() - 10, tableEnd + 25);
  }
  
  private addPaymentStatus(doc: jsPDF, ledger: Ledger): void {
    const statusY = (doc as any).lastAutoTable.finalY + 35;
    
    // Payment status
    doc.setFillColor(66, 133, 244); // Blue background
    doc.rect(10, statusY, 80, 7, 'F');
    
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT STATUS:', 12, statusY + 5);
    doc.setTextColor(0, 0, 0); // Reset to black
    
    // Due date and status
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`due date: ${this.formatDate(ledger.due_date)}`, 12, statusY + 15);
    doc.text(`status: ${this.getStatusText(ledger.invoice_status)}`, 12, statusY + 22);
    
    // Signature section
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 100, statusY + 15, pageWidth - 10, statusY + 15);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized signature', pageWidth - 55, statusY + 25, { align: 'center' });
  }
  
  private addTermsAndConditions(doc: jsPDF): void {
    const termsY = (doc as any).lastAutoTable.finalY + 60;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Term and Conditions :', 10, termsY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Please send payment within 30 days of receiving this invoice. There will be 10%', 10, termsY + 7);
    doc.text('interest charge per month on late invoice.', 10, termsY + 14);
  }
  
  private addFooter(doc: jsPDF, pageWidth: number): void {
    const footerY = doc.internal.pageSize.getHeight() - 20;
    
    // Add horizontal line
    doc.setDrawColor(66, 133, 244); // Blue color for the line
    doc.setLineWidth(0.5);
    doc.line(10, footerY - 10, pageWidth - 10, footerY - 10);
    
    // Add phone and email
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Phone icon placeholder
    doc.setTextColor(66, 133, 244);
    doc.text('📞', 20, footerY);
    doc.setTextColor(0, 0, 0);
    doc.text('123-456-7890', 35, footerY);
    
    // Email icon placeholder
    doc.setTextColor(66, 133, 244);
    doc.text('✉️', 100, footerY);
    doc.setTextColor(0, 0, 0);
    doc.text('hello@reallygreatsite.com', 115, footerY);
    
    // Generated date
    doc.text(`Generated on :${new Date().toLocaleDateString()}`, pageWidth - 10, footerY, { align: 'right' });
  }
  
  private getStatusText(status: InvoiceStatus): string {
    switch(status) {
      case InvoiceStatus.Pending: return 'pending';
      case InvoiceStatus.Paid: return 'paid';
      case InvoiceStatus.Overdue: return 'overdue';
      case InvoiceStatus.Cancelled: return 'cancelled';
      default: return 'unknown';
    }
  }
  
  private formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  private formatCurrency(amount: number | undefined): string {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
  
  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  }
}