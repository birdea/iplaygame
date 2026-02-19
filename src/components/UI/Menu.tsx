import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings as SettingsIcon } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { GAME_STRATEGY } from '../Game/GameStrategy';

// 인트로 시퀀스: main_logo.jpg (2초) → dragon_img.jpg (2초) → dragon_intro.mp4 (재생 완료) → 반복
type IntroPhase = 'logo1' | 'logo2' | 'video';

const INTRO_DURATIONS: Record<IntroPhase, number> = {
    logo1: 2000,
    logo2: 2000,
    video: Infinity, // 동영상은 ended 이벤트로 전환
};
const PHASE_ORDER: IntroPhase[] = ['logo1', 'logo2', 'video'];

export const Menu: React.FC = () => {
    const setScreen = useGameStore((state) => state.setScreen);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const introPhase = PHASE_ORDER[phaseIndex];
    const videoRef = useRef<HTMLVideoElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const goNextPhase = () => {
        setPhaseIndex((prev) => (prev + 1) % PHASE_ORDER.length);
    };

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        const duration = INTRO_DURATIONS[introPhase];
        // 이미지 페이즈만 타이머로 자동 전환 (video는 ended 이벤트 처리)
        if (duration !== Infinity) {
            timerRef.current = setTimeout(goNextPhase, duration);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [introPhase]);

    // video 페이즈 진입 시 처음부터 재생
    useEffect(() => {
        if (introPhase === 'video' && videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
        }
    }, [introPhase]);

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            padding: '1rem',
        }}>
            {/* 타이틀 */}
            <motion.h1
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                style={{
                    fontSize: 'clamp(2rem, 8vw, 3.5rem)',
                    fontWeight: 900,
                    color: 'white',
                    textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    letterSpacing: '-0.03em',
                    textAlign: 'center',
                    margin: 0,
                }}
            >
                {GAME_STRATEGY.GENERAL.TITLE.split(' ')[0]}{' '}
                <span style={{ color: 'var(--primary)' }}>{GAME_STRATEGY.GENERAL.TITLE.split(' ')[1]}</span>
            </motion.h1>

            {/* 인트로 이미지/비디오 시퀀스 컨테이너 */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                style={{
                    position: 'relative',
                    width: 'clamp(200px, 40vw, 280px)',
                    height: 'clamp(200px, 40vw, 280px)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
                    border: '3px solid rgba(255,255,255,0.2)',
                    flexShrink: 0,
                }}
            >
                <AnimatePresence mode="wait">
                    {/* Phase 1: main_logo.jpg */}
                    {introPhase === 'logo1' && (
                        <motion.img
                            key="logo1"
                            src="/logo/main_logo.jpg"
                            alt="Main Logo"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    )}

                    {/* Phase 2: main_logo_dragon_knight_img.jpg */}
                    {introPhase === 'logo2' && (
                        <motion.img
                            key="logo2"
                            src="/logo/main_logo_dragon_knight_img.jpg"
                            alt="Dragon Knight"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    )}

                    {/* Phase 3: main_logo_dragon_knight_intro.mp4 → 재생 완료 후 logo1로 복귀 */}
                    {introPhase === 'video' && (
                        <motion.div
                            key="video"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{ position: 'absolute', inset: 0 }}
                        >
                            <video
                                ref={videoRef}
                                src="/logo/main_logo_dragon_knight_intro.mp4"
                                autoPlay
                                muted
                                playsInline
                                onEnded={goNextPhase}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* 버튼 영역 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '250px' }}>
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { useGameStore.getState().resetGame(); }}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem', width: '100%' }}
                >
                    <Play fill="white" size={24} /> PLAY
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setScreen('settings')}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem', width: '100%' }}
                >
                    <SettingsIcon size={24} /> SETTINGS
                </motion.button>
            </div>
        </div>
    );
};
