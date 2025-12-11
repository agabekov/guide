import { useEffect } from 'react';

interface NotificationProps {
  message: string;
  show: boolean;
  onHide: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, show, onHide }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onHide();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onHide]);

  return (
    <div className={`notification ${show ? 'show' : ''}`}>
      {message}
    </div>
  );
};
