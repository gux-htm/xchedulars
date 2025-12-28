
import { motion } from 'framer-motion';
import React, { ReactNode } from 'react';
import { buttonHover, buttonTap } from '@/lib/animations';
import { useSounds } from '@/hooks/useSounds';

const MotionButton = motion.button as any;

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const AnimatedButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: AnimatedButtonProps) => {
  const { sounds } = useSounds();
  const baseClasses = 'rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      sounds.click();
      onClick?.();
    }
  };

  return (
    <MotionButton
      type={type}
      onClick={handleClick}
      disabled={disabled}
      whileHover={!disabled ? buttonHover : {}}
      whileTap={!disabled ? buttonTap : {}}
      onHoverStart={() => !disabled && sounds.hover()}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
    >
      {children}
    </MotionButton>
  );
};

export const AnimatedIconButton = ({
  children,
  onClick,
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) => {
  const { sounds } = useSounds();

  const handleClick = () => {
    if (!disabled) {
      sounds.click();
      onClick?.();
    }
  };

  return (
    <MotionButton
      onClick={handleClick}
      disabled={disabled}
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      onHoverStart={() => !disabled && sounds.hover()}
      className={`p-2 rounded-full hover:bg-accent transition-colors ${className}`}
    >
      {children}
    </MotionButton>
  );
};
