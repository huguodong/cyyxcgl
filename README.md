# 环境检测公司采样员薪酬管理系统

面向环境检测公司的内部业务系统，用于统一管理采样员、任务、工时与薪酬核算。

> 当前版本为 **React + Express + SQLite 单体部署模式**：前端构建产物由 Express 提供静态服务，后端 API 与页面同域部署。

## 核心功能

- **采样员管理**：人员档案、技能等级、在岗状态维护
- **采样任务管理**：任务创建、分配、状态流转（待执行/进行中/已完成）
- **工时管理**：日常工时记录、加班统计、审核流程
- **薪酬管理**：月度薪酬计算、发放状态管理、扣款项处理
- **薪酬配置**：基础工资、计件规则、绩效参数可配置
- **统计看板**：业务总览与关键指标可视化

## 技术栈

### 前端

- React 18
- Vite 7
- TypeScript 5
- Tailwind CSS 3
- shadcn/ui + Radix UI

### 后端

- Node.js + Express
- SQLite（`better-sqlite3`）
- Cookie Session（本地账号登录）

## 目录结构

```text
.
├─ src/                    # 前端源码
│  ├─ pages/               # 页面（Dashboard、采样员、任务、工时、薪酬等）
│  ├─ components/          # 业务组件 + ui 组件
│  ├─ services/            # API 调用封装
│  └─ types/               # TS 类型定义
├─ server/                 # 后端源码
│  ├─ routes/              # 路由（auth/samplers/tasks/workHours/salaries...）
│  ├─ lib/                 # DB、session、密码工具
│  └─ _core/               # 环境变量、鉴权中间件
├─ data/                   # SQLite 数据目录（默认）
├─ dist/                   # 构建产物（前端 + 编译后端）
├─ spec.md                 # 业务/表结构说明文档
└─ ecosystem.config.cjs    # PM2 配置
```

## 快速开始

## 1) 安装依赖

```bash
npm install
```

## 2) 构建项目

```bash
npm run build
```

## 3) 启动服务

```bash
npm run start
```

默认访问地址：`http://localhost:3002`

默认管理员账号（首次初始化数据库时自动创建）：

- 用户名：`admin`
- 密码：`admin123456`

> ⚠️ 生产环境务必修改 `ADMIN_PASSWORD` 和 `SESSION_SECRET`。

## 开发说明

- `npm run dev`：启动 Vite 前端开发服务器（偏 UI 开发用途）
- `npm run build` + `npm run start`：用于完整前后端联调（推荐）
- `npm run lint`：运行 ESLint

> 当前未配置 Vite `/api` 代理，若直接使用 `npm run dev` 进行接口联调，需额外配置代理或使用统一服务模式。

## 环境变量（后端）

可通过系统环境变量或 `ecosystem.config.cjs` 配置：

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3002` | 服务端口 |
| `DATABASE_PATH` | `./data/sampler-salary.sqlite` | SQLite 文件路径 |
| `SESSION_SECRET` | `change-this-session-secret` | Session 签名密钥 |
| `SESSION_COOKIE_SECURE` | `false` | 是否只允许 HTTPS Cookie |
| `SESSION_MAX_AGE_MS` | `604800000` | Session 有效期（毫秒） |
| `SESSION_COOKIE_NAME` | `sampler_salary_session` | Cookie 名称 |
| `ADMIN_USERNAME` | `admin` | 默认管理员账号 |
| `ADMIN_PASSWORD` | `admin123456` | 默认管理员密码 |
| `ADMIN_NAME` | `系统管理员` | 默认管理员显示名 |
| `APP_ID` | `internal-app` | 应用标识 |
| `CORP_ID` | `internal` | 企业标识 |

## Windows + PM2 部署

项目已提供打包脚本：

```bat
build-publish.bat
```

执行后会生成 `publish/` 目录，包含：

- `dist/` 构建产物
- `start-pm2.bat` / `stop-pm2.bat`
- `ecosystem.config.cjs`
- `DEPLOY.txt` 部署说明

服务端执行：

```bat
start-pm2.bat
```

## 常用脚本

```bash
npm run dev          # Vite 开发模式
npm run build:client # 构建前端
npm run build:server # 构建后端
npm run build        # 构建前后端
npm run start        # 启动生产服务
npm run lint         # ESLint
npm run preview      # 预览前端构建结果
```

## 说明

- 数据库结构初始化逻辑在 `server/lib/db.ts`
- API 路由入口在 `server/index.ts`
- 若你正在从旧版 Supabase 方案迁移，请以当前代码实现（SQLite + 本地登录）为准
