import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import React from 'react';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100 }
  }
};

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

export default function Custom404() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center p-4">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      {/* Glowing orbs */}
      <MotionDiv
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 15, repeat: Infinity }}
        className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[150px]"
      />
      <MotionDiv
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 12, repeat: Infinity }}
        className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[150px]"
      />

      {/* Main Content */}
      <MotionDiv
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 text-center max-w-2xl mx-auto"
      >
        {/* 404 Icon/Text */}
        <MotionDiv variants={itemVariants} className="mb-8">
          <div className="relative inline-block">
            <MotionDiv
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              className="text-9xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 opacity-20"
            >
              404
            </MotionDiv>
            <div className="absolute inset-0 flex items-center justify-center">
              <FileQuestion className="w-24 h-24 text-purple-400" />
            </div>
          </div>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-300 mb-8 max-w-md mx-auto">
            Oops! The page you're looking for seems to have wandered off into the academic void.
          </p>
        </MotionDiv>

        {/* Buttons */}
        <MotionDiv 
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <MotionButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.back()}
            className="flex items-center px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Go Back
          </MotionButton>

          <MotionButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all w-full sm:w-auto justify-center"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </MotionButton>
        </MotionDiv>
      </MotionDiv>
    </div>
  );
}
