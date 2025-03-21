import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AppConfigService } from './app-config.service';
import { firstValueFrom } from 'rxjs';
import { InvoiceStatus, Ledger } from '../models/ledger';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LedgerPdfService {
  private logoUrl: string | null = null;
  private appName: string = '';
  private email: string = '';
  private contact: string = '';

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
          this.logoUrl = `${environment.BASE_URL}${response.data.logo}`;
        }
        this.appName = response.data.app_name || '';
        this.email = response.data.email || '';
        this.contact = response.data.contact || '';
      }
    } catch (error) {
      console.error('Error loading app config:', error);
    }
  }

  async downloadLedgerAsPdf(ledger: Ledger): Promise<void> {
    await this.loadAppConfig();
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add header with logo and app name
    await this.addHeader(doc, pageWidth);
    
    // Add invoice title and statement
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

    // Add signature section
    this.addSignature(doc);
    
    // Add footer
    this.addFooter(doc, pageWidth);
    
    // Save the PDF
    doc.save(`Invoice_${ledger.id}.pdf`);
  }
  
  private async addHeader(doc: jsPDF, pageWidth: number): Promise<void> {
    const logoSize = 8; // Logo size (width and height)
    const logoX = 10; // X position of the logo
    const logoY = 10; // Y position of the logo

    if (this.logoUrl) {
        try {
            const logo = await this.loadImage(this.logoUrl);
            doc.addImage(logo, 'PNG', logoX, logoY, logoSize, logoSize); // Add logo with desired size
        } catch (error) {
            console.error('Error loading logo:', error);
        }
    }

    // App Name
    const appNameX = logoX + logoSize + 10; // X position of app name (logoX + logoSize + spacing)
    const appNameY = logoY + (logoSize / 2) + 2; // Y position of app name (vertically centered with logo)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33); // Dark gray for app name
    doc.text(this.appName, appNameX, appNameY);

    // Horizontal line
    const lineY = logoY + logoSize + 10; // Y position of the line (logoY + logoSize + spacing)
    doc.setDrawColor(200, 200, 200); // Light gray line
    doc.setLineWidth(0.5);
    doc.line(10, lineY, pageWidth - 10, lineY); // Line spans the page width
}

private addInvoiceTitle(doc: jsPDF, pageWidth: number): void {
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 133, 244); // Blue color for "INVOICE"
  doc.text('INVOICE', pageWidth - 10, 20, { align: 'right' });
}

private addInvoiceDetails(doc: jsPDF, ledger: Ledger): void {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Invoice Number
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33); // Dark gray for invoice number
  doc.text(`Invoice no : ${ledger.id}`, pageWidth - 10, 55, { align: 'right' });

  // Creation Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100); // Gray for date
  doc.text(`created ${this.formatDate(ledger.invoice_created_at)}`, pageWidth - 10, 62, { align: 'right' });
}

private addMemberDetails(doc: jsPDF, ledger: Ledger): void {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(33, 33, 33); // Dark gray for "Invoice to"
  doc.text('Invoice to :', 10, 55);

  // Member Name
  doc.setFontSize(14);
  const memberName = ledger.member ? 
      `${this.capitalize(ledger.member.first_name)} ${this.capitalize(ledger.member.last_name)}` : 
      'Unknown Member';
  doc.text(memberName, 10, 62);

  // Member Contact Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100); // Gray for contact details

  if (ledger.member) {
      doc.text(ledger.member.mobile_number || 'N/A', 10, 69);
      doc.text(ledger.member.email || 'N/A', 10, 76);
      doc.text(ledger.member.address || 'N/A', 10, 83);
  }
}
  
private addPaymentTable(doc: jsPDF, ledger: Ledger): void {
  const startY = 95; // Start table below member details
  const tableHeaders = ['NO', 'DESCRIPTION', 'AMOUNT', 'FINE', 'TOTAL'];

  const tableData = [];
  tableData.push([
      '1', 
      ledger.ledger_name || ledger.ledgerType?.name || 'Service Fee', 
      (ledger.amount),
      (ledger.fine || 0),
      (ledger.total_amount)
  ]);

  const subTotal = ledger.total_amount;
  const taxRate = 0.15;
  const taxAmount = parseFloat((subTotal * taxRate).toFixed(2));
  const grandTotal = subTotal + taxAmount;

  // @ts-ignore
  doc.autoTable({
      startY: startY,
      head: [tableHeaders],
      body: tableData,
      theme: 'grid',
      styles: { 
          fontSize: 10,
          cellPadding: 4,
          textColor: [33, 33, 33] // Dark gray for table text
      },
      headStyles: { 
          fillColor: [66, 133, 244], // Blue for header
          textColor: [255, 255, 255], // White text
          fontStyle: 'bold'
      },
      alternateRowStyles: {
          fillColor: [240, 245, 255] // Light blue for alternate rows
      },
      columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // Center align "NO"
          1: { cellWidth: 'auto', halign: 'left' }, // Left align "DESCRIPTION"
          2: { cellWidth: 30, halign: 'right' }, // Right align "AMOUNT"
          3: { cellWidth: 30, halign: 'right' }, // Right align "FINE"
          4: { cellWidth: 30, halign: 'right' } // Right align "TOTAL"
      }
  });

  const tableEnd = (doc as any).lastAutoTable.finalY + 10;

  // Summary Section
  const summaryX = 140;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100); // Gray for summary labels
  doc.text('Sub Total :', summaryX, tableEnd);
  doc.text('Tax 15% :', summaryX, tableEnd + 7);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 133, 244); // Blue for "GRAND TOTAL"
  doc.text('GRAND TOTAL :', summaryX, tableEnd + 20);

  const valuesX = 190;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(33, 33, 33); // Dark gray for values
  doc.text(subTotal.toString(), valuesX, tableEnd, { align: 'right' });
  doc.text(taxAmount.toString(), valuesX, tableEnd + 7, { align: 'right' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(66, 133, 244); // Blue for grand total value
  doc.text(grandTotal.toString(), valuesX, tableEnd + 20, { align: 'right' });
}

  
private addPaymentStatus(doc: jsPDF, ledger: Ledger): void {
  const statusY = (doc as any).lastAutoTable.finalY + 35;

  // Payment Status Header
  doc.setFillColor(66, 133, 244); // Blue background
  doc.rect(10, statusY, 80, 7, 'F');

  doc.setTextColor(255, 255, 255); // White text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT STATUS:', 12, statusY + 5);

  // Due Date and Status
  doc.setTextColor(33, 33, 33); // Dark gray for text
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`due date: ${this.formatDate(ledger.due_date)}`, 12, statusY + 15);
  doc.text(`status: ${this.getStatusText(ledger.invoice_status)}`, 12, statusY + 22);

  // // Signature Section
  // const pageWidth = doc.internal.pageSize.getWidth();
  // const signatureY = statusY + 10; // Align signature with Terms and Conditions

  // // Signature Line
  // doc.setDrawColor(200, 200, 200); // Light gray line
  // doc.setLineWidth(0.5);
  // doc.line(pageWidth - 100, signatureY + 10, pageWidth - 10, signatureY + 10);

  // // Signature Text
  // doc.setFontSize(10);
  // doc.setTextColor(100, 100, 100); // Gray for signature text
  // doc.text('Authorized signature', pageWidth - 55, signatureY + 25, { align: 'center' });
}

private addTermsAndConditions(doc: jsPDF): void {
  const termsY = (doc as any).lastAutoTable.finalY + 80;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Term and Conditions :', 10, termsY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('1. Payment is due on or before the due date.', 10, termsY + 7);
  doc.text('2. Late payments may incur additional fees as specified in membership terms.', 10, termsY + 14);
}

private addSignature(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const termsY = (doc as any).lastAutoTable.finalY + 88; // Same Y position as Terms and Conditions
  const signatureY = termsY + 30; // Signature section starts below Terms and Conditions

  // Signature Line
  doc.setDrawColor(200, 200, 200); // Light gray line
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 100, signatureY, pageWidth - 10, signatureY);

  // Signature Text
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100); // Gray for signature text
  doc.text('Authorized signature', pageWidth - 55, signatureY + 15, { align: 'center' });
}
  
private addFooter(doc: jsPDF, pageWidth: number): void {
  const footerY = doc.internal.pageSize.getHeight() - 20;

  // Add horizontal line
  doc.setDrawColor(66, 133, 244);
  doc.setLineWidth(0.5);
  doc.line(10, footerY - 10, pageWidth - 10, footerY - 10);

 // Add contact info from app config
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');

// Phone label and contact
doc.setTextColor(0, 0, 0); // Black for label
doc.text('Tel:', 10, footerY); // Text-based phone label
doc.setTextColor(0, 0, 0); // Black for text
doc.text(this.contact, 17, footerY);

// Email label and email
doc.setTextColor(0, 0, 0); // Black for label
doc.text('Email:', 90, footerY); // Text-based email label
doc.setTextColor(0, 0, 0); // Black for text
doc.text(this.email, 100, footerY);

  // Generated date
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - 10, footerY, { align: 'right' });
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

private formatCurrency(amount: number): string {
  if (amount == null || isNaN(amount)) return '₹0.00'; 

  // Format the amount manually
  const formattedAmount = amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
  });

  return `₹${formattedAmount}`; // Add ₹ symbol manually
}
  

private capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
  
private loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
  });
}
}