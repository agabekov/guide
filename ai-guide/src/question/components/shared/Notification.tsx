import { useEffect } from 'react';

interface NotificationProps {
  message: string;
  show: boolean;
  onHide: () => void;
  type?: 'success' | 'error' | 'info';
}

export const Notification: React.FC<NotificationProps> = ({ message, show, onHide, type = 'success' }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return '✓';
    }
  };

  return (
    <div className={`notification ${show ? 'show' : ''} notification-${type}`}>
      <span className="notification-icon">{getIcon()}</span>
      <span className="notification-message">{message}</span>
    </div>
  );
};
