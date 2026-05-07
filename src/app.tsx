import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { SamplerList } from './pages/SamplerList';
import { SalaryConfigList } from './pages/SalaryConfigList';
import { SalaryList } from './pages/SalaryList';
import { TaskList } from './pages/TaskList';
import { WorkHoursList } from './pages/WorkHoursList';

function ProtectedLayout() {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">正在加载系统...</div>;
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <Layout />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedLayout />} path="/">
        <Route element={<Navigate replace to="/dashboard" />} index />
        <Route element={<Dashboard />} path="dashboard" />
        <Route element={<SamplerList />} path="samplers" />
        <Route element={<TaskList />} path="tasks" />
        <Route element={<WorkHoursList />} path="work-hours" />
        <Route element={<SalaryList />} path="salaries" />
        <Route element={<SalaryConfigList />} path="salary-configs" />
        <Route element={<Navigate replace to="/dashboard" />} path="*" />
      </Route>
      <Route element={<Login />} path="/login" />
      <Route element={<Navigate replace to="/dashboard" />} path="*" />
    </Routes>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
