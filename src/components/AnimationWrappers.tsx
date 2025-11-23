import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export const FadeIn = ({ 
  children, 
  delay = 0, 
  duration = 0.4,
  className = "" 
}: FadeInProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration, 
        delay,
        ease: [0.22, 1, 0.36, 1] as const
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerChildrenProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerChildren = ({ 
  children, 
  staggerDelay = 0.1,
  className = "" 
}: StaggerChildrenProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, className = "" }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1] as const
          }
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
