import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useSounds } from '@/hooks/useSounds';

const MotionDiv = motion.div as any;
const MotionPath = motion.path as any;
const MotionCircle = motion.circle as any;
const MotionG = motion.g as any;
const MotionEllipse = motion.ellipse as any;

interface AnimatedGhostProps {
  focusState: 'idle' | 'email' | 'password';
  loginState?: 'success' | 'error' | null;
}

export const AnimatedGhost = ({ focusState, loginState = null }: AnimatedGhostProps) => {
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const ghostRef = useRef<HTMLDivElement>(null);
  const { sounds } = useSounds();
  const prevLoginState = useRef(loginState);

  // Play sounds when login state changes
  useEffect(() => {
    if (prevLoginState.current !== loginState) {
      if (loginState === 'success') {
        sounds.celebrate();
      } else if (loginState === 'error') {
        sounds.error();
      }
      prevLoginState.current = loginState;
    }
  }, [loginState, sounds]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ghostRef.current || focusState === 'password') return;

      const ghostRect = ghostRef.current.getBoundingClientRect();
      const ghostCenterX = ghostRect.left + ghostRect.width / 2;
      const ghostCenterY = ghostRect.top + ghostRect.height / 2;

      // Calculate angle between ghost and cursor
      const deltaX = e.clientX - ghostCenterX;
      const deltaY = e.clientY - ghostCenterY;
      
      // Calculate distance
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Limit eye movement (max 3 pixels in each direction)
      const maxMove = 3;
      const moveX = Math.max(-maxMove, Math.min(maxMove, (deltaX / distance) * maxMove));
      const moveY = Math.max(-maxMove, Math.min(maxMove, (deltaY / distance) * maxMove));

      setEyePosition({ x: moveX, y: moveY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [focusState]);
  // Idle floating animation
  const floatingAnimation = {
    y: [0, -15, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  };

  // Ghost body animation based on focus state and login state
  const getBodyAnimation = () => {
    // Success animation - nodding yes
    if (loginState === 'success') {
      return {
        y: [0, -10, 0, -10, 0],
        rotate: 0,
        scale: 1.1,
        transition: {
          duration: 1,
          times: [0, 0.25, 0.5, 0.75, 1],
        },
      };
    }
    
    // Error animation - shaking head no
    if (loginState === 'error') {
      return {
        x: [0, -10, 10, -10, 10, 0],
        rotate: [0, -5, 5, -5, 5, 0],
        transition: {
          duration: 0.6,
          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        },
      };
    }

    switch (focusState) {
      case 'email':
        return {
          y: 10,
          rotate: 5,
          transition: { duration: 0.3 },
        };
      case 'password':
        return {
          y: -5,
          scale: 0.95,
          transition: { duration: 0.2 },
        };
      default:
        return floatingAnimation;
    }
  };

  // Eyes animation
  const getEyesAnimation = () => {
    // Success - happy eyes (curved up)
    if (loginState === 'success') {
      return {
        scaleY: 0.5,
        y: 3,
        opacity: 1,
      };
    }
    
    // Error - sad/worried eyes
    if (loginState === 'error') {
      return {
        scaleY: 1.3,
        y: -2,
        opacity: 1,
      };
    }

    switch (focusState) {
      case 'email':
        return {
          scaleY: 1.2,
          y: 2,
        };
      case 'password':
        return {
          scaleY: 0.1,
          opacity: 0.3,
        };
      default:
        return {
          scaleY: 1,
          y: 0,
          opacity: 1,
        };
    }
  };

  // Hands animation
  const getHandsAnimation = () => {
    switch (focusState) {
      case 'password':
        return {
          y: -25,
          x: 0,
          opacity: 1,
          transition: { duration: 0.2 },
        };
      default:
        return {
          y: 10,
          x: 0,
          opacity: 0.7,
          transition: { duration: 0.3 },
        };
    }
  };

  return (
    <div ref={ghostRef} className="relative w-32 h-32 mx-auto mb-8">
      {/* Ghost Body */}
      <MotionDiv
        animate={getBodyAnimation()}
        className="relative"
      >
        {/* Main body */}
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full drop-shadow-lg"
        >
          {/* Ghost body */}
          <MotionPath
            d="M 50 20 
               C 30 20, 20 30, 20 50
               L 20 100
               L 28 95
               L 36 100
               L 44 95
               L 52 100
               L 60 95
               L 68 100
               L 76 95
               L 84 100
               L 84 50
               C 84 30, 70 20, 50 20 Z"
            fill="currentColor"
            className="text-primary opacity-90"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          />
          
          {/* Blush marks */}
          <MotionCircle
            cx="30"
            cy="55"
            r="5"
            fill="#ff9999"
            opacity="0.6"
            animate={{
              scale: focusState === 'email' ? 1.2 : 1,
            }}
          />
          <MotionCircle
            cx="70"
            cy="55"
            r="5"
            fill="#ff9999"
            opacity="0.6"
            animate={{
              scale: focusState === 'email' ? 1.2 : 1,
            }}
          />

          {/* Eyes - Follow cursor */}
          <MotionG animate={getEyesAnimation()}>
            {/* Left eye */}
            <g>
              {/* Eye white background */}
              <ellipse
                cx="38"
                cy="50"
                rx="5"
                ry="9"
                fill="#ffffff"
                className="dark:fill-gray-100"
              />
              {/* Pupil */}
              <MotionEllipse
                cx={38}
                cy={50}
                rx="3"
                ry="6"
                fill="#1a1a1a"
                className="dark:fill-gray-900"
                animate={{
                  cx: focusState === 'password' ? 38 : 38 + eyePosition.x,
                  cy: focusState === 'password' ? 50 : 50 + eyePosition.y,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              {/* Shine/highlight */}
              <ellipse
                cx="37"
                cy="48"
                rx="1.5"
                ry="2"
                fill="#ffffff"
                opacity="0.8"
              />
            </g>
            
            {/* Right eye */}
            <g>
              {/* Eye white background */}
              <ellipse
                cx="62"
                cy="50"
                rx="5"
                ry="9"
                fill="#ffffff"
                className="dark:fill-gray-100"
              />
              {/* Pupil */}
              <MotionEllipse
                cx={62}
                cy={50}
                rx="3"
                ry="6"
                fill="#1a1a1a"
                className="dark:fill-gray-900"
                animate={{
                  cx: focusState === 'password' ? 62 : 62 + eyePosition.x,
                  cy: focusState === 'password' ? 50 : 50 + eyePosition.y,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              {/* Shine/highlight */}
              <ellipse
                cx="61"
                cy="48"
                rx="1.5"
                ry="2"
                fill="#ffffff"
                opacity="0.8"
              />
            </g>
          </MotionG>

          {/* Mouth */}
          <MotionPath
            d="M 40 65 Q 50 70 60 65"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className="text-foreground"
            animate={{
              d: loginState === 'success'
                ? 'M 40 65 Q 50 72 60 65' // Big smile
                : loginState === 'error'
                ? 'M 40 70 Q 50 65 60 70' // Sad frown
                : focusState === 'password' 
                ? 'M 40 68 Q 50 65 60 68' // Surprised O
                : 'M 40 65 Q 50 70 60 65', // Normal smile
            }}
          />
        </svg>

        {/* Hands covering eyes (for password state) */}
        <MotionDiv
          animate={getHandsAnimation()}
          className="absolute top-1/3 left-1/2 transform -translate-x-1/2 flex space-x-4"
        >
          {/* Left hand */}
          <MotionDiv
            animate={{
              rotate: focusState === 'password' ? -15 : 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="currentColor" className="text-primary opacity-90" />
              <circle cx="7" cy="8" r="2" fill="currentColor" className="text-primary" />
              <circle cx="13" cy="8" r="2" fill="currentColor" className="text-primary" />
              <circle cx="10" cy="13" r="2" fill="currentColor" className="text-primary" />
            </svg>
          </MotionDiv>

          {/* Right hand */}
          <MotionDiv
            animate={{
              rotate: focusState === 'password' ? 15 : 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="currentColor" className="text-primary opacity-90" />
              <circle cx="7" cy="8" r="2" fill="currentColor" className="text-primary" />
              <circle cx="13" cy="8" r="2" fill="currentColor" className="text-primary" />
              <circle cx="10" cy="13" r="2" fill="currentColor" className="text-primary" />
            </svg>
          </MotionDiv>
        </MotionDiv>

        {/* Sparkles around ghost */}
        {focusState === 'idle' && (
          <>
            <MotionDiv
              className="absolute top-0 left-0 w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0,
              }}
            />
            <MotionDiv
              className="absolute top-4 right-0 w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.5,
              }}
            />
            <MotionDiv
              className="absolute bottom-4 left-2 w-2 h-2 bg-primary rounded-full"
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 1,
              }}
            />
          </>
        )}
      </MotionDiv>

      {/* Thought bubble when focusing on email */}
      {focusState === 'email' && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute -right-16 top-0 bg-card border border-border rounded-lg p-2 shadow-lg"
        >
          <span className="text-xs">👀</span>
        </MotionDiv>
      )}

      {/* Thought bubble when focusing on password */}
      {focusState === 'password' && !loginState && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute -right-16 top-0 bg-card border border-border rounded-lg p-2 shadow-lg"
        >
          <span className="text-xs">🙈</span>
        </MotionDiv>
      )}

      {/* Success bubble */}
      {loginState === 'success' && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute -right-20 top-0 bg-green-100 dark:bg-green-900 border-2 border-green-500 rounded-lg p-2 shadow-lg"
        >
          <span className="text-sm font-bold text-green-700 dark:text-green-200">✓ Yay!</span>
        </MotionDiv>
      )}

      {/* Error bubble with "uh-uh" */}
      {loginState === 'error' && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: [1, 1.1, 1], 
            y: 0,
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            scale: {
              duration: 0.3,
              repeat: 2,
              repeatType: 'reverse',
            },
          }}
          className="absolute -right-20 top-0 bg-red-100 dark:bg-red-900 border-2 border-red-500 rounded-lg p-2 shadow-lg"
        >
          <span className="text-sm font-bold text-red-700 dark:text-red-200">Uh-uh!</span>
        </MotionDiv>
      )}
    </div>
  );
};
