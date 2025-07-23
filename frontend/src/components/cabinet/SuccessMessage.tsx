import { Button, Typography } from 'antd';
import { LeftOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface SuccessMessageProps {
  onClose: () => void;
}

export default function SuccessMessage({ onClose }: SuccessMessageProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
          >
            Повернутись назад
          </Button>
        </div>

        {/* Company Logo */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
            ЗБ
          </div>
          <div>
            <Title level={3} className="!mb-0 text-gray-700">
              ЗАХІДНИЙ БУГ
            </Title>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center py-16">
          <Title level={1} className="!text-6xl !font-bold !text-green-600 !mb-8">
            Дякуємо!
          </Title>

          <div className="max-w-2xl mx-auto space-y-6">
            <Text className="text-xl text-gray-700 leading-relaxed block">
              Ваші дані було успішно прийнято. Відділ ОП 
              здійснить кваліфікацію на відповідність 
              вимогам та зв'яжеться з вами для 
              повідомлення результатів.
            </Text>

            <Text className="text-lg font-semibold text-gray-800 block">
              Обробка анкети триває до 5 робочих днів.
            </Text>
          </div>

          <div className="mt-12">
            <Button 
              type="primary" 
              size="large"
              className="bg-green-600 hover:bg-green-700 border-green-600 px-8 py-3 h-auto text-lg"
              onClick={onClose}
            >
              На головну
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-16">
          © ПП «Західний Буг»
        </div>
      </div>
    </div>
  );
}