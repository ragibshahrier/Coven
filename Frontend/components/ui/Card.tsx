import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, hoverEffect = false }) => {
  return (
    <motion.div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-6 ${className} ${onClick ? 'cursor-pointer' : ''}`}
      whileHover={hoverEffect ? { y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)", borderColor: "#334155" } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode }> = ({ title, subtitle, action }) => (
  <div className="flex justify-between items-start mb-4">
    <div>
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
