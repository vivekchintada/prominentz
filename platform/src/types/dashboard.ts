export interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
}

export interface ShiftSummary {
  id: string;
  employee: { name: string; email: string };
  scheduledStart: string; // ISO
  scheduledEnd: string;   // ISO
  status: string;
}

export interface SalesHour {
  hour: number; // 0-23
  orders: number;
  revenue: number; // decimal
}
