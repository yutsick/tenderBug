import { useState } from 'react';
import { Button, Card, Input, Upload, Typography, Divider } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Instrument {
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

interface InstrumentsTabProps {
  onSubmit: () => void;
}

export default function InstrumentsTab({ onSubmit }: InstrumentsTabProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([
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

  const addInstrument = () => {
    const newInstrument: Instrument = {
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
    setInstruments([...instruments, newInstrument]);
  };

  const removeInstrument = (id: string) => {
    setInstruments(instruments.filter(inst => inst.id !== id));
  };

  const toggleInstrument = (id: string) => {
    setInstruments(instruments.map(inst => 
      inst.id === id ? { ...inst, expanded: !inst.expanded } : inst
    ));
  };

  const updateInstrument = (id: string, field: keyof Instrument, value: any) => {
    setInstruments(instruments.map(inst => 
      inst.id === id ? { ...inst, [field]: value } : inst
    ));
  };

  return (
    <div className="space-y-4">
      {instruments.map((instrument) => (
        <Card key={instrument.id} className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                type="text"
                icon={instrument.expanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => toggleInstrument(instrument.id)}
                className="text-gray-600"
              />
              <div>
                <Text strong className="block text-lg">Тип інструменту</Text>
                <Text className="text-gray-600">{instrument.type}</Text>
              </div>
            </div>
            
            {instruments.length > 1 && (
              <Button
                type="text"
                icon={<DeleteOutlined />}
                className="text-gray-400 hover:text-red-500"
                onClick={() => removeInstrument(instrument.id)}
              />
            )}
          </div>

          {instrument.expanded && (
            <div className="space-y-6">
              <div>
                <Text strong className="block mb-2">
                  Тип інструменту
                </Text>
                <Input
                  value={instrument.type}
                  onChange={(e) => updateInstrument(instrument.id, 'type', e.target.value)}
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
          onClick={addInstrument}
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