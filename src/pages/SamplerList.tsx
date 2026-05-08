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
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import { api } from '@/services/api';
import { exportToCSV } from '@/utils/export';

interface Sampler {
  id: number;
  name: string;
  employee_code: string;
  phone: string;
  entry_date: string;
  status: string;
  job_level: number;
}

export function SamplerList() {
  const [samplers, setSamplers] = useState<Sampler[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSampler, setEditingSampler] = useState<Sampler | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    employee_code: '',
    phone: '',
    entry_date: '',
    status: 'active',
    job_level: 1,
  });

  useEffect(() => {
    loadSamplers();
  }, []);

  const loadSamplers = async () => {
    try {
      const data = await api.samplers.list();
      setSamplers(data || []);
    } catch (error) {
      console.error('Failed to load samplers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSampler) {
        await api.samplers.update(editingSampler.id, formData);
      } else {
        await api.samplers.create(formData);
      }
      setDialogOpen(false);
      setEditingSampler(null);
      resetForm();
      loadSamplers();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleEdit = (sampler: Sampler) => {
    setEditingSampler(sampler);
    setFormData({
      name: sampler.name,
      employee_code: sampler.employee_code || '',
      phone: sampler.phone || '',
      entry_date: sampler.entry_date || '',
      status: sampler.status,
      job_level: sampler.job_level || 1,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个采样员吗？')) return;
    try {
      await api.samplers.delete(id);
      loadSamplers();
    } catch (error) {
      alert('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      employee_code: '',
      phone: '',
      entry_date: '',
      status: 'active',
      job_level: 1,
    });
  };

  const openCreateDialog = () => {
    setEditingSampler(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleExport = () => {
    exportToCSV(
      samplers,
      '采样员列表',
      [
        { key: 'name', label: '姓名' },
        { key: 'employee_code', label: '工号' },
        { key: 'phone', label: '联系电话' },
        { key: 'entry_date', label: '入职日期' },
        { key: 'job_level', label: '岗位等级' },
        { key: 'status', label: '状态' },
      ]
    );
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">采样员管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                新增采样员
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSampler ? '编辑采样员' : '新增采样员'}</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">姓名</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="employee_code">工号</Label>
                <Input
                  id="employee_code"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">联系电话</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="entry_date">入职日期</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="job_level">岗位等级</Label>
                <select
                  id="job_level"
                  value={formData.job_level}
                  onChange={(e) => setFormData({ ...formData, job_level: parseInt(e.target.value, 10) || 1 })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value={1}>一级 - 岗位工资 200 元/月</option>
                  <option value={2}>二级 - 岗位工资 400 元/月</option>
                  <option value={3}>三级 - 岗位工资 800 元/月</option>
                  <option value={4}>四级 - 岗位工资 1600 元/月</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status">状态</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="active">在职</option>
                  <option value="inactive">离职</option>
                  <option value="leave">休假</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">{editingSampler ? '更新' : '创建'}</Button>
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
              <TableHead>姓名</TableHead>
              <TableHead>工号</TableHead>
              <TableHead>联系电话</TableHead>
              <TableHead>入职日期</TableHead>
              <TableHead>岗位等级</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {samplers.map((sampler) => (
              <TableRow key={sampler.id}>
                <TableCell className="font-medium">{sampler.name}</TableCell>
                <TableCell>{sampler.employee_code}</TableCell>
                <TableCell>{sampler.phone}</TableCell>
                <TableCell>{sampler.entry_date}</TableCell>
                <TableCell>{sampler.job_level || 1}级</TableCell>
                <TableCell>
                  <Badge variant={sampler.status === 'active' ? 'default' : 'secondary'}>
                    {sampler.status === 'active' ? '在职' : sampler.status === 'leave' ? '休假' : '离职'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(sampler)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(sampler.id)}>
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
