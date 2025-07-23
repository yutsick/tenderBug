import { useState } from 'react';
import { Button, Upload, Typography, Divider, Space, List } from 'antd';
import { UploadOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface OrdersTabProps {
  onSubmit: () => void;
}

export default function OrdersTab({ onSubmit }: OrdersTabProps) {
  const [documents, setDocuments] = useState([
    { id: '1', name: 'Dozvil2026-05.doc', type: 'uploaded' }
  ]);

  const orderTypes = [
    {
      title: 'Про призначення відповідальних за організацію і безпечне виконання робіт підвищеної небезпеки',
      required: true
    },
    {
      title: 'Відповідальний за належний стан пожежної безпеки на об\'єкті виконання робіт',
      required: true
    },
    {
      title: 'Відповідальний за належний стан екологічної безпеки на об\'єкті виконання робіт',
      required: true
    },
    {
      title: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці відповідальних осіб за організацію безпечного виконання робіт підрядником',
      required: true,
      hasDocument: true,
      documentName: 'Dozvil2026-05.doc'
    },
    {
      title: 'Копії посвідчень та протоколів навчання і перевірки знань правил з охорони праці та навчання безпечним методам роботи працівників підрядника',
      required: true
    },
    {
      title: 'Медичні заключення про допуск до виконання робіт за зазначеними професіями',
      required: true
    }
  ];

  const handleFileUpload = (info: any) => {
    // Handle file upload logic here
    console.log('File uploaded:', info);
  };

  const removeDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <Paragraph className="text-gray-600 mb-6">
          Додайте завірені копії наступних наказів та посвідчень:
        </Paragraph>

        <div className="space-y-6">
          {orderTypes.map((order, index) => (
            <div key={index} className="space-y-3">
              <Text strong className="block text-gray-800">
                {order.title}
              </Text>
              
              {order.hasDocument ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                    <FileTextOutlined className="text-blue-500" />
                    <Text className="flex-1">{order.documentName}</Text>
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => removeDocument('1')}
                    />
                  </div>
                  <Upload
                    showUploadList={false}
                    onChange={handleFileUpload}
                  >
                    <Button icon={<UploadOutlined />} className="w-full">
                      Додати файл
                    </Button>
                  </Upload>
                </div>
              ) : (
                <Upload
                  showUploadList={false}
                  onChange={handleFileUpload}
                >
                  <Button icon={<UploadOutlined />} className="w-full">
                    Додати файл
                  </Button>
                </Upload>
              )}
            </div>
          ))}
        </div>
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