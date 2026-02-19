import React from 'react';
import { useGameStore } from '../../store/useGameStore';

interface HUDProps {
    onHandlePress?: (code: string, isPressed: boolean) => void;
    aCharged?: boolean;
}

const Button = ({ code, label, className = "", onHandlePress }: { code: string, label: React.ReactNode, className?: string, onHandlePress: (code: string, isPressed: boolean) => void }) => (
    <button
        onPointerDown={(e) => { e.preventDefault(); onHandlePress(code, true); }}
        onPointerUp={(e) => { e.preventDefault(); onHandlePress(code, false); }}
        onPointerCancel={(e) => { e.preventDefault(); onHandlePress(code, false); }}
        onContextMenu={(e) => e.preventDefault()}
        className={`control-btn ${className}`}
    >
        {label}
    </button>
);

export const HUD: React.FC<HUDProps> = ({ onHandlePress, aCharged }) => {
    const { hp, score, ammo, shields, stage, powerups, shieldUntil, blockCooldownUntil } = useGameStore();
    const now = Date.now();

    const bigBulletTime = powerups.bigBullet > now ? Math.ceil((powerups.bigBullet - now) / 1000) : 0;
    const fastRunTime = powerups.fastRun > now ? Math.ceil((powerups.fastRun - now) / 1000) : 0;
    const shieldTime = shieldUntil > now ? Math.ceil((shieldUntil - now) / 1000) : 0;
    const blockTime = blockCooldownUntil > now ? Math.ceil((blockCooldownUntil - now) / 1000) : 0;

    return (
        <div className="hud-bottom-bar">
            {/* Left: Progress/Score */}
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

            {/* Center: HP & Timers */}
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
                    {shieldTime > 0 && (
                        <div className="timer-badge shield-invinc">SHIELD: {shieldTime}s</div>
                    )}
                    {blockTime > 0 ? (
                        <div className="timer-badge block-cooldown">PARRY: {blockTime}s</div>
                    ) : (
                        <div className="timer-badge block-ready">PARRY READY</div>
                    )}
                </div>
            </div>

            {/* Right: Actions (E, A, S, D, F) */}
            {onHandlePress && (
                <div className="hud-actions">
                    <Button code="KeyE" label={<span style={{ fontSize: '1.2rem' }}>E</span>} className="btn-w" onHandlePress={onHandlePress} />
                    <div className="action-group">
                        <Button code="KeyA" label={
                            <div className="flex flex-col items-center">
                                <span className="text-yellow-400 font-black text-xs leading-none">{ammo}</span>
                                <span className="text-[0.5rem] font-bold opacity-70">GUN</span>
                            </div>
                        } className="btn-a" onHandlePress={onHandlePress} />

                        <Button code="KeyS" label={
                            <div className="flex flex-col items-center">
                                <span className={`text-white font-black text-xs leading-none ${aCharged ? 'text-yellow-400' : ''}`}>ATK</span>
                                <span className="text-[0.5rem] font-bold opacity-70">CLUB</span>
                            </div>
                        } className={`btn-s ${aCharged ? 'charged' : ''}`} onHandlePress={onHandlePress} />

                        <Button code="KeyD" label={
                            <div className="flex flex-col items-center">
                                <span className="text-blue-400 font-black text-xs leading-none">{shields}</span>
                                <span className="text-[0.5rem] font-bold opacity-70">SHLD</span>
                            </div>
                        } className="btn-d" onHandlePress={onHandlePress} />

                        <Button code="KeyF" label={
                            <div className="flex flex-col items-center">
                                <span className="text-white font-black text-xs leading-none">UP</span>
                                <span className="text-[0.5rem] font-bold opacity-70">ATK</span>
                            </div>
                        } className="btn-f" onHandlePress={onHandlePress} />
                    </div>
                </div>
            )}
        </div>
    );
};
