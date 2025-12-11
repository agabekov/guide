import React from 'react';
import { Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react';

const ContactInfo: React.FC = () => {
  const contactItems = [
    {
      icon: Phone,
      title: 'Телефон',
      content: '1414',
      description: 'Бесплатно со всех номеров Казахстана',
    },
    {
      icon: Mail,
      title: 'Email',
      content: 'support@kaspi.kz',
      description: 'Мы ответим в течение 24 часов',
    },
    {
      icon: MapPin,
      title: 'Адрес',
      content: 'Алматы, Казахстан',
      description: 'Сеть банкоматов и отделений по всей стране',
    },
    {
      icon: Clock,
      title: 'Время работы',
      content: '24/7',
      description: 'Круглосуточная поддержка',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {contactItems.map((item) => (
          <div key={item.title} className="card p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 rounded-xl bg-kaspi-red/10 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-6 h-6 text-kaspi-red" />
              </div>
              <div className="flex-grow">
                <h3 className="font-display font-bold text-kaspi-dark mb-1">
                  {item.title}
                </h3>
                <p className="text-lg font-semibold text-kaspi-red mb-1">
                  {item.content}
                </p>
                <p className="text-sm text-kaspi-gray">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Social Links */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-kaspi-dark mb-4">
          Мобильное приложение
        </h3>
        <p className="text-kaspi-gray mb-4">
          Установите приложение Kaspi.kz для доступа ко всем сервисам
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="https://apps.apple.com/kz/app/kaspi-kz/id1029275343"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-kaspi-dark text-white rounded-lg hover:bg-opacity-90 transition-all"
          >
            <span className="font-semibold">App Store</span>
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=kz.kaspi.mobile"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-kaspi-dark text-white rounded-lg hover:bg-opacity-90 transition-all"
          >
            <span className="font-semibold">Google Play</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Additional Info */}
      <div className="card p-6 bg-gradient-kaspi text-white">
        <h3 className="font-display font-bold mb-2">Важно знать</h3>
        <ul className="space-y-2 text-sm text-white/90">
          <li>• Kaspi Guide - неофициальный информационный портал</li>
          <li>• Для официальной информации посетите kaspi.kz</li>
          <li>• Мы не храним персональные данные</li>
          <li>• Все данные актуализируются регулярно</li>
        </ul>
      </div>
    </div>
  );
};

export default ContactInfo;
