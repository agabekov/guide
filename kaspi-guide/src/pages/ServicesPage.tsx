import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import ServiceCard from '../components/services/ServiceCard';
import ServiceFilter from '../components/services/ServiceFilter';
import type { Service } from '../types';

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'faqCount'>('faqCount');

  useEffect(() => {
    // Загрузить все сервисы
    const loadServices = async () => {
      try {
        const response = await import('../data/services.json');
        setServices(response.default);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  // Фильтрация и сортировка
  const filteredServices = useMemo(() => {
    let filtered = services;

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((service) =>
        service.name.toLowerCase().includes(query)
      );
    }

    // Сортировка
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ru');
      } else {
        return b.faqCount - a.faqCount;
      }
    });

    return filtered;
  }, [services, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen section-container">
        <div className="text-center py-20">
          <div className="spinner mx-auto" />
          <p className="mt-4 text-kaspi-gray">Загрузка услуг...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <section className="bg-gradient-kaspi text-white py-16">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="flex items-center space-x-2 mb-4">
              <Layers className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Каталог услуг
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Все услуги Kaspi.kz
            </h1>
            <p className="text-lg sm:text-xl text-white/90">
              Найдите интересующую вас услугу среди {services.length} категорий
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-container">
        {/* Filter */}
        <ServiceFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-kaspi-gray">
            {filteredServices.length === services.length ? (
              <span>
                Показано <strong className="text-kaspi-dark">{filteredServices.length}</strong> услуг
              </span>
            ) : (
              <span>
                Найдено <strong className="text-kaspi-dark">{filteredServices.length}</strong> из{' '}
                {services.length} услуг
              </span>
            )}
          </p>
        </div>

        {/* Services Grid */}
        {filteredServices.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredServices.map((service, index) => (
              <ServiceCard key={service.id} service={service} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Layers className="w-12 h-12 text-kaspi-gray" />
            </div>
            <h3 className="text-2xl font-display font-bold text-kaspi-dark mb-2">
              Услуги не найдены
            </h3>
            <p className="text-kaspi-gray">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ServicesPage;
