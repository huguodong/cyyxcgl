# 环境检测公司采样员薪酬管理系统 - 产品规格文档

## 系统概述

本系统用于环境检测公司管理采样员的日常工作、工时记录和薪酬计算。系统提供采样员信息管理、采样任务分配、工时自动统计、薪酬核算等功能，帮助公司高效管理采样团队。

## 功能特性

### 1. 采样员管理
- 采样员基本信息管理（姓名、工号、联系方式、入职日期等）
- 采样员技能资质管理
- 采样员状态管理（在职、离职、休假）

### 2. 采样任务管理
- 创建和分配采样任务
- 任务类型分类（水质、大气、土壤、噪声等）
- 任务地点记录
- 任务开始/结束时间
- 任务状态跟踪（待执行、进行中、已完成）

### 3. 工时记录
- 自动记录采样员工时
- 工作日/周末/节假日区分
- 加班时长计算
- 工时审核流程

### 4. 薪酬计算
- 基础工资设置
- 计件工资（按任务数量/类型）
- 工时工资
- 加班费计算
- 绩效奖金
- 扣款项管理
- 月度薪酬汇总

### 5. 统计报表
- 个人工作量统计
- 团队绩效对比
- 月度薪酬报表
- 工时分析图表

## 技术栈

- **Frontend**: React 18 + Vite + TypeScript
- **UI Framework**: Tailwind CSS 3 + Radix UI
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth

## 数据库结构

### 表设计

#### 1. samplers (采样员信息表)
```sql
- id: 主键
- corp_id: 企业 ID
- app_id: 应用 ID
- emp_id: 员工 ID
- name: 姓名
- employee_code: 工号
- phone: 联系电话
- entry_date: 入职日期
- status: 状态 (active/inactive)
- base_salary: 基础工资
- skill_level: 技能等级
- is_deleted: 删除标记
- created_at: 创建时间
- updated_at: 更新时间
```

#### 2. sampling_tasks (采样任务表)
```sql
- id: 主键
- corp_id: 企业 ID
- app_id: 应用 ID
- emp_id: 创建人 ID
- task_code: 任务编号
- task_type: 任务类型 (water/air/soil/noise)
- location: 采样地点
- sampler_id: 采样员 ID (关联 samplers 表)
- start_time: 开始时间
- end_time: 结束时间
- status: 状态 (pending/processing/completed)
- sample_count: 样本数量
- difficulty_level: 难度系数
- is_deleted: 删除标记
- created_at: 创建时间
- updated_at: 更新时间
```

#### 3. work_hours (工时记录表)
```sql
- id: 主键
- corp_id: 企业 ID
- app_id: 应用 ID
- emp_id: 创建人 ID
- sampler_id: 采样员 ID (关联 samplers 表)
- work_date: 工作日期
- regular_hours: 正常工时
- overtime_hours: 加班工时
- weekend_hours: 周末工时
- holiday_hours: 节假日工时
- total_hours: 总工时
- is_approved: 是否已审核
- approved_by: 审核人
- approved_at: 审核时间
- is_deleted: 删除标记
- created_at: 创建时间
- updated_at: 更新时间
```

#### 4. salary_records (薪酬记录表)
```sql
- id: 主键
- corp_id: 企业 ID
- app_id: 应用 ID
- emp_id: 创建人 ID
- sampler_id: 采样员 ID (关联 samplers 表)
- year_month: 年月 (YYYY-MM)
- base_salary: 基础工资
- piece_rate_salary: 计件工资
- hourly_salary: 工时工资
- overtime_pay: 加班费
- performance_bonus: 绩效奖金
- deductions: 扣款项
- total_salary: 应发总额
- actual_salary: 实发金额
- payment_status: 发放状态 (unpaid/paid)
- payment_date: 发放日期
- notes: 备注
- is_deleted: 删除标记
- created_at: 创建时间
- updated_at: 更新时间
```

#### 5. salary_configs (薪酬配置表)
```sql
- id: 主键
- corp_id: 企业 ID
- app_id: 应用 ID
- emp_id: 创建人 ID
- config_type: 配置类型 (overtime_rate/piece_rate/hourly_rate)
- config_key: 配置键
- config_value: 配置值
- effective_date: 生效日期
- is_active: 是否启用
- is_deleted: 删除标记
- created_at: 创建时间
- updated_at: 更新时间
```

## API 接口设计

### 采样员管理
- `GET /api/samplers` - 获取采样员列表
- `GET /api/samplers/:id` - 获取采样员详情
- `POST /api/samplers` - 创建采样员
- `PUT /api/samplers/:id` - 更新采样员
- `DELETE /api/samplers/:id` - 删除采样员

### 采样任务管理
- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务
- `POST /api/tasks/:id/complete` - 完成任务

### 工时记录
- `GET /api/work-hours` - 获取工时列表
- `GET /api/work-hours/:id` - 获取工时详情
- `POST /api/work-hours` - 创建工时记录
- `PUT /api/work-hours/:id` - 更新工时记录
- `DELETE /api/work-hours/:id` - 删除工时记录
- `POST /api/work-hours/:id/approve` - 审核工时

### 薪酬管理
- `GET /api/salaries` - 获取薪酬记录列表
- `GET /api/salaries/:id` - 获取薪酬详情
- `POST /api/salaries/calculate` - 计算薪酬
- `PUT /api/salaries/:id` - 更新薪酬记录
- `DELETE /api/salaries/:id` - 删除薪酬记录
- `POST /api/salaries/:id/pay` - 确认发放

### 统计报表
- `GET /api/stats/sampler/:id` - 采样员个人统计
- `GET /api/stats/team` - 团队统计
- `GET /api/stats/monthly/:yearMonth` - 月度统计

## 项目结构

```
src/
├── components/
│   ├── samplers/        # 采样员相关组件
│   ├── tasks/           # 任务管理组件
│   ├── work-hours/      # 工时记录组件
│   ├── salaries/        # 薪酬管理组件
│   └── stats/           # 统计图表组件
├── pages/
│   ├── SamplerList.tsx
│   ├── TaskList.tsx
│   ├── WorkHoursList.tsx
│   ├── SalaryList.tsx
│   └── Dashboard.tsx
├── services/            # API 服务层
├── types/               # TypeScript 类型定义
└── utils/               # 工具函数

server/
├── routes/
│   ├── samplers.ts
│   ├── tasks.ts
│   ├── workHours.ts
│   └── salaries.ts
├── lib/
│   └── user-context.ts
└── index.ts
```

## 用户界面设计

### 1. 仪表盘
- 本月关键指标卡片（采样员数量、完成任务数、总工时、薪酬总额）
- 近期任务状态概览
- 待审核工时提醒

### 2. 采样员管理页面
- 列表视图：表格展示所有采样员
- 搜索和筛选功能
- 新增/编辑采样员对话框
- 查看采样员详情和工作统计

### 3. 任务管理页面
- 任务列表（支持按状态、类型、日期筛选）
- 任务创建表单
- 任务详情和进度跟踪
- 任务分配功能

### 4. 工时记录页面
- 日历视图展示工时
- 工时录入表单
- 工时审核界面
- 工时统计图表

### 5. 薪酬管理页面
- 月度薪酬列表
- 薪酬计算功能
- 薪酬详情查看
- 薪酬发放管理
- 导出报表功能

## 权限控制

- 管理员：所有操作权限
- 人事专员：采样员管理、薪酬管理
- 部门主管：任务分配、工时审核
- 采样员：仅查看个人数据

## 数据安全

- 所有数据按 corp_id 隔离
- 敏感操作记录日志
- 定期数据备份
