'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { LoginFormData, loginSchema } from '@/lib/validations';

const { Title } = Typography;

export default function LoginForm() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  const onFinish = async (values: LoginFormData) => {
    console.log('🔐 Login attempt:', values);
    setLoading(true);
    setError(null);
    
    try {
      const validatedData = loginSchema.parse(values);
      const response = await apiClient.login(validatedData);
      
      console.log('✅ Login response:', response.data);
      
      login(response.data.token, response.data.user);
      
      console.log('💾 Token saved, checking localStorage:', localStorage.getItem('token'));
      
      // Перенаправляємо залежно від ролі
      if (response.data.user.role === 'user') {
        console.log('🚀 Redirecting to cabinet');
        router.push('/cabinet');
      } else if (response.data.user.role === 'admin' || response.data.user.role === 'superadmin') {
        console.log('🚀 Redirecting to admin');
        router.push('/admin');
      } else {
        console.log('🚀 Default redirect to cabinet');
        router.push('/cabinet');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.non_field_errors) {
        setError(err.response.data.non_field_errors[0]);
      } else {
        setError('Помилка авторизації');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={2}>Вхід в систему</Title>
        <p style={{ color: '#8c8c8c' }}>Система управління тендерами</p>
      </div>
      
      {error && (
        <Alert 
          message={error} 
          type="error" 
          showIcon 
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={form}
        onFinish={onFinish}
        layout="vertical"
        size="large"
      >
        <Form.Item
          name="username"
          label="Email, логін або номер тендеру"
          rules={[
            { required: true, message: 'Введіть email, логін або номер тендеру' }
          ]}
        >
          <Input 
            prefix={<UserOutlined />}
            placeholder="Email, логін або номер тендеру"
          />
        </Form.Item>
        
        <Form.Item
          name="password"
          label="Пароль"
          rules={[
            { required: true, message: 'Введіть пароль' }
          ]}
        >
          <Input.Password 
            prefix={<LockOutlined />}
            placeholder="Пароль"
          />
        </Form.Item>
        
        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            style={{ width: '100%' }}
          >
            Увійти
          </Button>
        </Form.Item>
      </Form>
      
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link href="/register" style={{ color: '#1890ff' }}>
          Не маєте акаунту? Зареєструватися
        </Link>
      </div>
    </Card>
  );
}