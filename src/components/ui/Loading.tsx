import React from 'react';

interface LoadingProps {
  type?: 'spinner';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  className = '',
}) => {
  const sizeStyles =
    size === 'sm'
      ? 'w-4 h-4'
      : size === 'md'
      ? 'w-6 h-6'
      : 'w-8 h-8';

  return (
    <div className={`inline-block ${sizeStyles} ${className}`}>
      <svg
        className="animate-spin text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
};