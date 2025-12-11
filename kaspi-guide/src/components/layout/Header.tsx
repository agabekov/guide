import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Главная', path: '/' },
    { name: 'Примеры FAQ', path: '/examples' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-kaspi-red rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white font-display font-bold text-xl">K</span>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-xl text-kaspi-dark leading-none">
                Kaspi
              </span>
              <span className="font-body text-xs text-kaspi-gray leading-none">
                Guide
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-kaspi-red text-white'
                    : 'text-kaspi-dark hover:bg-red-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Empty space for alignment */}
          <div className="hidden md:block w-10" />

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-red-50 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-kaspi-dark" />
            ) : (
              <Menu className="w-6 h-6 text-kaspi-dark" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <nav className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg font-semibold transition-all ${
                    isActive(item.path)
                      ? 'bg-kaspi-red text-white'
                      : 'text-kaspi-dark hover:bg-red-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
