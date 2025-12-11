import React, { useState } from 'react';
import { ChevronDown, Calendar, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FAQItem as FAQItemType } from '../../types';

interface FAQItemProps {
  faq: FAQItemType;
  defaultOpen?: boolean;
}

const FAQItem: React.FC<FAQItemProps> = ({ faq, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      {/* Question Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start justify-between gap-4 text-left group"
      >
        <div className="flex-grow">
          <h3 className="text-lg font-display font-bold text-kaspi-dark group-hover:text-kaspi-red transition-colors mb-2">
            {faq.question}
          </h3>
          <div className="flex items-center gap-4 text-xs text-kaspi-gray">
            {faq.category && (
              <span className="px-2 py-1 bg-red-50 text-kaspi-red rounded-md font-medium">
                {faq.category}
              </span>
            )}
            {faq.usefulness > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {faq.usefulness}% полезности
              </span>
            )}
            {faq.updated && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Обновлено: {faq.updated}
              </span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-6 h-6 text-kaspi-gray group-hover:text-kaspi-red transition-colors" />
        </motion.div>
      </button>

      {/* Answer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-gray-100">
              <div
                className="prose prose-sm max-w-none text-kaspi-gray"
                dangerouslySetInnerHTML={{
                  __html: faq.answer.replace(/\n/g, '<br />'),
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FAQItem;
