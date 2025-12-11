import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ServiceCard from '../services/ServiceCard';
import type { Service } from '../../types';

const ServicesOverview: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загрузить данные о сервисах
    const loadServices = async () => {
      try {
        const response = await import('../../data/services.json');
        // Показать только топ-8 самых популярных (по количеству FAQ)
        setServices(response.default.slice(0, 8));
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  if (loading) {
    return (
      <section className="section-container">
        <div className="text-center">
          <div className="spinner mx-auto" />
        </div>
      </section>
    );
  }

  return (
    <section className="section-container">
      {/* Section Header */}
      <div className="text-center mb-12">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-block text-sm font-semibold text-kaspi-red mb-4 uppercase tracking-wider"
        >
          Популярные услуги
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl font-display font-bold text-kaspi-dark mb-4"
        >
          Что вас интересует?
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-kaspi-gray max-w-2xl mx-auto"
        >
          Выберите услугу, чтобы получить ответы на все вопросы
        </motion.p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {services.map((service, index) => (
          <ServiceCard key={service.id} service={service} index={index} />
        ))}
      </div>

      {/* View All Link */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <Link
          to="/services"
          className="inline-flex items-center space-x-2 text-kaspi-red font-semibold hover:underline group"
        >
          <span className="text-lg">Смотреть все услуги</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </section>
  );
};

export default ServicesOverview;
