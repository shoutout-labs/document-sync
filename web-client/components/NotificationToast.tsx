/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect } from 'react';

interface NotificationToastProps {
    message: string;
    type: 'error' | 'success';
    onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-gem-teal';

    return (
        <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-[60] flex items-center animate-bounce-in`}>
            <span className="mr-4">{message}</span>
            <button onClick={onClose} className="text-white/80 hover:text-white font-bold">
                ✕
            </button>
        </div>
    );
};

export default NotificationToast;