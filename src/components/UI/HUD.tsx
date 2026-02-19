import React from 'react';
import { useGameStore } from '../../store/useGameStore';

export const HUD: React.FC = () => {
    const { hp, score, ammo, shields, stage, powerups } = useGameStore();
    const now = Date.now();

    const bigBulletTime = powerups.bigBullet > now ? Math.ceil((powerups.bigBullet - now) / 1000) : 0;
    const fastRunTime = powerups.fastRun > now ? Math.ceil((powerups.fastRun - now) / 1000) : 0;

    return (
        <div className="hud-bottom-bar">
            <div className="hud-left-info">
                <div className="hud-stat">
                    <span className="hud-label">WORLD</span>
                    <span className="hud-value">1-{stage}</span>
                </div>
                <div className="hud-stat">
                    <span className="hud-label">SCORE</span>
                    <span className="hud-value">{String(score).padStart(7, '0')}</span>
                </div>
            </div>

            <div className="hud-center-info">
                <div className="health-container">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            key={i}
                            className={`health-dot ${i < hp ? 'active' : ''}`}
                        />
                    ))}
                </div>
                <div className="powerup-timers">
                    {bigBulletTime > 0 && (
                        <div className="timer-badge big-bullet">B: {bigBulletTime}s</div>
                    )}
                    {fastRunTime > 0 && (
                        <div className="timer-badge fast-run">F: {fastRunTime}s</div>
                    )}
                </div>
            </div>

            <div className="hud-right-info">
                <div className="hud-stat">
                    <span className="hud-label">AMMO</span>
                    <span className="hud-value text-yellow-400">{ammo}</span>
                </div>
                <div className="hud-stat">
                    <span className="hud-label">SHLDS</span>
                    <span className="hud-value text-blue-400">{shields}</span>
                </div>
            </div>
        </div>
    );
};
