import { useState } from 'react';
import { Button, Card, Input, DatePicker, Upload, Typography, Row, Col, Divider } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Employee {
  id: string;
  name: string;
  photo: string;
  medicalExamDate: string;
  organizationName: string;
  position: string;
  qualificationCertificate: string;
  qualificationIssueDate: string;
  safetyTrainingCertificate: string;
  safetyTrainingDate: string;
  expanded: boolean;
}

interface EmployeesTabProps {
  onSubmit: () => void;
}

export default function EmployeesTab({ onSubmit }: EmployeesTabProps) {
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      name: 'Давиденко Олексій Давидович',
      photo: '',
      medicalExamDate: '25.09.2026',
      organizationName: '',
      position: '',
      qualificationCertificate: '',
      qualificationIssueDate: '25.09.2026',
      safetyTrainingCertificate: '',
      safetyTrainingDate: '25.09.2026',
      expanded: false
    },
    {
      id: '2',
      name: '',
      photo: '',
      medicalExamDate: '',
      organizationName: '',
      position: '',
      qualificationCertificate: '',
      qualificationIssueDate: '',
      safetyTrainingCertificate: '',
      safetyTrainingDate: '',
      expanded: true
    }
  ]);

  const addEmployee = () => {
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: '',
      photo: '',
      medicalExamDate: '',
      organizationName: '',
      position: '',
      qualificationCertificate: '',
      qualificationIssueDate: '',
      safetyTrainingCertificate: '',
      safetyTrainingDate: '',
      expanded: true
    };
    setEmployees([...employees, newEmployee]);
  };

  const removeEmployee = (id: string) => {
    setEmployees(employees.filter(emp => emp.id !== id));
  };

  const toggleEmployee = (id: string) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, expanded: !emp.expanded } : emp
    ));
  };

  const updateEmployee = (id: string, field: keyof Employee, value: any) => {
    setEmployees(employees.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  return (
    <div className="space-y-4">
      {employees.map((employee) => (
        <Card key={employee.id} className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                type="text"
                icon={employee.expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => toggleEmployee(employee.id)}
                className="text-gray-600"
              />
              <Text strong className="text-lg">Співробітник</Text>
              {employee.name && (
                <Text className="text-gray-600">{employee.name}</Text>
              )}
            </div>
            
            {employees.length > 1 && (
              <Button
                type="text"
                icon={<DeleteOutlined />}
                className="text-gray-400 hover:text-red-500"
                onClick={() => removeEmployee(employee.id)}
              />
            )}
          </div>

          {employee.expanded && (
            <div className="space-y-6">
              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">П.І.Б.</Text>
                    <Input
                      value={employee.name}
                      onChange={(e) => updateEmployee(employee.id, 'name', e.target.value)}
                      placeholder="Введіть повне ім'я"
                    />
                  </div>
                </Col>
                
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">Фото</Text>
                    <Upload>
                      <Button icon={<UploadOutlined />} className="w-full">
                        Додати файл
                      </Button>
                    </Upload>
                  </div>
                </Col>
              </Row>

              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">
                      Дата закінчення дії періодичного медичного огляду
                    </Text>
                    <DatePicker 
                      className="w-full"
                      format="DD.MM.YYYY"
                      placeholder="Оберіть дату"
                    />
                  </div>
                </Col>
              </Row>

              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">
                      Назва підрядної/субпідрядної організації
                    </Text>
                    <Input
                      value={employee.organizationName}
                      onChange={(e) => updateEmployee(employee.id, 'organizationName', e.target.value)}
                      placeholder="Введіть назву організації"
                    />
                  </div>
                </Col>
                
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">Посада/професія</Text>
                    <Input
                      value={employee.position}
                      onChange={(e) => updateEmployee(employee.id, 'position', e.target.value)}
                      placeholder="Введіть посаду"
                    />
                  </div>
                </Col>
              </Row>

              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">Кваліфікаційне посвідчення</Text>
                    <Upload>
                      <Button icon={<UploadOutlined />} className="w-full">
                        Додати файл
                      </Button>
                    </Upload>
                  </div>
                </Col>
                
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">Дата видачі</Text>
                    <DatePicker 
                      className="w-full"
                      format="DD.MM.YYYY"
                      placeholder="Оберіть дату"
                    />
                  </div>
                </Col>
              </Row>

              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">
                      Посвідчення про проходження навчання з питань ОП
                    </Text>
                    <Upload>
                      <Button icon={<UploadOutlined />} className="w-full">
                        Додати файл
                      </Button>
                    </Upload>
                  </div>
                </Col>
                
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">Дата закінчення дії посвідчення</Text>
                    <DatePicker 
                      className="w-full"
                      format="DD.MM.YYYY"
                      placeholder="Оберіть дату"
                    />
                  </div>
                </Col>
              </Row>

              <div>
                <Text strong className="block mb-2">
                  Посвідчення про проходження спеціального навчання безпечним 
                  методам виконання робіт підвищеної небезпеки
                </Text>
                <Upload>
                  <Button icon={<UploadOutlined />} className="w-full">
                    Додати файл
                  </Button>
                </Upload>
              </div>

              <Row gutter={[24, 16]}>
                <Col xs={24} md={12}>
                  <div>
                    <Text strong className="block mb-2">Дата закінчення дії посвідчення</Text>
                    <DatePicker 
                      className="w-full"
                      format="DD.MM.YYYY"
                      placeholder="Оберіть дату"
                    />
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Card>
      ))}

      <div className="text-center">
        <Button 
          type="dashed" 
          icon={<PlusOutlined />}
          onClick={addEmployee}
          className="border-green-500 text-green-600 hover:border-green-600"
        >
          Додати співробітника
        </Button>
      </div>

      <Divider />

      <div className="text-center">
        <Button 
          type="primary" 
          size="large"
          className="bg-gray-400 border-gray-400 hover:bg-gray-500 px-8"
          onClick={onSubmit}
        >
          Надіслати дані
        </Button>
      </div>
    </div>
  );
}