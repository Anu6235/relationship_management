export interface Member {
  id: number;
  profile_image?: string;
  profile_image_url?: string | null;
  first_name: string;
  last_name: string;
  mobile_number: string;
  email: string;
  address: string;
}

export interface Ledger {
    id: number;
    ledger_type_id: number;
    ledger_name: string;
    invoice_created_at: Date;
    due_date: Date;
    amount: number;
    fine: number;
    total_amount: number;
    invoice_status: number; // 1=Pending, 2=Paid, 3=Overdue, 4=Cancelled
    fine_last_calculated_at?: Date;
    paid_at?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    ledgerType?: LedgerType;
    member?: Member;
  }
  
  export interface LedgerType {
    id: number;
    name: string;
    description: string;
    amount: number;
    is_active: boolean;
    start_date: string; 
    duration_value: number;
    duration_unit: 'minute' | 'hour' | 'day' | 'month';
    fine_amount: number;
    fine_interval_value: number;
    fine_interval_unit: 'minute' | 'hour' | 'day' | 'month';
    condition_config: any; // JSON object containing member filter conditions
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export interface LedgerResponse {
    success: boolean;
    data: Ledger[];
    count?: number;
    message?: string;
  }
  
  export interface SingleLedgerResponse {
    success: boolean;
    data: Ledger;
    message?: string;
  }
  
  export interface LedgerTypeResponse {
    success: boolean;
    data: LedgerType[];
  }
  
  export interface SingleLedgerTypeResponse {
    success: boolean;
    data: LedgerType;
    message?: string;
  }
  
  export interface EligibleMembersResponse {
    success: boolean;
    count: number;
    data: any[];
  }
  
  export interface MemberField {
    label: string;
    value: string;
    options?: string[];
  }
  
  export interface RecalculateFinesResponse {
    success: boolean;
    message: string;
    updatedCount: number;
  }
  
  export interface GenerateLedgersResponse {
    success: boolean;
    message: string;
    count: number;
  }
  
  export interface SchedulerStatusResponse {
    success: boolean;
    status: string;
    nextRun?: Date;
    frequency?: string;
  }
  
  // Enum for invoice status
  export enum InvoiceStatus {
    Pending = 1,
    Paid = 2,
    Overdue = 3,
    Cancelled = 4
  }
  
  // Enum for duration units
  export enum DurationUnit {
    Minute = 'minute',
    Hour = 'hour',
    Day = 'day',
    Month = 'month'
  }