import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, className, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
    <input
      className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all ${className}`}
      {...props}
    />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, options, className, ...props }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-slate-400 mb-1.5">{label}</label>
      <select
        className={`w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all appearance-none ${className}`}
        {...props}
      >
        {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
