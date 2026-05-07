CREATE TABLE public.samplers (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  app_id VARCHAR(128),
  emp_id VARCHAR(128),
  name VARCHAR(100) NOT NULL,
  employee_code VARCHAR(50),
  phone VARCHAR(20),
  entry_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  base_salary DECIMAL(10,2) DEFAULT 0,
  skill_level VARCHAR(20),
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.sampling_tasks (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  app_id VARCHAR(128),
  emp_id VARCHAR(128),
  task_code VARCHAR(50),
  task_type VARCHAR(20) NOT NULL,
  location TEXT,
  sampler_id INTEGER REFERENCES public.samplers(id),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  sample_count INTEGER DEFAULT 0,
  difficulty_level DECIMAL(3,2) DEFAULT 1.0,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.work_hours_s_6a7bcadf_8 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  app_id VARCHAR(128),
  emp_id VARCHAR(128),
  sampler_id INTEGER REFERENCES public.samplers(id),
  work_date DATE NOT NULL,
  regular_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  weekend_hours DECIMAL(5,2) DEFAULT 0,
  holiday_hours DECIMAL(5,2) DEFAULT 0,
  total_hours DECIMAL(5,2) DEFAULT 0,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by VARCHAR(128),
  approved_at TIMESTAMP,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.salary_records_s_6a7bcadf_8 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  app_id VARCHAR(128),
  emp_id VARCHAR(128),
  sampler_id INTEGER REFERENCES public.samplers(id),
  year_month VARCHAR(7) NOT NULL,
  base_salary DECIMAL(10,2) DEFAULT 0,
  piece_rate_salary DECIMAL(10,2) DEFAULT 0,
  hourly_salary DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  performance_bonus DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  total_salary DECIMAL(10,2) DEFAULT 0,
  actual_salary DECIMAL(10,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  payment_date DATE,
  notes TEXT,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.salary_configs_s_6a7bcadf_8 (
  id SERIAL PRIMARY KEY,
  corp_id VARCHAR(128),
  app_id VARCHAR(128),
  emp_id VARCHAR(128),
  config_type VARCHAR(50) NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value DECIMAL(10,4) NOT NULL,
  effective_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  is_deleted CHAR(1) DEFAULT 'n',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
