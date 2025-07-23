import { useState } from 'react';
import { Button, Upload, Typography, Divider, List } from 'antd';
import { UploadOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface PPETabProps {
  onSubmit: () => void;
}

export default function PPETab({ onSubmit }: PPETabProps) {
  const [documents, setDocuments] = useState([
    { id: '1', name: 'Dozvil2026-05.doc', type: 'uploaded' },
    { id: '2', name: 'Dozvil_Electro2026-05.doc', type: 'uploaded' }
  ]);

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
        <Text strong className="block text-lg mb-4">
          Копії повірки (випробувань) засобів колективного та індивідуального захисту 
          (страхувальні засоби від падіння з висоти, електроізоляційні засоби, тощо)
        </Text>

        <div className="space-y-4">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
              <FileTextOutlined className="text-blue-500 text-lg" />
              <Text className="flex-1 font-medium">{document.name}</Text>
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                className="text-gray-400 hover:text-red-500"
                onClick={() => removeDocument(document.id)}
              />
            </div>
          ))}

          <Upload
            showUploadList={false}
            onChange={handleFileUpload}
            className="w-full"
          >
            <Button 
              icon={<UploadOutlined />} 
              className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-green-500 text-gray-600"
            >
              Додати файл
            </Button>
          </Upload>
        </div>
      </div>

      <Divider />

      <div className="text-center">
        <Button 
          type="primary" 
          size="large"
          className="bg-green-600 hover:bg-green-700 border-green-600 px-8"
          onClick={onSubmit}
        >
          Надіслати дані
        </Button>
      </div>
    </div>
  );
}