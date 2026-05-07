import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calculator, DollarSign, FileCheck, Download } from 'lucide-react';
import { api } from '@/services/api';
import { exportToCSV } from '@/utils/export';

interface SalaryRecord {
  id: number;
  sampler_id: number;
  sampler_name?: string;
  year_month: string;
  base_salary: number;
  piece_rate_salary: number;
  hourly_salary: number;
  overtime_pay: number;
  performance_bonus: number;
  deductions: number;
  total_salary: number;
  actual_salary: number;
  payment_status: string;
  payment_date?: string;
}

interface Sampler {
  id: number;
  name: string;
}

export function SalaryList() {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [samplers, setSamplers] = useState<Sampler[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sampler_id: 0,
    year_month: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [salaryData, samplersData] = await Promise.all([
        api.salaries.list(),
        api.samplers.list(),
      ]);
      setSalaryRecords(salaryData || []);
      setSamplers(samplersData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.salaries.calculate(formData);
      setCalculateDialogOpen(false);
      loadData();
      alert('薪酬计算成功');
    } catch (error) {
      alert('计算失败');
    }
  };

  const handlePay = async (id: number) => {
    try {
      await api.salaries.pay(id);
      loadData();
    } catch (error) {
      alert('操作失败');
    }
  };

  const openCalculateDialog = () => {
    setFormData({
      sampler_id: 0,
      year_month: new Date().toISOString().slice(0, 7),
    });
    setCalculateDialogOpen(true);
  };

  const handleExport = () => {
    exportToCSV(
      salaryRecords,
      '薪酬记录列表',
      [
        { key: 'sampler_name', label: '采样员' },
        { key: 'year_month', label: '年月' },
        { key: 'base_salary', label: '基础工资' },
        { key: 'piece_rate_salary', label: '计件工资' },
        { key: 'hourly_salary', label: '工时工资' },
        { key: 'overtime_pay', label: '加班费' },
        { key: 'performance_bonus', label: '绩效奖金' },
        { key: 'total_salary', label: '应发总额' },
        { key: 'payment_status', label: '发放状态' },
      ]
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'paid' ? 'default' : 'secondary'}>
        {status === 'paid' ? '已发放' : '未发放'}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">薪酬管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
          <Dialog open={calculateDialogOpen} onOpenChange={setCalculateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCalculateDialog}>
                <Calculator className="mr-2 h-4 w-4" />
                计算薪酬
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>计算月度薪酬</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleCalculate} className="space-y-4">
              <div>
                <Label htmlFor="sampler_id">采样员</Label>
                <select
                  id="sampler_id"
                  value={formData.sampler_id}
                  onChange={(e) => setFormData({ ...formData, sampler_id: parseInt(e.target.value) })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value={0}>请选择采样员</option>
                  {samplers.map((sampler) => (
                    <option key={sampler.id} value={sampler.id}>
                      {sampler.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="year_month">年月</Label>
                <Input
                  id="year_month"
                  type="month"
                  value={formData.year_month}
                  onChange={(e) => setFormData({ ...formData, year_month: e.target.value })}
                  required
                />
              </div>
              <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                <p>薪酬将包含以下部分：</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>基础工资（按采样员设置）</li>
                  <li>计件工资（按完成任务数量×难度系数）</li>
                  <li>工时工资（按审核通过的工时）</li>
                  <li>加班费（1.5 倍）</li>
                  <li>绩效奖金（基础工资的 10%）</li>
                </ul>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCalculateDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">开始计算</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">薪酬总额</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ¥{salaryRecords.reduce((sum, r) => sum + r.total_salary, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">所有记录合计</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已发放</CardTitle>
            <FileCheck className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ¥{salaryRecords.filter(r => r.payment_status === 'paid').reduce((sum, r) => sum + r.actual_salary, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{salaryRecords.filter(r => r.payment_status === 'paid').length} 条记录</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待发放</CardTitle>
            <Plus className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ¥{salaryRecords.filter(r => r.payment_status === 'unpaid').reduce((sum, r) => sum + r.actual_salary, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{salaryRecords.filter(r => r.payment_status === 'unpaid').length} 条记录</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>采样员</TableHead>
              <TableHead>年月</TableHead>
              <TableHead>基础工资</TableHead>
              <TableHead>计件工资</TableHead>
              <TableHead>工时工资</TableHead>
              <TableHead>加班费</TableHead>
              <TableHead>绩效奖金</TableHead>
              <TableHead>应发总额</TableHead>
              <TableHead>发放状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaryRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.sampler_name || '-'}</TableCell>
                <TableCell>{record.year_month}</TableCell>
                <TableCell>¥{record.base_salary?.toFixed(2)}</TableCell>
                <TableCell>¥{record.piece_rate_salary?.toFixed(2)}</TableCell>
                <TableCell>¥{record.hourly_salary?.toFixed(2)}</TableCell>
                <TableCell>¥{record.overtime_pay?.toFixed(2)}</TableCell>
                <TableCell>¥{record.performance_bonus?.toFixed(2)}</TableCell>
                <TableCell className="font-semibold text-green-600">¥{record.total_salary?.toFixed(2)}</TableCell>
                <TableCell>{getPaymentStatusBadge(record.payment_status)}</TableCell>
                <TableCell className="text-right">
                  {record.payment_status === 'unpaid' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handlePay(record.id)}
                    >
                      确认发放
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
