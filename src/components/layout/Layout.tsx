import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Banknote,
  Settings,
  Building2,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth } from '@/components/auth/AuthProvider';

const navigation = [
  { name: '仪表盘', href: '/dashboard', icon: LayoutDashboard },
  { name: '采样员管理', href: '/samplers', icon: Users },
  { name: '薪酬管理', href: '/salaries', icon: Banknote },
  { name: '薪酬配置', href: '/salary-configs', icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar>
          <div className="flex h-16 items-center border-b px-6">
            <Building2 className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-semibold">采样员薪酬系统</span>
          </div>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location.pathname === item.href}
                      >
                        <Link to={item.href}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 lg:pl-64">
          <div className="border-b bg-white px-8 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">{user?.name || '已登录用户'}</h1>
            </div>
            <Button onClick={handleLogout} size="sm" variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </Button>
          </div>
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
