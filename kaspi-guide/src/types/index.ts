// FAQ Item представляет отдельный вопрос-ответ
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string;
  created: string;
  updated: string;
  usefulness: number; // процент полезности
  path: string; // путь к MD файлу
}

// Service Category представляет категорию услуг Kaspi
export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  subcategories: string[];
  faqCount: number;
  faqs?: FAQItem[];
}

// Subcategory для группировки FAQ внутри услуги
export interface Subcategory {
  name: string;
  slug: string;
  faqCount: number;
  faqs: FAQItem[];
}

// Search Result для результатов поиска
export interface SearchResult {
  item: FAQItem;
  score?: number;
  matches?: Array<{
    key: string;
    value: string;
    indices: number[][];
  }>;
}

// Статистика для главной страницы
export interface Statistics {
  totalServices: number;
  totalFAQs: number;
  averageUsefulness: number;
  totalCategories: number;
}

// Metadata для SEO
export interface PageMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
}

// Contact Form Data
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Иконки для категорий услуг (используем Lucide icons)
export type ServiceIconName =
  | 'CreditCard'
  | 'Wallet'
  | 'Banknote'
  | 'PiggyBank'
  | 'ShoppingCart'
  | 'Store'
  | 'MapPin'
  | 'Smartphone'
  | 'FileText'
  | 'MessageSquare'
  | 'Send'
  | 'Gift'
  | 'Building'
  | 'Car'
  | 'Plane'
  | 'Briefcase'
  | 'Users'
  | 'Settings'
  | 'HelpCircle'
  | 'Home';

// Service Category Mapping для иконок
export const SERVICE_ICONS: Record<string, ServiceIconName> = {
  'Kaspi Gold': 'CreditCard',
  'Kaspi Gold для ребенка': 'CreditCard',
  'Kaspi Red': 'CreditCard',
  'Kaspi QR': 'Smartphone',
  'Kaspi Alaqan': 'Wallet',
  'Kaspi Бонус': 'Gift',
  'Kaspi Жұма': 'Store',
  'Кредит Наличными': 'Banknote',
  'Кредит на Покупки': 'ShoppingCart',
  'Кредит для ИП': 'Briefcase',
  'Рассрочка': 'Wallet',
  'Kaspi Депозит': 'PiggyBank',
  'Накопительный Kaspi Депозит': 'PiggyBank',
  'Автокредит на Новое Авто': 'Car',
  'Автокредит на Kolesa.kz': 'Car',
  'Магазин на Kaspi.kz': 'Store',
  'Объявления на Kaspi.kz': 'FileText',
  'Kaspi Travel': 'Plane',
  'Kaspi Работа': 'Users',
  'Kaspi Банкоматы': 'Building',
  'Kaspi Терминалы': 'Building',
  'Kaspi Картоматы': 'Building',
  'Kaspi Maps': 'MapPin',
  'Мобильное приложение': 'Smartphone',
  'Мой Банк на Kaspi.kz': 'Home',
  'Госуслуги': 'FileText',
  'Платежи на Kaspi.kz': 'Send',
  'Переводы': 'Send',
  'Сообщения': 'MessageSquare',
  'Сертификаты': 'Gift',
  'Социальный Счет': 'Wallet',
};

// Descriptions для категорий услуг
export const SERVICE_DESCRIPTIONS: Record<string, string> = {
  'Kaspi Gold': 'Бесплатная карта с кэшбэком и бонусами',
  'Kaspi Gold для ребенка': 'Карта для детей с родительским контролем',
  'Kaspi Red': 'Карта рассрочки для покупок в магазинах',
  'Kaspi QR': 'Быстрые платежи по QR-коду',
  'Kaspi Alaqan': 'Дополнительные финансовые возможности',
  'Kaspi Бонус': 'Программа лояльности и кэшбэка',
  'Kaspi Жұма': 'Специальные пятничные предложения',
  'Кредит Наличными': 'Быстрый кредит на любые цели',
  'Кредит на Покупки': 'Кредит для покупок в магазинах',
  'Кредит для ИП': 'Кредиты для индивидуальных предпринимателей',
  'Рассрочка': 'Беспроцентная рассрочка на покупки',
  'Kaspi Депозит': 'Выгодные вклады с высокой ставкой',
  'Накопительный Kaspi Депозит': 'Накопительные счета для сбережений',
  'Автокредит на Новое Авто': 'Кредит на покупку нового автомобиля',
  'Автокредит на Kolesa.kz': 'Кредит через маркетплейс Kolesa',
  'Магазин на Kaspi.kz': 'Маркетплейс для покупок онлайн',
  'Объявления на Kaspi.kz': 'Доска объявлений для продажи товаров',
  'Kaspi Travel': 'Бронирование путевок и билетов',
  'Kaspi Работа': 'Поиск работы и вакансий',
  'Kaspi Банкоматы': 'Снятие наличных и пополнение карт',
  'Kaspi Терминалы': 'Платежи через терминалы',
  'Kaspi Картоматы': 'Получение и активация карт',
  'Kaspi Maps': 'Карты отделений и банкоматов',
  'Мобильное приложение': 'Kaspi.kz в вашем смартфоне',
  'Мой Банк на Kaspi.kz': 'Личный кабинет для управления счетами',
  'Госуслуги': 'Государственные услуги через Kaspi',
  'Платежи на Kaspi.kz': 'Оплата услуг и счетов',
  'Переводы': 'Переводы денег внутри страны и за рубеж',
  'Сообщения': 'Уведомления и чат с поддержкой',
  'Сертификаты': 'Подарочные сертификаты Kaspi',
  'Социальный Счет': 'Счет для социальных выплат',
};
