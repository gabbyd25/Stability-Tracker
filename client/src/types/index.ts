// Simple types for the frontend
export interface User {
  id: string;
  username: string;
  email: string;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  testing_intervals: number[];
  is_preset: boolean;
  created_at: string;
  updated_at: string;
}

export interface FTCycleTemplate {
  id: string;
  name: string;
  description?: string;
  freeze_hours: number;
  thaw_hours: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  product_number: string;
  product_name: string;
  lot_number: string;
  sample_size: number;
  start_date: string;
  test_type: 'RT' | 'ACC' | 'LT';
  schedule_template?: ScheduleTemplate;
  ft_cycle_type: 'consecutive' | 'weekly' | 'biweekly' | 'custom';
  ft_cycle_custom?: any;
  created_at: string;
}

export interface Task {
  id: string;
  product: Product;
  due_date: string;
  description: string;
  completed: boolean;
  completed_at?: string;
  deleted: boolean;
  deleted_at?: string;
  created_at: string;
}