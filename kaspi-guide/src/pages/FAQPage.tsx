import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, HelpCircle } from 'lucide-react';
import FAQItem from '../components/faq/FAQItem';
import { useSearch } from '../hooks/useSearch';
import type { FAQItem as FAQItemType } from '../types';

const FAQPage: React.FC = () => {
  const [allFaqs, setAllFaqs] = useState<FAQItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'usefulness' | 'recent'>('usefulness');

  useEffect(() => {
    // Загрузить все FAQ
    const loadFAQs = async () => {
      try {
        const response = await import('../data/faq.json');
        setAllFaqs(response.default);
      } catch (error) {
        console.error('Error loading FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, []);

  // Получить уникальные категории
  const categories = useMemo(() => {
    const cats = new Set(allFaqs.map((faq) => faq.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [allFaqs]);

  // Применить фильтр по категории
  const categoryFiltered = useMemo(() => {
    if (selectedCategory === 'all') {
      return allFaqs;
    }
    return allFaqs.filter((faq) => faq.category === selectedCategory);
  }, [allFaqs, selectedCategory]);

  // Применить поиск
  const searchResults = useSearch(categoryFiltered, searchQuery);

  // Применить сортировку
  const sortedResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      if (sortBy === 'usefulness') {
        return b.usefulness - a.usefulness;
      } else {
        // Сортировать по дате обновления
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      }
    });
  }, [searchResults, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen section-container">
        <div className="text-center py-20">
          <div className="spinner mx-auto" />
          <p className="mt-4 text-kaspi-gray">Загрузка вопросов...</p>
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
            className="max-w-3xl mx-auto text-center"
          >
            <div className="flex items-center justify-center space-x-2 mb-4">
              <HelpCircle className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                База знаний
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Часто задаваемые вопросы
            </h1>
            <p className="text-lg sm:text-xl text-white/90">
              Найдите ответы на {allFaqs.length.toLocaleString('ru-RU')} вопросов о сервисах Kaspi.kz
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-container">
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-kaspi-gray pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по вопросам и ответам..."
                className="input pl-12 text-lg"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Category Filter */}
              <div className="flex-grow">
                <label className="block text-sm font-semibold text-kaspi-dark mb-2">
                  Категория
                </label>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-kaspi-gray pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input pl-11"
                  >
                    <option value="all">Все категории</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sort */}
              <div className="sm:w-64">
                <label className="block text-sm font-semibold text-kaspi-dark mb-2">
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'usefulness' | 'recent')}
                  className="input"
                >
                  <option value="usefulness">По полезности</option>
                  <option value="recent">По дате</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="text-sm text-kaspi-gray pt-2 border-t border-gray-100">
              {sortedResults.length === allFaqs.length ? (
                <span>
                  Показано <strong className="text-kaspi-dark">{sortedResults.length.toLocaleString('ru-RU')}</strong> вопросов
                </span>
              ) : (
                <span>
                  Найдено <strong className="text-kaspi-dark">{sortedResults.length.toLocaleString('ru-RU')}</strong> из{' '}
                  {allFaqs.length.toLocaleString('ru-RU')} вопросов
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FAQ List */}
        {sortedResults.length > 0 ? (
          <div className="space-y-4">
            {sortedResults.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <FAQItem faq={faq} />
              </motion.div>
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
            <p className="text-kaspi-gray mb-6">
              Попробуйте изменить параметры поиска или выбрать другую категорию
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="btn-secondary"
            >
              Сбросить фильтры
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default FAQPage;
