import { Select, Typography } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

interface CabinetHeaderProps {
  user: any;
}

export default function CabinetHeader({ user }: CabinetHeaderProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
          ЗБ
        </div>
        <div>
          <Title level={3} className="!mb-0 text-gray-700">
            ЗАХІДНИЙ БУГ
          </Title>
        </div>
        <div className="ml-auto">
          <Select defaultValue="UA" className="w-20">
            <Option value="UA">UA</Option>
          </Select>
        </div>
      </div>
      
      <Title level={2} className="!mb-2 text-gray-800">
        Вітаємо в кабінеті підрядника!
      </Title>
      
      <Text className="text-gray-600 text-lg">
        Вас було допущено до внесення інформації з ОП для кваліфікації учасника.
      </Text>
      
      <div className="mt-4">
        <Text className="text-gray-700 font-medium">
          Підрозділ ПП «Західний Буг»
        </Text>
        <div className="mt-2">
          <Select 
            placeholder="Виберіть підрозділ" 
            className="w-64"
            defaultValue={user?.department_name}
          >
            <Option value="production">Виробництво насіння</Option>
            <Option value="melioration">Меліорація</Option>
          </Select>
        </div>
      </div>
    </div>
  );
}