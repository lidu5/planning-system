import React, { useState, useRef, useEffect } from 'react';
import { getCurrentEthiopianDate } from '../lib/ethiopian';
import { ChevronDown, Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

type Props = {
  value?: number;
  onChange: (year: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'compact' | 'dropdown';
};

export default function YearFilter({ 
  value, 
  onChange, 
  min = 2000, 
  max = 2100, 
  label = 'Year', 
  className = '',
  showLabel = true,
  variant = 'default'
}: Props) {
  const current = React.useMemo(() => getCurrentEthiopianDate()[0], []);
  const val = value ?? current;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Generate year options
  const yearOptions = Array.from(
    { length: max - min + 1 }, 
    (_, i) => min + i
  ).reverse(); // Show most recent years first

  const set = (y: number) => {
    if (Number.isNaN(y)) return;
    if (y < min) return onChange(min);
    if (y > max) return onChange(max);
    onChange(y);
  };

  const handleIncrement = () => {
    set(val + 1);
  };

  const handleDecrement = () => {
    set(val - 1);
  };

  const handleReset = () => {
    set(current);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    set(Number(e.target.value));
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    set(val + (e.deltaY > 0 ? -1 : 1));
  };

  const handleSelectYear = (year: number) => {
    set(year);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'dropdown') {
    return (
      <div className={className}>
        {showLabel && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>{val}</span>
              <span className="text-sm text-gray-500 font-normal">ዓ.ም</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="absolute z-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              <div className="p-2">
                <div className="flex items-center justify-between p-2">
                  <h4 className="text-sm font-medium text-gray-700">Select Year</h4>
                  <button
                    onClick={handleReset}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Current ({current})
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      onClick={() => handleSelectYear(year)}
                      className={`p-3 rounded-lg text-center transition-colors duration-150 ${
                        year === val
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${
                        year === current
                          ? year === val
                            ? 'ring-2 ring-emerald-400'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ''
                      }`}
                    >
                      <div className="text-lg font-medium">{year}</div>
                      {year === current && (
                        <div className="text-xs opacity-75">Current</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        {showLabel && (
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{val}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <div className="p-2">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleSelectYear(year)}
                    className={`w-full p-2 text-left rounded-md transition-colors duration-150 ${
                      year === val
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{year}</span>
                      {year === current && (
                        <span className="text-xs text-emerald-600">Current</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant with both increment/decrement AND dropdown
  return (
    <div className={className}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={val <= min}
          className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 ${
            val <= min
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-sm'
          }`}
          aria-label="Previous year"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-lg font-semibold">{val}</span>
              <span className="text-sm text-gray-500 font-normal">ዓ.ም</span>
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900">Select Year</h4>
                  <div className="text-xs text-gray-500">
                    {min} – {max}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                    <span className="text-sm text-emerald-800">Current Year:</span>
                    <button
                      onClick={() => handleSelectYear(current)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        val === current
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      {current}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {yearOptions.map((year) => (
                    <button
                      key={year}
                      onClick={() => handleSelectYear(year)}
                      className={`p-3 rounded-lg text-center transition-all duration-150 ${
                        year === val
                          ? 'bg-gradient-to-br from-emerald-600 to-green-600 text-white font-semibold shadow-md transform scale-105'
                          : 'text-gray-700 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <div className="text-base font-medium">{year}</div>
                      {year === current && (
                        <div className="text-xs mt-1 opacity-75">Current</div>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quick Select:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectYear(current - 1)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Last Year
                      </button>
                      <button
                        onClick={() => handleSelectYear(current + 1)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Next Year
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={val >= max}
          className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all duration-200 ${
            val >= max
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-sm'
          }`}
          aria-label="Next year"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        {/* <button
          type="button"
          onClick={handleReset}
          disabled={val === current}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200 ${
            val === current
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-sm'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Current</span>
        </button> */}
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span className={`${val === current ? 'font-medium text-emerald-600' : ''}`}>
          {val === current ? '✓ Current Year Selected' : `Click year to select`}
        </span>
        <span>
          {min} – {max}
        </span>
      </div>
    </div>
  );
}