import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { HelpCircle, Search } from 'lucide-react';
import Breadcrumbs from '../components/shared/Breadcrumbs';
import FAQItem from '../components/faq/FAQItem';
import type { Service } from '../types';
import { SERVICE_ICONS, SERVICE_DESCRIPTIONS } from '../types';

const ServiceDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Загрузить данные о сервисе
    const loadService = async () => {
      try {
        const response = await import('../data/services.json');
        const found = response.default.find((s: Service) => s.slug === slug);
        setService(found || null);
      } catch (error) {
        console.error('Error loading service:', error);
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [slug]);

  // Фильтрация FAQ по подкатегории и поиску
  const filteredFAQs = useMemo(() => {
    if (!service?.faqs) return [];

    let filtered = service.faqs;

    // Фильтр по подкатегории
    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter(
        (faq) => faq.subcategory === selectedSubcategory
      );
    }

    // Поиск
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [service, selectedSubcategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen section-container">
        <div className="text-center py-20">
          <div className="spinner mx-auto" />
          <p className="mt-4 text-kaspi-gray">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen section-container">
        <div className="text-center py-20">
          <h1 className="text-4xl font-display font-bold text-kaspi-dark mb-4">
            Услуга не найдена
          </h1>
          <p className="text-kaspi-gray mb-8">
            К сожалению, запрошенная услуга не найдена
          </p>
          <Link to="/services" className="btn-primary">
            Вернуться к услугам
          </Link>
        </div>
      </div>
    );
  }

  // Получить иконку для сервиса
  const iconName = SERVICE_ICONS[service.name] || 'HelpCircle';
  const Icon = (Icons as any)[iconName] || Icons.HelpCircle;
  const description = SERVICE_DESCRIPTIONS[service.name] || service.description;

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <section className="bg-gradient-kaspi text-white py-12">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Breadcrumbs */}
            <div className="mb-6">
              <Breadcrumbs
                items={[
                  { label: 'Услуги', path: '/services' },
                  { label: service.name },
                ]}
              />
            </div>

            {/* Service Info */}
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div className="flex-grow">
                <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
                  {service.name}
                </h1>
                <p className="text-lg sm:text-xl text-white/90 mb-4">
                  {description}
                </p>
                <div className="flex items-center space-x-2 text-sm">
                  <HelpCircle className="w-4 h-4" />
                  <span className="font-mono">{service.faqCount} вопросов</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-container">
        {/* Subcategory Filter & Search */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Subcategories */}
            {service.subcategories && service.subcategories.length > 0 && (
              <div className="flex-shrink-0">
                <label className="block text-sm font-semibold text-kaspi-dark mb-2">
                  Категория
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="input min-w-[200px]"
                >
                  <option value="all">Все категории</option>
                  {service.subcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search */}
            <div className="flex-grow">
              <label className="block text-sm font-semibold text-kaspi-dark mb-2">
                Поиск вопроса
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-kaspi-gray pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Введите ключевые слова..."
                  className="input pl-12"
                />
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-kaspi-gray">
            {filteredFAQs.length === service.faqCount ? (
              <span>
                Показано <strong className="text-kaspi-dark">{filteredFAQs.length}</strong> вопросов
              </span>
            ) : (
              <span>
                Найдено <strong className="text-kaspi-dark">{filteredFAQs.length}</strong> из{' '}
                {service.faqCount} вопросов
              </span>
            )}
          </div>
        </div>

        {/* FAQ List */}
        {filteredFAQs.length > 0 ? (
          <div className="space-y-4">
            {filteredFAQs.map((faq) => (
              <FAQItem key={faq.id} faq={faq} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <HelpCircle className="w-12 h-12 text-kaspi-gray" />
            </div>
            <h3 className="text-2xl font-display font-bold text-kaspi-dark mb-2">
              Вопросы не найдены
            </h3>
            <p className="text-kaspi-gray">
              Попробуйте изменить параметры фильтрации или поиска
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ServiceDetailPage;
