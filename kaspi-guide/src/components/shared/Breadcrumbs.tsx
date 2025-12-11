import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center space-x-2 text-sm">
      <Link
        to="/"
        className="flex items-center text-kaspi-gray hover:text-kaspi-red transition-colors"
      >
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-kaspi-gray" />
          {item.path ? (
            <Link
              to={item.path}
              className="text-kaspi-gray hover:text-kaspi-red transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-kaspi-dark font-semibold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
