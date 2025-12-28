import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <MotionDiv
        className={`${sizeClasses[size]} border-4 border-primary border-t-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
};

export const LoadingDots = () => {
  return (
    <div className="flex space-x-2">
      {[0, 1, 2].map((index) => (
        <MotionDiv
          key={index}
          className="w-3 h-3 bg-primary rounded-full"
          animate={{
            y: ['0%', '-50%', '0%'],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.2,
          }}
        />
      ))}
    </div>
  );
};

export const LoadingPulse = () => {
  return (
    <MotionDiv
      className="w-16 h-16 bg-primary rounded-full"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.5, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

export const SkeletonLoader = ({ className = '' }: { className?: string }) => {
  return (
    <MotionDiv
      className={`bg-muted rounded ${className}`}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};
