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
import { Plus, Pencil, Trash2, CheckCircle, Download } from 'lucide-react';
import { api } from '@/services/api';
import { exportToCSV } from '@/utils/export';

interface WorkHour {
  id: number;
  sampler_id: number;
  sampler_name?: string;
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  weekend_hours: number;
  holiday_hours: number;
  total_hours: number;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
}

interface Sampler {
  id: number;
  name: string;
}

export function WorkHoursList() {
  const [workHours, setWorkHours] = useState<WorkHour[]>([]);
  const [samplers, setSamplers] = useState<Sampler[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkHour, setEditingWorkHour] = useState<WorkHour | null>(null);
  const [formData, setFormData] = useState({
    sampler_id: 0,
    work_date: '',
    regular_hours: 0,
    overtime_hours: 0,
    weekend_hours: 0,
    holiday_hours: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [workHoursData, samplersData] = await Promise.all([
        api.workHours.list(),
        api.samplers.list(),
      ]);
      setWorkHours(workHoursData || []);
      setSamplers(samplersData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWorkHour) {
        await api.workHours.update(editingWorkHour.id, formData);
      } else {
        await api.workHours.create(formData);
      }
      setDialogOpen(false);
      setEditingWorkHour(null);
      resetForm();
      loadData();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleEdit = (workHour: WorkHour) => {
    setEditingWorkHour(workHour);
    setFormData({
      sampler_id: workHour.sampler_id,
      work_date: workHour.work_date,
      regular_hours: workHour.regular_hours,
      overtime_hours: workHour.overtime_hours,
      weekend_hours: workHour.weekend_hours,
      holiday_hours: workHour.holiday_hours,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条工时记录吗？')) return;
    try {
      await api.workHours.delete(id);
      loadData();
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.workHours.approve(id);
      loadData();
    } catch (error) {
      alert('审核失败');
    }
  };

  const resetForm = () => {
    setFormData({
      sampler_id: 0,
      work_date: new Date().toISOString().split('T')[0],
      regular_hours: 8,
      overtime_hours: 0,
      weekend_hours: 0,
      holiday_hours: 0,
    });
  };

  const openCreateDialog = () => {
    setEditingWorkHour(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleExport = () => {
    exportToCSV(
      workHours,
      '工时记录列表',
      [
        { key: 'sampler_name', label: '采样员' },
        { key: 'work_date', label: '工作日期' },
        { key: 'regular_hours', label: '正常工时' },
        { key: 'overtime_hours', label: '加班工时' },
        { key: 'weekend_hours', label: '周末工时' },
        { key: 'holiday_hours', label: '节假日工时' },
        { key: 'total_hours', label: '总工时' },
        { key: 'is_approved', label: '审核状态' },
      ]
    );
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">工时记录</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                添加工时
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingWorkHour ? '编辑工时' : '添加工时记录'}</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="work_date">工作日期</Label>
                <Input
                  id="work_date"
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => setFormData({ ...formData, work_date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="regular_hours">正常工时</Label>
                  <Input
                    id="regular_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.regular_hours}
                    onChange={(e) => setFormData({ ...formData, regular_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="overtime_hours">加班工时</Label>
                  <Input
                    id="overtime_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.overtime_hours}
                    onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weekend_hours">周末工时</Label>
                  <Input
                    id="weekend_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.weekend_hours}
                    onChange={(e) => setFormData({ ...formData, weekend_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="holiday_hours">节假日工时</Label>
                  <Input
                    id="holiday_hours"
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.holiday_hours}
                    onChange={(e) => setFormData({ ...formData, holiday_hours: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm text-muted-foreground">
                  总工时：{(formData.regular_hours + formData.overtime_hours + formData.weekend_hours + formData.holiday_hours).toFixed(1)} 小时
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">{editingWorkHour ? '更新' : '创建'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>采样员</TableHead>
              <TableHead>工作日期</TableHead>
              <TableHead>正常工时</TableHead>
              <TableHead>加班工时</TableHead>
              <TableHead>周末工时</TableHead>
              <TableHead>节假日工时</TableHead>
              <TableHead>总工时</TableHead>
              <TableHead>审核状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workHours.map((workHour) => (
              <TableRow key={workHour.id}>
                <TableCell className="font-medium">{workHour.sampler_name || '-'}</TableCell>
                <TableCell>{workHour.work_date}</TableCell>
                <TableCell>{workHour.regular_hours}</TableCell>
                <TableCell>{workHour.overtime_hours}</TableCell>
                <TableCell>{workHour.weekend_hours}</TableCell>
                <TableCell>{workHour.holiday_hours}</TableCell>
                <TableCell className="font-semibold">{workHour.total_hours}</TableCell>
                <TableCell>
                  <Badge variant={workHour.is_approved ? 'default' : 'secondary'}>
                    {workHour.is_approved ? '已审核' : '待审核'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!workHour.is_approved && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleApprove(workHour.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(workHour)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(workHour.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
