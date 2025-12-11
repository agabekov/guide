import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import FAQItem from '../faq/FAQItem';
import type { FAQItem as FAQItemType } from '../../types';

const FeaturedFAQ: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItemType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загрузить топ FAQ по полезности
    const loadFAQs = async () => {
      try {
        const response = await import('../../data/faq.json');
        // Сортировать по полезности и взять топ-6
        const topFaqs = [...response.default]
          .sort((a, b) => b.usefulness - a.usefulness)
          .slice(0, 6);
        setFaqs(topFaqs);
      } catch (error) {
        console.error('Error loading FAQs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, []);

  if (loading) {
    return (
      <section className="section-container bg-white">
        <div className="text-center">
          <div className="spinner mx-auto" />
        </div>
      </section>
    );
  }

  return (
    <section className="section-container bg-white">
      {/* Section Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-kaspi-red mb-4 uppercase tracking-wider"
        >
          <Sparkles className="w-4 h-4" />
          <span>Самые полезные</span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl font-display font-bold text-kaspi-dark mb-4"
        >
          Часто задаваемые вопросы
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg text-kaspi-gray max-w-2xl mx-auto"
        >
          Ответы на самые популярные вопросы пользователей Kaspi.kz
        </motion.p>
      </div>

      {/* FAQ List */}
      <div className="space-y-4 mb-12">
        {faqs.map((faq, index) => (
          <motion.div
            key={faq.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <FAQItem faq={faq} />
          </motion.div>
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
          to="/faq"
          className="inline-flex items-center space-x-2 text-kaspi-red font-semibold hover:underline group"
        >
          <span className="text-lg">Смотреть все вопросы</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </motion.div>
    </section>
  );
};

export default FeaturedFAQ;
