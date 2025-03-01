export interface Ledger {
    id: number;
    ledger_type_id: number;
    ledger_name: string;
    member_id: number;
    invoice_created_at: Date;
    due_date: Date;
    amount: number;
    fee: number;
    total_amount: number;
    invoice_status: number;
    ledgerType?: LedgerType;
    member?: any;
    createdAt?: Date;
    updatedAt?: Date;
  }

export interface LedgerType {
    id: number;
    name: string;
    description: string;
    amount: number;
    is_active: boolean;
    duration_value: number;
    duration_unit: 'minute' | 'hour' | 'day' | 'month';
    condition_config: any;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface LedgerResponse {
    success: boolean;
    data: Ledger[];
}

export interface SingleLedgerResponse {
    success: boolean;
    data: Ledger;
}

export interface LedgerTypeResponse {
    success: boolean;
    data: LedgerType[];
}

export interface SingleLedgerTypeResponse {
    success: boolean;
    data: LedgerType;
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