import { useState } from 'react';
import { Button, Card, Input, DatePicker, Upload, Space, Typography, Divider } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface Work {
  id: string;
  specification: string;
  description: string;
  permits: string[];
  completionDate: string;
}

interface WorksTabProps {
  onSubmit: () => void;
}

export default function WorksTab({ onSubmit }: WorksTabProps) {
  const [works, setWorks] = useState<Work[]>([
    {
      id: '1',
      specification: '',
      description: 'Роботи підвищеної небезпеки\n\nРоботи на кабельних лініях і діючих електроустановках',
      permits: [],
      completionDate: '25.09.2026'
    }
  ]);

  const addWork = () => {
    const newWork: Work = {
      id: Date.now().toString(),
      specification: '',
      description: '',
      permits: [],
      completionDate: ''
    };
    setWorks([...works, newWork]);
  };

  const removeWork = (id: string) => {
    setWorks(works.filter(work => work.id !== id));
  };

  const updateWork = (id: string, field: keyof Work, value: any) => {
    setWorks(works.map(work => 
      work.id === id ? { ...work, [field]: value } : work
    ));
  };

  return (
    <div className="space-y-6">
      {works.map((work, index) => (
        <Card key={work.id} className="relative">
          {works.length > 1 && (
            <Button
              type="text"
              icon={<DeleteOutlined />}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
              onClick={() => removeWork(work.id)}
            />
          )}
          
          <div className="space-y-4">
            <div>
              <Text strong className="block mb-2">
                Тип робіт за специфікацією
              </Text>
              <TextArea
                placeholder="з додатку договору"
                value={work.specification}
                onChange={(e) => updateWork(work.id, 'specification', e.target.value)}
                className="text-sm text-gray-500"
                autoSize={{ minRows: 1 }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Text strong className="block mb-2">
                  Роботи підвищеної небезпеки
                </Text>
                <TextArea
                  value={work.description}
                  onChange={(e) => updateWork(work.id, 'description', e.target.value)}
                  rows={4}
                  className="w-full"
                />
              </div>

              <div>
                <Text strong className="block mb-2">
                  Дозволи
                </Text>
                <div className="space-y-2 mb-2">
                  <Upload>
                    <Button icon={<UploadOutlined />} className="w-full">
                      Додати файл
                    </Button>
                  </Upload>
                </div>
                
                <Text strong className="block mb-2 mt-4">
                  Дата завершення дії
                </Text>
                <DatePicker 
                  className="w-full"
                  placeholder="Оберіть дату"
                  format="DD.MM.YYYY"
                />
              </div>
            </div>
          </div>
        </Card>
      ))}

      <div className="text-center">
        <Button 
          type="dashed" 
          icon={<PlusOutlined />}
          onClick={addWork}
          className="border-green-500 text-green-600 hover:border-green-600"
        >
          Додати тип робіт
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