import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface SuccessMessageProps {
  onClose: () => void;
}

export default function SuccessMessage({ onClose }: SuccessMessageProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Повернутись назад</span>
          </button>
        </div>

        {/* Company Logo */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
            ЗБ
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-0">
              ЗАХІДНИЙ БУГ
            </h3>
          </div>
        </div>

        {/* Success Message */}
        <div className="text-center py-16">
          <h1 className="text-6xl font-bold text-green-600 mb-8">
            Дякуємо!
          </h1>

          <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-xl text-gray-700 leading-relaxed">
              Ваші дані було успішно прийнято. Відділ ОП 
              здійснить кваліфікацію на відповідність 
              вимогам та зв'яжеться з вами для 
              повідомлення результатів.
            </p>

            <p className="text-lg font-semibold text-gray-800">
              Обробка анкети триває до 5 робочих днів.
            </p>
          </div>

          <div className="mt-12">
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors font-medium text-lg"
            >
              На головну
            </button>
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