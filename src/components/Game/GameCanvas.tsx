import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useInputs } from '../../hooks/useInputs';
import { useGameLoop } from '../../hooks/useGameLoop';
import { CANVAS_WIDTH, CANVAS_HEIGHT, MINIMAP_WIDTH, MINIMAP_HEIGHT } from '../../constants';
import type { Block } from '../../types';
import { MobileControls } from '../UI/MobileControls';
import { Pause } from 'lucide-react';

import {
    drawBackground, drawBlock, drawDragon, drawPlayer,
    drawMonster, drawBullets, drawGroundItems, drawBossHPBar, drawMinimap, drawEffects,
    drawBossWarning, drawDamageVignette,
} from './renderers';
import { resumeAudio } from './soundManager';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { keys, setKey } = useInputs();

    // Zustand selectors
    const setScreen = useGameStore(s => s.setScreen);
    const faces = useGameStore(s => s.faces);
    const selectedFaceIndex = useGameStore(s => s.selectedFaceIndex);
    const selectedWeapon = useGameStore(s => s.selectedWeapon);
    const storeIsPaused = useGameStore(s => s.isPaused);
    const isMobile = useGameStore(s => s.isMobile);
    const manualMobileControls = useGameStore(s => s.manualMobileControls);

    // Game loop (all game logic)
    const { gsRef, actionsRef, update } = useGameLoop();

    // -----------------------------------------------------------------------
    // Asset refs (DOM/browser resources, NOT game state)
    // -----------------------------------------------------------------------
    const faceImage = useRef<HTMLImageElement | null>(null);
    const monsterFaces = useRef<(HTMLImageElement | null)[]>([null, null, null]);

    useEffect(() => {
        if (faces[selectedFaceIndex]) {
            const img = new Image();
            img.src = faces[selectedFaceIndex];
            img.onload = () => { faceImage.current = img; };
        }

        const mFaces = [
            '/monster/monster_face_1.png',
            '/monster/monster_face_2.png',
            '/monster/monster_face_3.png',
        ];
        mFaces.forEach((src, idx) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { monsterFaces.current[idx] = img; };
        });
    }, [faces, selectedFaceIndex]);

    // Audio Context activation
    useEffect(() => {
        const activate = () => resumeAudio();
        window.addEventListener('keydown', activate);
        window.addEventListener('pointerdown', activate);
        return () => {
            window.removeEventListener('keydown', activate);
            window.removeEventListener('pointerdown', activate);
        };
    }, []);

    // -----------------------------------------------------------------------
    // Game Loop (update + render)
    // -----------------------------------------------------------------------
    const loopRef = useRef<(time: number) => void>(null);

    loopRef.current = (time: number) => {
        try {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const gs = gsRef.current;
            const p = gs.player;

            // -- UPDATE --
            update(time, keys.current);

            if (!gs.gameActive) return;

            // -- RENDER --
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground(ctx, gs.cameraX, time);

            ctx.save();
            ctx.translate(-gs.cameraX, 0);

            // Entities
            gs.entities.forEach(e => {
                if (e.type === 'block') {
                    const blk = e as Block;
                    drawBlock(ctx, blk.pos.x, blk.pos.y, blk.width, blk.height, blk.blockType, blk.isCrumbling, blk.hitCount);
                } else if (e.type === 'monster') {
                    const m = e as any;
                    const mFace = monsterFaces.current[m.monsterType === 'skinny' ? 0 : m.monsterType === 'fat' ? 1 : 2];
                    drawMonster(ctx, e, m, time, mFace);
                } else if (e.type === 'boss') {
                    drawDragon(ctx, e.pos.x, e.pos.y, e.width, e.height, time, gs.bossTactics.state, gs.stage, gs.bossTactics.visualFacing, p.pos);
                    drawBossHPBar(ctx, e);
                }
            });

            drawBullets(ctx, gs.bullets);
            drawGroundItems(ctx, gs.groundItems);
            drawEffects(ctx, gs.effects);

            // Player
            const isMoving = !gs.isPaused && (keys.current['ArrowLeft'] || keys.current['ArrowRight']);

            ctx.save();
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            drawPlayer(ctx, p, time, isMoving, faceImage.current, Date.now() < gs.invincibleUntil, gs.powerups, gs.lastSwingTime, gs.shieldUntil, gs.aCharged, gs.lastMegaSwingTime, selectedWeapon, gs.isBlocking, gs.isCrouching);
            ctx.restore();

            ctx.restore();

            // Minimap
            const bossEnt = gs.entities.find(ev => ev.type === 'boss');
            drawMinimap(ctx, canvas.width, MINIMAP_WIDTH, MINIMAP_HEIGHT, gs.cameraX, p, bossEnt, gs.stage);

            if (gs.bossWarning) {
                drawBossWarning(ctx, time);
            }
            drawDamageVignette(ctx, gs.lastDamageTime, Date.now());
        } catch (err) {
            console.error("Game Loop Error:", err);
        }
    };

    useEffect(() => {
        let frameId: number;
        const tick = (time: number) => {
            if (loopRef.current) loopRef.current(time);
            frameId = requestAnimationFrame(tick);
        };
        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, []);

    return (
        <div className="game-container">
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="game-canvas rounded-xl shadow-2xl border-4 border-white/20"
            />

            <div className="hud-container">
                <button
                    onClick={() => actionsRef.current.togglePaused()}
                    className="pause-btn"
                    title="Pause Game (Esc)"
                >
                    <Pause size={20} fill="white" />
                </button>
            </div>

            {(isMobile || manualMobileControls) && <MobileControls setKey={setKey} />}

            {storeIsPaused && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4">
                    <div className="glass-morphism p-8 max-w-sm w-full text-center space-y-6">
                        <h2 className="text-4xl font-black text-white">PAUSED</h2>
                        <p className="text-white/80">Would you like to stop the game and return to menu?</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setScreen('menu')}
                                className="btn-primary w-full text-lg"
                            >
                                STOP
                            </button>
                            <button
                                onClick={() => actionsRef.current.togglePaused(false)}
                                className="btn-secondary w-full text-lg"
                            >
                                CONTINUE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
