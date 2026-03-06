import { ChevronDown } from 'lucide-react';

interface QuarterFilterProps {
  value: number | null;
  onChange: (value: number | null) => void;
  variant?: 'dropdown' | 'buttons' | 'compact';
  showLabel?: boolean;
  className?: string;
}

const quarterOptions = [
  { value: null, label: 'Full Year', description: 'All 4 quarters' },
  { value: 3, label: '3 Months', description: 'Q1 only' },
  { value: 6, label: '6 Months', description: 'Q1 + Q2 average' },
  { value: 9, label: '9 Months', description: 'Q1 + Q2 + Q3 average' },
];

export default function QuarterFilter({ 
  value, 
  onChange, 
  variant = 'dropdown', 
  showLabel = true,
  className = ''
}: QuarterFilterProps) {
  const selectedOption = quarterOptions.find(option => option.value === value);

  if (variant === 'buttons') {
    return (
      <div className={showLabel ? 'space-y-2' : ''}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700">
            Quarter Period
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          {quarterOptions.map((option) => (
            <button
              key={option.value || 'full'}
              onClick={() => onChange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                value === option.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={className || (showLabel ? 'space-y-1' : '')}>
        {showLabel && (
          <label className="block text-xs font-medium text-gray-700">
            Quarter Period
          </label>
        )}
        <div className="relative">
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white text-sm text-gray-900"
          >
            {quarterOptions.map((option) => (
              <option key={option.value || 'full'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className || (showLabel ? 'space-y-2' : '')}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700">
          Quarter Period
        </label>
      )}
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none bg-white text-gray-900"
        >
          {quarterOptions.map((option) => (
            <option key={option.value || 'full'} value={option.value || ''}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>
      {selectedOption && (
        <p className="text-xs text-gray-500 mt-1">{selectedOption.description}</p>
      )}
    </div>
  );
}
