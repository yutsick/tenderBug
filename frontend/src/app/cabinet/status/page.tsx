'use client';

import { Card, Row, Col, Statistic, Timeline, Tag, Alert } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  FormOutlined,
  AuditOutlined
} from '@ant-design/icons';
import { useAuth } from '@/hooks/useAuth';
import { getStatusColor, getStatusText, formatDateTime } from '@/lib/utils';
import { User } from '@/types/user';

// Етапи workflow
function getWorkflowSteps(user: User) {
  const steps = [
    {
      key: 'registration',
      title: 'Реєстрація',
      description: 'Подання заявки',
      completed: true,
      color: 'green',
      icon: <FormOutlined />,
      timestamp: user.created_at,
    },
    {
      key: 'admin_approval',
      title: 'Схвалення адміном',
      description: user.status === 'new' 
        ? 'Очікує схвалення адміністратором підрозділу' 
        : 'Схвалено адміністратором',
      completed: user.status !== 'new',
      color: user.status === 'new' ? 'blue' : 'green',
      icon: <AuditOutlined />,
      timestamp: user.status !== 'new' ? user.updated_at : null,
    },
    {
      key: 'activation',
      title: 'Активація акаунту',
      description: user.is_activated 
        ? 'Акаунт активовано' 
        : user.status === 'new' 
          ? 'Очікує схвалення для отримання лінку активації'
          : 'Перевірте email для активації',
      completed: user.is_activated,
      color: user.is_activated ? 'green' : 
             user.status === 'new' ? 'gray' : 'blue',
      icon: <MailOutlined />,
      timestamp: user.is_activated ? user.last_login : null,
    },
    {
      key: 'documents',
      title: 'Заповнення документів',
      description: user.status === 'pending' 
        ? 'Документи завантажено, очікують перевірки' 
        : user.status === 'accepted' || user.status === 'declined'
          ? 'Документи перевірено'
          : user.is_activated 
            ? 'Заповніть усі необхідні документи в кабінеті'
            : 'Доступно після активації',
      completed: ['pending', 'accepted', 'declined'].includes(user.status),
      color: user.status === 'pending' ? 'orange' : 
             user.status === 'accepted' ? 'green' :
             user.status === 'declined' ? 'red' :
             user.is_activated ? 'blue' : 'gray',
      icon: <FileTextOutlined />,
      timestamp: ['pending', 'accepted', 'declined'].includes(user.status) ? user.updated_at : null,
    },
    {
      key: 'verification',
      title: 'Остаточна перевірка',
      description: user.status === 'accepted' 
        ? 'Заявку підтверджено' 
        : user.status === 'declined'
          ? 'Заявку відхилено'
          : user.status === 'pending'
            ? 'Документи на перевірці'
            : 'Очікує подання документів',
      completed: user.status === 'accepted',
      color: user.status === 'accepted' ? 'green' :
             user.status === 'declined' ? 'red' :
             user.status === 'pending' ? 'orange' : 'gray',
      icon: <CheckCircleOutlined />,
      timestamp: user.status === 'accepted' || user.status === 'declined' ? user.updated_at : null,
    },
  ];

  return steps;
}

// поточний статус
function getCurrentStatusInfo(user: User) {
  switch (user.status) {
    case 'new':
      return {
        type: 'info' as const,
        title: 'Заявка подана',
        message: 'Ваша заявка очікує схвалення адміністратором підрозділу. Це може зайняти до 2 робочих днів.',
        action: null,
      };
    case 'in_progress':
      if (!user.is_activated) {
        return {
          type: 'warning' as const,
          title: 'Потрібна активація',
          message: 'Перевірте свій email та активуйте акаунт за посиланням. Лінк дійсний 7 днів.',
          action: 'Активуйте акаунт',
        };
      }
      return {
        type: 'info' as const,
        title: 'Заповніть документи',
        message: 'Акаунт активовано. Тепер заповніть всі необхідні документи у своєму кабінеті.',
        action: 'Перейти до кабінету',
      };
    case 'pending':
      return {
        type: 'warning' as const,
        title: 'Документи на перевірці',
        message: 'Ваші документи перевіряються адміністратором. Очікуйте результат.',
        action: null,
      };
    case 'accepted':
      return {
        type: 'success' as const,
        title: 'Заявку підтверджено',
        message: 'Вітаємо! Ваша заявка підтверджена. Тепер ви можете повноцінно працювати в системі.',
        action: null,
      };
    case 'declined':
      return {
        type: 'error' as const,
        title: 'Заявку відхилено',
        message: 'На жаль, ваша заявка була відхилена. Зверніться до адміністратора для уточнення деталей.',
        action: 'Зв\'язатися з адміністратором',
      };
    case 'blocked':
      return {
        type: 'error' as const,
        title: 'Акаунт заблоковано',
        message: 'Ваш акаунт заблоковано. Зверніться до адміністратора.',
        action: 'Зв\'язатися з адміністратором',
      };
    default:
      return {
        type: 'info' as const,
        title: 'Статус невідомий',
        message: 'Зверніться до технічної підтримки.',
        action: null,
      };
  }
}

export default function StatusPage() {
  const { user } = useAuth();

  if (!user) return null;

  const workflowSteps = getWorkflowSteps(user);
  const statusInfo = getCurrentStatusInfo(user);

  // Timeline
  const timelineItems = workflowSteps.map((step, index) => ({
    color: step.color,
    dot: step.icon,
    children: (
      <div>
        <div style={{ marginBottom: 4 }}>
          <strong>{step.title}</strong>
          {step.completed && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />}
        </div>
        <p style={{ color: '#8c8c8c', margin: 0, fontSize: 14 }}>
          {step.description}
        </p>
        {step.timestamp && (
          <p style={{ color: '#8c8c8c', margin: 0, fontSize: 12, marginTop: 4 }}>
            {formatDateTime(step.timestamp)}
          </p>
        )}
      </div>
    ),
  }));

  return (
    <div>
      {/* Актуальный статус */}
      <Alert
        type={statusInfo.type}
        showIcon
        style={{ marginBottom: 24 }}
        message={statusInfo.title}
        description={statusInfo.message}
        
      />

      {/* Статистика */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Номер тендеру"
              value={user.tender_number}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Поточний статус"
              value={getStatusText(user.status)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: getStatusColor(user.status) === 'green' ? '#3f8600' : 
                                   getStatusColor(user.status) === 'red' ? '#cf1322' : 
                                   getStatusColor(user.status) === 'orange' ? '#d48806' : '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Підрозділ"
              value={user.department_name}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Активація"
              value={user.is_activated ? 'Активовано' : 'Очікує'}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ 
                color: user.is_activated ? '#3f8600' : '#d48806' 
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Інформація про компанію">
            <div style={{ lineHeight: '1.8' }}>
              <p><strong>Назва:</strong> {user.company_name}</p>
              <p><strong>ЄДРПОУ:</strong> {user.edrpou}</p>
              <p><strong>Контактна особа:</strong> {user.contact_person}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Телефон:</strong> {user.phone}</p>
              {user.legal_address && (
                <p><strong>Юридична адреса:</strong> {user.legal_address}</p>
              )}
              {user.director_name && (
                <p><strong>Директор:</strong> {user.director_name}</p>
              )}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card 
            title="Хронологія процесу"
            extra={
              <Tag color={getStatusColor(user.status)}>
                {getStatusText(user.status)}
              </Tag>
            }
          >
            <Timeline items={timelineItems} />
          </Card>
        </Col>
      </Row>

      {/* Прогрес бар */}
      <Card 
        title="Прогрес заявки" 
        style={{ marginTop: 16 }}
        extra={
          <span style={{ fontSize: 14, color: '#8c8c8c' }}>
            {workflowSteps.filter(step => step.completed).length} з {workflowSteps.length} етапів
          </span>
        }
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, overflowX: 'auto' }}>
          {workflowSteps.map((step, index) => (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', minWidth: 120 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: step.completed ? '#52c41a' : 
                                  step.color === 'blue' ? '#1890ff' :
                                  step.color === 'orange' ? '#fa8c16' : '#d9d9d9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 14,
                }}
              >
                {step.completed ? <CheckCircleOutlined /> : index + 1}
              </div>
              <div style={{ marginLeft: 8, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: step.completed ? 600 : 400 }}>
                  {step.title}
                </div>
              </div>
              {index < workflowSteps.length - 1 && (
                <div
                  style={{
                    width: 24,
                    height: 2,
                    backgroundColor: step.completed ? '#52c41a' : '#d9d9d9',
                    marginLeft: 8,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}