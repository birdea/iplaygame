import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings as SettingsIcon } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { GAME_STRATEGY } from '../Game/GameStrategy';

// 인트로 시퀀스: main_logo.jpg (2초) → dragon_img.jpg (2초) → dragon_intro.mp4 (루프)
type IntroPhase = 'logo1' | 'logo2' | 'video';

const INTRO_PHASES: { phase: IntroPhase; duration: number }[] = [
    { phase: 'logo1', duration: 2000 },
    { phase: 'logo2', duration: 2000 },
    { phase: 'video', duration: Infinity },
];

export const Menu: React.FC = () => {
    const setScreen = useGameStore((state) => state.setScreen);
    const [introPhase, setIntroPhase] = useState<IntroPhase>('logo1');
    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // logo1 → logo2 → video 순서로 자동 전환
        const runPhase = (index: number) => {
            const current = INTRO_PHASES[index];
            if (!current) return;

            setIntroPhase(current.phase);

            if (current.duration !== Infinity) {
                timerRef.current = setTimeout(() => {
                    runPhase(index + 1);
                }, current.duration);
            }
        };

        runPhase(0);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // video 페이즈 진입 시 재생
    useEffect(() => {
        if (introPhase === 'video' && videoRef.current) {
            videoRef.current.play().catch(() => { });
        }
    }, [introPhase]);

    return (
        <div className="h-full flex flex-col items-center justify-center gap-6 p-4">
            <motion.h1
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg tracking-tighter text-center"
            >
                {GAME_STRATEGY.GENERAL.TITLE.split(' ')[0]}{' '}
                <span className="text-primary">{GAME_STRATEGY.GENERAL.TITLE.split(' ')[1]}</span>
            </motion.h1>

            {/* 인트로 이미지/비디오 시퀀스 */}
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20">
                <AnimatePresence mode="wait">
                    {/* Phase 1: main_logo.jpg */}
                    {introPhase === 'logo1' && (
                        <motion.img
                            key="logo1"
                            src="/logo/main_logo.jpg"
                            alt="Main Logo"
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        />
                    )}

                    {/* Phase 2: main_logo_dragon_knight_img.jpg */}
                    {introPhase === 'logo2' && (
                        <motion.img
                            key="logo2"
                            src="/logo/main_logo_dragon_knight_img.jpg"
                            alt="Dragon Knight"
                            className="absolute inset-0 w-full h-full object-cover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        />
                    )}

                    {/* Phase 3: main_logo_dragon_knight_intro.mp4 (루프) */}
                    {introPhase === 'video' && (
                        <motion.div
                            key="video"
                            className="absolute inset-0"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <video
                                ref={videoRef}
                                src="/logo/main_logo_dragon_knight_intro.mp4"
                                loop
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-[250px]">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        useGameStore.getState().resetGame();
                    }}
                    className="btn-primary flex items-center justify-center gap-2 text-lg md:text-xl w-full"
                >
                    <Play fill="white" size={24} /> PLAY
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setScreen('settings')}
                    className="btn-secondary flex items-center justify-center gap-2 text-lg md:text-xl w-full"
                >
                    <SettingsIcon size={24} /> SETTINGS
                </motion.button>
            </div>
        </div>
    );
};
