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

interface Task {
  id: number;
  task_code: string;
  task_type: string;
  location: string;
  sampler_id: number;
  sampler_name?: string;
  start_time: string;
  end_time: string;
  status: string;
  sample_count: number;
  difficulty_level: number;
}

interface Sampler {
  id: number;
  name: string;
}

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [samplers, setSamplers] = useState<Sampler[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    task_code: '',
    task_type: 'water',
    location: '',
    sampler_id: 0,
    start_time: '',
    sample_count: 0,
    difficulty_level: 1,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksData, samplersData] = await Promise.all([
        api.tasks.list(),
        api.samplers.list(),
      ]);
      setTasks(tasksData || []);
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
      if (editingTask) {
        await api.tasks.update(editingTask.id, formData);
      } else {
        await api.tasks.create(formData);
      }
      setDialogOpen(false);
      setEditingTask(null);
      resetForm();
      loadData();
    } catch (error) {
      alert('操作失败');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      task_code: task.task_code || '',
      task_type: task.task_type,
      location: task.location || '',
      sampler_id: task.sampler_id,
      start_time: task.start_time ? task.start_time.split('T')[0] : '',
      sample_count: task.sample_count,
      difficulty_level: task.difficulty_level,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个任务吗？')) return;
    try {
      await api.tasks.delete(id);
      loadData();
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await api.tasks.complete(id);
      loadData();
    } catch (error) {
      alert('操作失败');
    }
  };

  const resetForm = () => {
    setFormData({
      task_code: '',
      task_type: 'water',
      location: '',
      sampler_id: 0,
      start_time: '',
      sample_count: 0,
      difficulty_level: 1,
    });
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleExport = () => {
    exportToCSV(
      tasks,
      '采样任务列表',
      [
        { key: 'task_code', label: '任务编号' },
        { key: 'task_type', label: '任务类型' },
        { key: 'location', label: '采样地点' },
        { key: 'sampler_name', label: '采样员' },
        { key: 'start_time', label: '开始时间' },
        { key: 'sample_count', label: '样本数量' },
        { key: 'difficulty_level', label: '难度系数' },
        { key: 'status', label: '状态' },
      ]
    );
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      water: '水质',
      air: '大气',
      soil: '土壤',
      noise: '噪声',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      pending: 'secondary',
      processing: 'default',
      completed: 'outline',
    };
    const labels: Record<string, string> = {
      pending: '待执行',
      processing: '进行中',
      completed: '已完成',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">采样任务管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                创建任务
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTask ? '编辑任务' : '创建采样任务'}</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="task_code">任务编号</Label>
                <Input
                  id="task_code"
                  value={formData.task_code}
                  onChange={(e) => setFormData({ ...formData, task_code: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="task_type">任务类型</Label>
                <select
                  id="task_type"
                  value={formData.task_type}
                  onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="water">水质</option>
                  <option value="air">大气</option>
                  <option value="soil">土壤</option>
                  <option value="noise">噪声</option>
                </select>
              </div>
              <div>
                <Label htmlFor="location">采样地点</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
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
                <Label htmlFor="start_time">开始时间</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sample_count">样本数量</Label>
                <Input
                  id="sample_count"
                  type="number"
                  value={formData.sample_count}
                  onChange={(e) => setFormData({ ...formData, sample_count: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="difficulty_level">难度系数</Label>
                <Input
                  id="difficulty_level"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3"
                  value={formData.difficulty_level}
                  onChange={(e) => setFormData({ ...formData, difficulty_level: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit">{editingTask ? '更新' : '创建'}</Button>
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
              <TableHead>任务编号</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>地点</TableHead>
              <TableHead>采样员</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>样本数</TableHead>
              <TableHead>难度系数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.task_code}</TableCell>
                <TableCell>{getTaskTypeLabel(task.task_type)}</TableCell>
                <TableCell>{task.location}</TableCell>
                <TableCell>{task.sampler_name || '-'}</TableCell>
                <TableCell>{task.start_time ? new Date(task.start_time).toLocaleString() : '-'}</TableCell>
                <TableCell>{task.sample_count}</TableCell>
                <TableCell>{task.difficulty_level}</TableCell>
                <TableCell>{getStatusBadge(task.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {task.status !== 'completed' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleComplete(task.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
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
