import React from 'react';
import { motion } from 'framer-motion';
import { Play, Settings as SettingsIcon } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export const Menu: React.FC = () => {
    const setScreen = useGameStore((state) => state.setScreen);

    return (
        <div className="h-full flex flex-col items-center justify-center gap-8">
            <motion.h1
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-6xl font-extrabold text-white drop-shadow-lg tracking-tighter"
            >
                KIDS <span className="text-primary">ADVENTURE</span>
            </motion.h1>
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                className="w-64 h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20"
            >
                <img src="/main_logo.png" alt="Main Logo" className="w-full h-full object-cover" />
            </motion.div>

            <div className="flex flex-col gap-4 w-64">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setScreen('game')}
                    className="btn-primary flex items-center justify-center gap-2 text-xl"
                >
                    <Play fill="white" size={24} /> PLAY
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setScreen('settings')}
                    className="btn-secondary flex items-center justify-center gap-2 text-xl"
                >
                    <SettingsIcon size={24} /> SETTINGS
                </motion.button>
            </div>
        </div>
    );
};
