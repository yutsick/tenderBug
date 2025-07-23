import { useState } from 'react';
import { Button, Card, Input, Upload, Typography, Divider } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Technic {
  id: string;
  type: string;
  description: string;
  expanded: boolean;
  documents: {
    operationPermit: string;
    inspectionProtocol: string;
    supervisionLog: string;
    qualificationCertificate: string;
  };
}

interface TechnicsTabProps {
  onSubmit: () => void;
}

export default function TechnicsTab({ onSubmit }: TechnicsTabProps) {
  const [technics, setTechnics] = useState<Technic[]>([
    {
      id: '1',
      type: 'Ручний електроінструмент',
      description: '',
      expanded: false,
      documents: {
        operationPermit: '',
        inspectionProtocol: '',
        supervisionLog: '',
        qualificationCertificate: ''
      }
    },
    {
      id: '2',
      type: 'Компресори, пісокструйні агрегати',
      description: '',
      expanded: true,
      documents: {
        operationPermit: '',
        inspectionProtocol: '',
        supervisionLog: '',
        qualificationCertificate: ''
      }
    }
  ]);

  const addTechnic = () => {
    const newTechnic: Technic = {
      id: Date.now().toString(),
      type: '',
      description: '',
      expanded: true,
      documents: {
        operationPermit: '',
        inspectionProtocol: '',
        supervisionLog: '',
        qualificationCertificate: ''
      }
    };
    setTechnics([...technics, newTechnic]);
  };

  const removeTechnic = (id: string) => {
    setTechnics(technics.filter(tech => tech.id !== id));
  };

  const toggleTechnic = (id: string) => {
    setTechnics(technics.map(tech => 
      tech.id === id ? { ...tech, expanded: !tech.expanded } : tech
    ));
  };

  const updateTechnic = (id: string, field: keyof Technic, value: any) => {
    setTechnics(technics.map(tech => 
      tech.id === id ? { ...tech, [field]: value } : tech
    ));
  };

  return (
    <div className="space-y-4">
      {technics.map((technic) => (
        <Card key={technic.id} className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                type="text"
                icon={technic.expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => toggleTechnic(technic.id)}
                className="text-gray-600"
              />
              <div>
                <Text strong className="block text-lg">Тип інструменту</Text>
                <Text className="text-gray-600">{technic.type}</Text>
              </div>
            </div>
            
            {technics.length > 1 && (
              <Button
                type="text"
                icon={<DeleteOutlined />}
                className="text-gray-400 hover:text-red-500"
                onClick={() => removeTechnic(technic.id)}
              />
            )}
          </div>

          {technic.expanded && (
            <div className="space-y-6">
              <div>
                <Text strong className="block mb-2">
                  Тип інструменту
                </Text>
                <Input
                  value={technic.type}
                  onChange={(e) => updateTechnic(technic.id, 'type', e.target.value)}
                  placeholder="Введіть тип інструменту"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Text strong className="block mb-2">
                    Дозвіл на експлуатацію сосудин під тиском
                  </Text>
                  <Upload>
                    <Button icon={<UploadOutlined />} className="w-full">
                      Додати файл
                    </Button>
                  </Upload>
                </div>

                <div>
                  <Text strong className="block mb-2">
                    Протокол інспекції ізоляції ручного інструменту
                  </Text>
                  <Upload>
                    <Button icon={<UploadOutlined />} className="w-full">
                      Додати файл
                    </Button>
                  </Upload>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <Text strong className="block mb-2">
                    Журнал нагляду посудини що працює під тиском
                  </Text>
                  <Upload>
                    <Button icon={<UploadOutlined />} className="w-full">
                      Додати файл
                    </Button>
                  </Upload>
                </div>

                <div>
                  <Text strong className="block mb-2">
                    Кваліфікаційне посвідчення машиніста компресора
                  </Text>
                  <Upload>
                    <Button icon={<UploadOutlined />} className="w-full">
                      Додати файл
                    </Button>
                  </Upload>
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}

      <div className="text-center">
        <Button 
          type="dashed" 
          icon={<PlusOutlined />}
          onClick={addTechnic}
          className="border-green-500 text-green-600 hover:border-green-600"
        >
          Додати інструмент
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