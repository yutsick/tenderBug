'use client';

import { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined, 
  HomeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  MenuOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Помилка при виході:', error);
    } finally {
      logout();
      router.push('/login');
    }
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        Профіль
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        Налаштування
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
        Вихід
      </Menu.Item>
    </Menu>
  );

  const menuItems = [
    {
      key: 'cabinet',
      icon: <HomeOutlined />,
      label: 'Кабінет',
      onClick: () => router.push('/cabinet')
    },
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: 'Документи',
      onClick: () => router.push('/cabinet/documents')
    },
    {
      key: 'status',
      icon: <CheckCircleOutlined />,
      label: 'Статус заявки',
      onClick: () => router.push('/cabinet/status')
    }
  ];

  const getSelectedKey = () => {
    if (pathname === '/cabinet') return 'cabinet';
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/status')) return 'status';
    return 'cabinet';
  };

  const getPageTitle = () => {
    if (pathname.includes('/documents')) return 'Документи';
    if (pathname.includes('/status')) return 'Статус заявки';
    return 'Особистий кабінет';
  };

  const getCompanyName = () => {
    if (user?.company_name) {
      return user.company_name.length > 30 
        ? `${user.company_name.substring(0, 30)}...` 
        : user.company_name;
    }
    return user?.email || 'Користувач';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
        }}
        width={250}
      >
        {/* Logo/Brand */}
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8 
          }}>
            <div style={{
              width: 32,
              height: 32,
              background: '#52c41a',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              ЗБ
            </div>
            {!collapsed && (
              <Title level={5} style={{ margin: 0, color: '#52c41a' }}>
                Західний Буг
              </Title>
            )}
          </div>
        </div>
        
        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{ 
            border: 'none',
            marginTop: 16
          }}
        />

        {/* User Info in Sidebar */}
        {!collapsed && user && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            padding: 12,
            background: '#f8f9fa',
            borderRadius: 8,
            border: '1px solid #e9ecef'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              marginBottom: 4
            }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: 'medium',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {getCompanyName()}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#6c757d' 
                }}>
                  {user.department_name}
                </div>
              </div>
            </div>
          </div>
        )}
      </Sider>
      
      <Layout>
        {/* Header */}
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 48,
                height: 48,
              }}
            />
            
            <Title level={3} style={{ margin: 0, color: '#2c3e50' }}>
              {getPageTitle()}
            </Title>
          </div>
          
          <Space size={16}>
            {user && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 'medium' }}>
                  {user.contact_person || 'Користувач'}
                </div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                  {user.email}
                </div>
              </div>
            )}
            
            <Dropdown overlay={userMenu} placement="bottomRight">
              <Avatar 
                size="large" 
                icon={<UserOutlined />} 
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: '#52c41a'
                }}
              />
            </Dropdown>
          </Space>
        </Header>
        
        {/* Main Content */}
        <Content style={{ 
          margin: '24px',
          padding: 0,
          minHeight: 280
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}