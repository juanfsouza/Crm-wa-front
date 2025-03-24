import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'rounded-lg transition focus:outline-none';
  const variantStyles =
    variant === 'primary'
      ? 'bg-orange-500 text-white hover:bg-orange-600'
      : 'bg-orange-300 text-gray-800 hover:bg-orange-400';
  const sizeStyles =
    size === 'sm'
      ? 'px-2 py-1 text-sm'
      : size === 'md'
      ? 'px-4 py-2 text-base'
      : 'px-6 py-3 text-lg';

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};