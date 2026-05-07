import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './_core/env.js';
import { need_login } from './_core/auth.js';
import { initDatabase } from './lib/db.js';
import authRoutes from './routes/auth.js';
import samplersRoutes from './routes/samplers.js';
import tasksRoutes from './routes/tasks.js';
import workHoursRoutes from './routes/workHours.js';
import salariesRoutes from './routes/salaries.js';
import salaryConfigsRoutes from './routes/salaryConfigs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

initDatabase();

app.use(cors({
  credentials: true,
  origin: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth', authRoutes);
app.use('/api', need_login);

app.use('/api/samplers', samplersRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/work-hours', workHoursRoutes);
app.use('/api/salaries', salariesRoutes);
app.use('/api/salary-configs', salaryConfigsRoutes);

app.use((_req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '..') });
});

app.listen(ENV.port, () => {
  console.log(`Server running on http://localhost:${ENV.port}`);
  console.log(`SQLite database: ${ENV.databasePath}`);
});
