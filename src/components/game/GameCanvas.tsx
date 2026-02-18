import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../core/store/useGameStore';
import { useInputs } from '../core/hooks/useInputs';
import type { Block, Monster } from '../core/types';
import { MobileControls } from '../ui/MobileControls';
import { Pause } from 'lucide-react';
import monsterFace1 from '../../assets/monster/monster_face_1.png';
import monsterFace2 from '../../assets/monster/monster_face_2.png';
import monsterFace3 from '../../assets/monster/monster_face_3.png';

import { updateGame } from './gameLogic';
import { generateStage } from './stageGenerator';
import {
    drawBackground, drawBlock, drawDragon, drawPlayer,
    drawMonster, drawBullets, drawBossHPBar, drawHUD, drawMinimap,
} from './renderer';
import { createInitialGameState, createGameActions } from './gameState';
import type { GameLoopState, GameActions } from './gameState';

const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 90;

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { keys, setKey } = useInputs();

    // Zustand selectors – only UI-facing state
    const setScreen = useGameStore(s => s.setScreen);
    const faces = useGameStore(s => s.faces);
    const selectedFaceIndex = useGameStore(s => s.selectedFaceIndex);

    // Read-only mirrors from Zustand (driven by syncFromLoop)
    const storeHP = useGameStore(s => s.hp);
    const storeScore = useGameStore(s => s.score);
    const storeStage = useGameStore(s => s.stage);
    const storeIsPaused = useGameStore(s => s.isPaused);

    // -----------------------------------------------------------------------
    // Single GameLoopState ref (replaces 18 individual refs)
    // -----------------------------------------------------------------------
    const gsRef = useRef<GameLoopState>(null!);
    const actionsRef = useRef<GameActions>(null!);

    if (gsRef.current === null) {
        const store = useGameStore.getState();
        const gs = createInitialGameState(store.stage);
        gs.hp = store.hp;
        gs.score = store.score;
        gs.powerups = { ...store.powerups };
        gs.entities = generateStage(store.stage);
        gsRef.current = gs;

        const syncFn = () => {
            const g = gsRef.current;
            useGameStore.getState().syncFromLoop({
                hp: g.hp,
                score: g.score,
                powerups: g.powerups,
                isPaused: g.isPaused,
                stage: g.stage,
            });
        };
        actionsRef.current = createGameActions(gs, syncFn);
    }

    // Adapter ref for bossAI setTimeout (needs ref-like { current } shape)
    const gameActiveRef = useRef(true);

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

        const mFaces = [monsterFace1, monsterFace2, monsterFace3];
        mFaces.forEach((src, idx) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { monsterFaces.current[idx] = img; };
        });
    }, [faces, selectedFaceIndex]);

    // -----------------------------------------------------------------------
    // Game Loop
    // -----------------------------------------------------------------------
    const loopRef = useRef<(time: number) => void>(null);

    loopRef.current = (time: number) => {
        try {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const gs = gsRef.current;
            const actions = actionsRef.current;

            // Keep adapter ref in sync for bossAI setTimeout
            gameActiveRef.current = gs.gameActive;

            // -- 0. INPUTS & PAUSE --
            if (keys.current['Escape'] && time - gs.lastEscTime > 300) {
                actions.togglePaused();
                gs.lastEscTime = time;
            }

            if (!gs.gameActive) return;

            // -- 1. UPDATE LOGIC --
            updateGame(
                gs,
                actions,
                keys,
                time,
                gameActiveRef,
                () => setScreen('victory'),
                () => setScreen('gameover')
            );

            if (gs.isPaused) {
                // Return early or continue to render current frame (paused)
                // We'll continue to render so the pause screen shows over the game.
            }

            // -- 2. RENDER --
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground(ctx, gs.cameraX, time);

            ctx.save();
            ctx.translate(-gs.cameraX, 0);

            // Entities
            gs.entities.forEach(e => {
                if (e.type === 'block') {
                    drawBlock(ctx, e.pos.x, e.pos.y, e.width, e.height, (e as Block).blockType);
                } else if (e.type === 'monster') {
                    const m = e as Monster;
                    const mFace = monsterFaces.current[m.monsterType === 'skinny' ? 0 : m.monsterType === 'fat' ? 1 : 2];
                    drawMonster(ctx, e, m, time, mFace);
                } else if (e.type === 'boss') {
                    drawDragon(ctx, e.pos.x, e.pos.y, e.width, e.height, time, gs.bossTactics.state);
                    drawBossHPBar(ctx, e);
                }
            });

            // Bullets
            drawBullets(ctx, gs.bullets);

            // Player
            const p = gs.player;
            const isMoving = !gs.isPaused && (keys.current['ArrowLeft'] || keys.current['KeyA'] || keys.current['ArrowRight'] || keys.current['KeyD']);

            ctx.save();
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            drawPlayer(ctx, p, time, isMoving, faceImage.current, Date.now() < gs.invincibleUntil, gs.powerups);
            ctx.restore();

            ctx.restore();

            // HUD
            drawHUD(ctx, {
                stage: gs.stage,
                score: gs.score,
                hp: gs.hp,
                powerups: gs.powerups,
            });

            // Minimap
            const bossEnt = gs.entities.find(ev => ev.type === 'boss');
            drawMinimap(ctx, canvas.width, MINIMAP_WIDTH, MINIMAP_HEIGHT, gs.cameraX, p, bossEnt);

            // Death check
            if (gs.hp <= 0) {
                gs.gameActive = false;
                setScreen('gameover');
            }
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
            <canvas ref={canvasRef} width={1000} height={600} className="rounded-xl shadow-2xl border-4 border-white/20 bg-sky-200" />

            {/* Top-Left Status Bar (HUD) */}
            <div className="hud-container">
                <button
                    onClick={() => actionsRef.current.togglePaused()}
                    className="pause-btn"
                    title="Pause Game (Esc)"
                >
                    <Pause size={20} fill="white" />
                </button>

                <div className="hud-card">
                    <div className="hud-item">
                        <span className="hud-label">World</span>
                        <span className="hud-value">1-{storeStage}</span>
                    </div>

                    <div className="hud-divider" />

                    <div className="hud-item">
                        <span className="hud-label">Score</span>
                        <span className="hud-value" style={{ color: 'var(--accent)' }}>
                            {String(storeScore).padStart(7, '0')}
                        </span>
                    </div>

                    <div className="hud-divider" />

                    <div className="hud-item">
                        <span className="hud-label">Life</span>
                        <div className="health-bar-container">
                            {[...Array(Math.max(3, storeHP))].map((_, i) => (
                                <div
                                    key={i}
                                    className={`health-segment ${i < storeHP ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <MobileControls setKey={setKey} />

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
                                CONFIRM & STOP
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
