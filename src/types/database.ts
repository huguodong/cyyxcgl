// Database row types aligned with the sampler salary V3 policy.

export interface SalaryConfigsS6A7Bcadf8Row {
  id: number;
  corp_id: string | null;
  app_id: string | null;
  emp_id: string | null;
  config_type: string;
  config_key: string;
  config_value: number;
  effective_date: string | null;
  is_active: boolean | null;
  is_deleted: string | null;
  description?: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export type SalaryConfigsS6A7Bcadf8Insert = Omit<SalaryConfigsS6A7Bcadf8Row, 'id' | 'corp_id' | 'emp_id' | 'is_deleted' | 'created_at' | 'updated_at'>;
export type SalaryConfigsS6A7Bcadf8Update = Partial<SalaryConfigsS6A7Bcadf8Insert>;

export interface SalaryRecordsS6A7Bcadf8Row {
  id: number;
  corp_id: string | null;
  app_id: string | null;
  emp_id: string | null;
  sampler_id: number | null;
  year_month: string;
  basic_salary: number | null;
  position_salary: number | null;
  group_revenue: number | null;
  performance_pool: number | null;
  equal_performance: number | null;
  differential_performance: number | null;
  workload_points: number | null;
  group_workload_points: number | null;
  workload_share: number | null;
  attendance_days: number | null;
  required_attendance_days: number | null;
  attendance_rate: number | null;
  quality_score: number | null;
  timeliness_score: number | null;
  equipment_score: number | null;
  comprehensive_score: number | null;
  comprehensive_coefficient: number | null;
  performance_salary: number | null;
  other_pay: number | null;
  veto: boolean | number | null;
  veto_reason: string | null;
  total_salary: number | null;
  actual_salary: number | null;
  payment_status: string | null;
  payment_date: string | null;
  notes: string | null;
  is_deleted: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export type SalaryRecordsS6A7Bcadf8Insert = Omit<SalaryRecordsS6A7Bcadf8Row, 'id' | 'corp_id' | 'emp_id' | 'is_deleted' | 'created_at' | 'updated_at'>;
export type SalaryRecordsS6A7Bcadf8Update = Partial<SalaryRecordsS6A7Bcadf8Insert>;

export interface SamplersRow {
  id: number;
  corp_id: string | null;
  app_id: string | null;
  emp_id: string | null;
  name: string;
  employee_code: string | null;
  phone: string | null;
  entry_date: string | null;
  status: string | null;
  job_level: number | null;
  is_deleted: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export type SamplersInsert = Omit<SamplersRow, 'id' | 'corp_id' | 'emp_id' | 'is_deleted' | 'created_at' | 'updated_at'>;
export type SamplersUpdate = Partial<SamplersInsert>;

export interface SamplingTasksRow {
  id: number;
  corp_id: string | null;
  app_id: string | null;
  emp_id: string | null;
  task_code: string | null;
  task_type: string;
  location: string | null;
  sampler_id: number | null;
  start_time: string | null;
  end_time: string | null;
  status: string | null;
  sample_count: number | null;
  difficulty_level: number | null;
  is_deleted: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export type SamplingTasksInsert = Omit<SamplingTasksRow, 'id' | 'corp_id' | 'emp_id' | 'is_deleted' | 'created_at' | 'updated_at'>;
export type SamplingTasksUpdate = Partial<SamplingTasksInsert>;

export interface WorkHoursS6A7Bcadf8Row {
  id: number;
  corp_id: string | null;
  app_id: string | null;
  emp_id: string | null;
  sampler_id: number | null;
  work_date: string;
  regular_hours: number | null;
  overtime_hours: number | null;
  weekend_hours: number | null;
  holiday_hours: number | null;
  total_hours: number | null;
  is_approved: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  is_deleted: string | null;
  created_at: string | null;
  updated_at: string | null;
}
export type WorkHoursS6A7Bcadf8Insert = Omit<WorkHoursS6A7Bcadf8Row, 'id' | 'corp_id' | 'emp_id' | 'is_deleted' | 'created_at' | 'updated_at'>;
export type WorkHoursS6A7Bcadf8Update = Partial<WorkHoursS6A7Bcadf8Insert>;
