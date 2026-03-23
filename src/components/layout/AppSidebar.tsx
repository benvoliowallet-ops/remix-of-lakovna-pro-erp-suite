import { useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Package, Users, Settings, LogOut, Factory, BarChart3, Receipt } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const mainMenuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Zákazky', url: '/zakazky', icon: ClipboardList },
  { title: 'Sklad', url: '/sklad', icon: Package },
];

const adminOnlyMainItems = [
  { title: 'Zákazníci', url: '/zakaznici', icon: Users },
];

const adminMenuItems = [
  { title: 'Reporty', url: '/reporty', icon: BarChart3 },
  { title: 'Fakturácia', url: '/fakturacia', icon: Receipt },
  { title: 'Nastavenia', url: '/nastavenia', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { isAdmin, signOut, user } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <Sidebar
      className={collapsed ? 'w-16' : 'w-64'}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
            <Factory className="h-6 w-6 text-accent-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">Lakovňa PRO</h1>
              <p className="text-xs text-sidebar-foreground/60">ERP Systém</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">
            {!collapsed && 'Hlavné menu'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/60">
              {!collapsed && 'Administrácia'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[...adminOnlyMainItems, ...adminMenuItems].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4 bg-sidebar-border" />
        {!collapsed && user && (
          <div className="mb-3 text-sm text-sidebar-foreground/80">
            <p className="truncate font-medium">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-5 w-5" />
          {!collapsed && 'Odhlásiť sa'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
