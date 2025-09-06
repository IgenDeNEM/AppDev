import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  VpnKey as KeyIcon,
  Visibility as ScreenIcon,
  Terminal as TerminalIcon,
  Assessment as LogsIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Email as EmailIcon,
  BarChart as BarChartIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import UserManagement from './admin/UserManagement';
import KeyManagement from './admin/KeyManagement';
import RemoteControl from './admin/RemoteControl';
import ActivityLogs from './admin/ActivityLogs';
import DashboardOverview from './admin/DashboardOverview';
import EmailManagement from './admin/EmailManagement';
import KeyStatistics from './admin/KeyStatistics';
import AdvancedUserSearch from './admin/AdvancedUserSearch';
import PackageStoreManagement from './admin/PackageStoreManagement';
import UserRoleManagement from './admin/UserRoleManagement';
import { ThemeMenu } from './ThemeToggle';

const drawerWidth = 240;

function AdminDashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'users', label: 'User Management', icon: <PeopleIcon /> },
    { id: 'roles', label: 'Role Management', icon: <PeopleIcon /> },
    { id: 'search', label: 'Advanced Search', icon: <SearchIcon /> },
    { id: 'keys', label: 'Key Management', icon: <KeyIcon /> },
    { id: 'statistics', label: 'Key Statistics', icon: <BarChartIcon /> },
    { id: 'packages', label: 'Package Store', icon: <AddIcon /> },
    { id: 'remote', label: 'Remote Control', icon: <ScreenIcon /> },
    { id: 'email', label: 'Email Management', icon: <EmailIcon /> },
    { id: 'logs', label: 'Activity Logs', icon: <LogsIcon /> },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Admin Panel
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.id}
            selected={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
        <ListItem button onClick={logout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'users':
        return <UserManagement />;
      case 'roles':
        return <UserRoleManagement />;
      case 'search':
        return <AdvancedUserSearch />;
      case 'keys':
        return <KeyManagement />;
      case 'statistics':
        return <KeyStatistics />;
      case 'packages':
        return <PackageStoreManagement />;
      case 'remote':
        return <RemoteControl />;
      case 'email':
        return <EmailManagement />;
      case 'logs':
        return <ActivityLogs />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Tweak Admin Dashboard
          </Typography>
          <ThemeMenu />
          <Chip 
            label={`Welcome, ${user?.username}`} 
            color="secondary" 
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
}

export default AdminDashboard;