interface CabinetHeaderProps {
  user: any;
}

export default function CabinetHeader({ user }: CabinetHeaderProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
          ЗБ
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-0">
            ЗАХІДНИЙ БУГ
          </h3>
        </div>
        {/* <div className="ml-auto">
          <select className="px-3 py-1 border border-gray-300 rounded-md text-sm bg-white">
            <option value="UA">UA</option>
          </select>
        </div> */}
      </div>
      
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Вітаємо в кабінеті підрядника!
      </h2>
      
      <p className="text-gray-600 text-lg mb-4">
        Вас було допущено до внесення інформації з ОП для кваліфікації учасника.
      </p>
      
      <div className="mt-4">
        <p className="text-gray-700 font-medium mb-2">

          Підрозділ ПП «Західний Буг»: {user?.department_name || 'Не вказано'}
        </p>
        
      </div>
    </div>
  );
}