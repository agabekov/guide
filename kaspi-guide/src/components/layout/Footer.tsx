import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    services: [
      { name: 'Kaspi Gold', path: '/services/kaspi-gold' },
      { name: 'Кредиты', path: '/services/kredit-nalichnymi' },
      { name: 'Депозиты', path: '/services/kaspi-depozit' },
      { name: 'Магазин', path: '/services/magazin-na-kaspi-kz' },
    ],
    help: [
      { name: 'FAQ', path: '/faq' },
      { name: 'Контакты', path: '/contacts' },
      { name: 'Все услуги', path: '/services' },
    ],
    apps: [
      {
        name: 'App Store',
        url: 'https://apps.apple.com/kz/app/kaspi-kz/id1029275343',
      },
      {
        name: 'Google Play',
        url: 'https://play.google.com/store/apps/details?id=kz.kaspi.mobile',
      },
    ],
  };

  return (
    <footer className="bg-kaspi-dark text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-kaspi-red rounded-lg flex items-center justify-center">
                <span className="text-white font-display font-bold text-xl">K</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl leading-none">
                  Kaspi Guide
                </span>
                <span className="font-body text-xs text-gray-400 leading-none">
                  Информационный портал
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-300">
              Ваш надежный помощник в мире финансовых услуг Kaspi.kz
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-display font-bold text-lg mb-4">Услуги</h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-300 hover:text-kaspi-red transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-display font-bold text-lg mb-4">Помощь</h3>
            <ul className="space-y-2">
              {footerLinks.help.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm text-gray-300 hover:text-kaspi-red transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Apps */}
          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold text-lg mb-4">Контакты</h3>
              <ul className="space-y-3">
                <li className="flex items-center space-x-2 text-sm text-gray-300">
                  <Phone className="w-4 h-4" />
                  <span>1414 (бесплатно)</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-300">
                  <Mail className="w-4 h-4" />
                  <span>support@kaspi.kz</span>
                </li>
                <li className="flex items-center space-x-2 text-sm text-gray-300">
                  <MapPin className="w-4 h-4" />
                  <span>Алматы, Казахстан</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Мобильное приложение</h4>
              <div className="flex flex-col space-y-2">
                {footerLinks.apps.map((app) => (
                  <a
                    key={app.name}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm text-gray-300 hover:text-kaspi-red transition-colors"
                  >
                    <span>{app.name}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-gray-400">
              © {currentYear} Kaspi Guide. Все права защищены.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-kaspi-red transition-colors">
                Политика конфиденциальности
              </a>
              <a href="#" className="hover:text-kaspi-red transition-colors">
                Условия использования
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
