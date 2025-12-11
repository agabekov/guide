import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import ContactForm from '../components/contact/ContactForm';
import ContactInfo from '../components/contact/ContactInfo';

const ContactPage: React.FC = () => {
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
              <MessageSquare className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Свяжитесь с нами
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
              Контакты
            </h1>
            <p className="text-lg sm:text-xl text-white/90">
              Остались вопросы? Мы всегда рады помочь!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Form - Takes 2 columns */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-display font-bold text-kaspi-dark mb-6">
                Отправить сообщение
              </h2>
              <ContactForm />
            </motion.div>
          </div>

          {/* Contact Info - Takes 1 column */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-display font-bold text-kaspi-dark mb-6">
                Контактная информация
              </h2>
              <ContactInfo />
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
