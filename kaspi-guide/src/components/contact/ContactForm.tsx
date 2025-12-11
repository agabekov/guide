import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';

const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // В реальном приложении здесь была бы отправка данных
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="card p-8">
      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="w-20 h-20 bg-kaspi-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-10 h-10 text-kaspi-success" />
          </div>
          <h3 className="text-2xl font-display font-bold text-kaspi-dark mb-2">
            Спасибо за обращение!
          </h3>
          <p className="text-kaspi-gray">
            Мы получили ваше сообщение и свяжемся с вами в ближайшее время.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-kaspi-dark mb-2"
              >
                Ваше имя *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input"
                placeholder="Иван Иванов"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-kaspi-dark mb-2"
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="input"
                placeholder="example@mail.com"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-semibold text-kaspi-dark mb-2"
            >
              Тема обращения *
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="input"
            >
              <option value="">Выберите тему</option>
              <option value="question">Вопрос</option>
              <option value="suggestion">Предложение</option>
              <option value="complaint">Жалоба</option>
              <option value="other">Другое</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-kaspi-dark mb-2"
            >
              Сообщение *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              className="input resize-none"
              placeholder="Опишите ваш вопрос или предложение..."
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn-primary w-full">
            <Send className="w-5 h-5 inline-block mr-2" />
            Отправить сообщение
          </button>
        </form>
      )}
    </div>
  );
};

export default ContactForm;
