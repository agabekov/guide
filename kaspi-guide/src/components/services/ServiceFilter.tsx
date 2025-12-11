import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface ServiceFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'name' | 'faqCount';
  onSortChange: (sort: 'name' | 'faqCount') => void;
}

const ServiceFilter: React.FC<ServiceFilterProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-grow relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-kaspi-gray pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск услуги..."
            className="input pl-12"
          />
        </div>

        {/* Sort Dropdown */}
        <div className="relative md:w-64">
          <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-kaspi-gray pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'name' | 'faqCount')}
            className="input pl-12 appearance-none cursor-pointer"
          >
            <option value="faqCount">По популярности</option>
            <option value="name">По названию</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              className="w-4 h-4 text-kaspi-gray"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceFilter;
