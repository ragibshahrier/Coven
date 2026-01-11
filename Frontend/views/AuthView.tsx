import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/Input';

interface AuthViewProps {
  onLogin: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
        setLoading(false);
        onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
       {/* Background Ambience */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]"></div>
       </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-6 md:mb-10">
            <div className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl mb-3 md:mb-4 shadow-lg shadow-emerald-900/50">
                <img src="/brand.png" alt="Coven" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">Welcome to Coven</h1>
            <p className="text-slate-400 text-sm md:text-base">Intelligent Covenant Management Platform</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 md:p-8 shadow-2xl">
            <form onSubmit={handleSubmit}>
                {!isLogin && (
                    <Input label="Full Name" placeholder="John Doe" type="text" required />
                )}
                <Input label="Email Address" placeholder="name@company.com" type="email" required />
                <Input label="Password" placeholder="••••••••" type="password" required />
                
                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 md:py-3 rounded-lg mt-4 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <>
                            {isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-800 text-center">
                <p className="text-xs md:text-sm text-slate-400">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="ml-2 text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </p>
            </div>
        </div>
        
        <div className="mt-6 md:mt-8 text-center text-xs text-slate-600">
            &copy; 2024 Coven Financial Technologies. All rights reserved.
        </div>
      </motion.div>
    </div>
  );
};

export default AuthView;
