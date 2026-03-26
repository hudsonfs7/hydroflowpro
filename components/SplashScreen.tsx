
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, 800); // Wait for exit animation
        }, 3000);
        return () => clearTimeout(timer);
    }, []); // Removed onComplete to prevent infinite resets

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden"
                >
                    {/* Background Glow */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 0.15, scale: 1 }}
                        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                        className="absolute w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px]"
                    />

                    <div className="relative flex flex-col items-center">
                        {/* Logo HF */}
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ 
                                duration: 0.8, 
                                ease: [0.16, 1, 0.3, 1] 
                            }}
                            className="mb-4"
                        >
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10">
                                <span className="text-4xl font-black tracking-tighter italic">HF</span>
                            </div>
                        </motion.div>

                        {/* App Name */}
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60"
                        >
                            HydroFlow Pro
                        </motion.h1>

                        {/* Signature */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            transition={{ delay: 1.2, duration: 1 }}
                            className="mt-6 flex flex-col items-center gap-2"
                        >
                            <div className="h-px w-12 bg-white/20" />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-medium">
                                by Hudson Souza
                            </span>
                        </motion.div>
                    </div>

                    {/* Progress Bar (Subtle) */}
                    <motion.div 
                        className="absolute bottom-0 left-0 h-1 bg-blue-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3, ease: "linear" }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
