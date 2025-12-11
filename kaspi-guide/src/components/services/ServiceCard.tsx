import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import type { Service } from '../../types';
import { SERVICE_DESCRIPTIONS, SERVICE_ICONS } from '../../types';

interface ServiceCardProps {
  service: Service;
  index?: number;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, index = 0 }) => {
  // Получить иконку для сервиса
  const iconName = SERVICE_ICONS[service.name] || 'HelpCircle';
  const Icon = (Icons as any)[iconName] || Icons.HelpCircle;

  // Получить описание для сервиса
  const description = SERVICE_DESCRIPTIONS[service.name] || service.description || 'Узнайте больше об этой услуге';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -8 }}
    >
      <Link
        to={`/services/${service.slug}`}
        className="card card-hover p-6 h-full flex flex-col group"
      >
        {/* Icon */}
        <div className="mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-kaspi flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow">
          <h3 className="text-xl font-display font-bold text-kaspi-dark mb-2 group-hover:text-kaspi-red transition-colors">
            {service.name}
          </h3>
          <p className="text-sm text-kaspi-gray mb-4 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-kaspi-red font-semibold text-sm group-hover:translate-x-1 transition-transform">
            <span>Подробнее</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ServiceCard;
