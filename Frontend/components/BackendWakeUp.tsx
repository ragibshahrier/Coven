import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Loader2, CheckCircle2 } from 'lucide-react';

interface BackendWakeUpProps {
  onReady: () => void;
  checkHealth: () => Promise<boolean>;
}

const BackendWakeUp: React.FC<BackendWakeUpProps> = ({ onReady, checkHealth }) => {
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'checking' | 'waking' | 'ready'>('checking');
  const [dots, setDots] = useState('');

  // Animate loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Poll backend health
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const pollHealth = async () => {
      if (!isMounted) return;

      const isHealthy = await checkHealth();
      
      if (!isMounted) return;

      if (isHealthy) {
        setStatus('ready');
        setTimeout(() => {
          if (isMounted) onReady();
        }, 1000);
      } else {
        setStatus('waking');
        setAttempts(prev => prev + 1);
        // Retry every 3 seconds
        timeoutId = setTimeout(pollHealth, 3000);
      }
    };

    pollHealth();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [checkHealth, onReady]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md"
      >
        {/* Logo */}
        <motion.div 
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl mb-6 shadow-lg shadow-emerald-900/50"
          animate={{ 
            boxShadow: status === 'ready' 
              ? '0 0 40px rgba(16, 185, 129, 0.5)' 
              : '0 0 20px rgba(16, 185, 129, 0.3)'
          }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}brand.png`} 
            alt="Coven" 
            className="w-10 h-10 object-contain" 
          />
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Coven</h1>
        <p className="text-slate-400 text-sm mb-8">Intelligent Covenant Management</p>

        {/* Status Card */}
        <motion.div
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl"
          animate={{ 
            borderColor: status === 'ready' ? 'rgb(16, 185, 129)' : 'rgb(51, 65, 85)'
          }}
        >
          {status === 'ready' ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-white font-medium">Backend is ready!</p>
              <p className="text-slate-400 text-sm mt-1">Redirecting...</p>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-8 h-8 text-emerald-500" />
                </motion.div>
                <Cloud className="w-8 h-8 text-slate-500" />
              </div>

              <p className="text-white font-medium mb-2">
                Waking up the backend{dots}
              </p>
              
              <p className="text-slate-400 text-sm mb-4">
                Our backend is hosted on Render's free tier and may take a moment to spin up after being idle.
              </p>

              <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                <p className="text-emerald-400 text-sm font-medium">
                  Please wait while we warm up the servers
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  This usually takes 30-60 seconds
                </p>
              </div>

              {attempts > 0 && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-slate-500 text-xs"
                >
                  Attempt {attempts} • Checking every 3 seconds...
                </motion.p>
              )}

              {/* Progress bar animation */}
              <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{ width: '50%' }}
                />
              </div>
            </>
          )}
        </motion.div>

        {/* Footer text */}
        <p className="text-slate-600 text-xs mt-6">
          Powered by AI • Built for hackathons
        </p>
      </motion.div>
    </div>
  );
};

export default BackendWakeUp;
