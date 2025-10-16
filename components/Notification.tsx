
import React, { useEffect, useState } from 'react';
import { BellIcon, CloseIcon } from './icons';

interface NotificationProps {
  message: string;
  type: 'reminder' | 'info' | 'error';
  onClose: () => void;
}

const notificationStyles = {
    reminder: { bg: 'bg-blue-500', icon: <BellIcon className="w-6 h-6 text-white"/> },
    info: { bg: 'bg-green-500', icon: 'i' },
    error: { bg: 'bg-red-500', icon: '!' },
};

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
        const timer = setTimeout(() => {
            handleClose();
        }, 10000); // Auto close after 10 seconds

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [message, type]);

    const handleClose = () => {
        setVisible(false);
        // Allow for fade out animation
        setTimeout(onClose, 300);
    };

    const styles = notificationStyles[type];

    return (
        <div className={`fixed top-5 right-5 w-80 p-4 rounded-lg shadow-2xl flex items-start space-x-4 text-white z-50 transition-all duration-300 ${styles.bg} ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
            <div className="flex-shrink-0">
                {styles.icon}
            </div>
            <div className="flex-1">
                <h4 className="font-bold capitalize">{type}</h4>
                <p className="text-sm">{message}</p>
            </div>
            <button onClick={handleClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <CloseIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Notification;
