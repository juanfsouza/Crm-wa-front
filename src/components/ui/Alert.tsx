import React from 'react';

interface AlertProps {
  type: 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, children, className = '' }) => {
  const typeStyles =
    type === 'error'
      ? 'bg-red-100 border-red-500 text-red-700'
      : 'bg-blue-100 border-blue-500 text-blue-700';

  return (
    <div
      className={`border-l-4 p-4 rounded-lg ${typeStyles} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
};