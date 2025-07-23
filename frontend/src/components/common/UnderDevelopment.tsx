import { Result } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

interface UnderDevelopmentProps {
  title?: string;
  description?: string;
}

export default function UnderDevelopment({ 
  title = "В розробці", 
  description = "Цей розділ знаходиться в стадії розробки та буде доступний найближчим часом." 
}: UnderDevelopmentProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <Result
          icon={<ToolOutlined className="text-6xl text-gray-400" />}
          title={
            <span className="text-2xl font-semibold text-gray-700">
              {title}
            </span>
          }
          subTitle={
            <span className="text-gray-500 text-lg">
              {description}
            </span>
          }
          className="bg-white rounded-lg shadow-sm p-8"
        />
      </div>
    </div>
  );
}