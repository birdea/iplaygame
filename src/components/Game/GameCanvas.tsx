import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useInputs } from '../../hooks/useInputs';
import {
    MOVE_SPEED, JUMP_FORCE, BOSS_TRIGGER_X, AUTO_SCROLL_SPEED,
} from '../../constants';
import type { Block, Monster } from '../../types';
import confetti from 'canvas-confetti';
import { MobileControls } from '../UI/MobileControls';
import { Pause } from 'lucide-react';

// Extracted game modules
import { applyVerticalPhysics, applyHorizontalPhysics, aabbOverlap } from './physics';
import { generateStage } from './stageGenerator';
import {
    drawBackground, drawBlock, drawDragon, drawPlayer,
    drawMonster, drawBullets, drawGroundItems, drawBossHPBar, drawHUD, drawMinimap,
} from './renderer';
import { createBossEntity, updateBoss } from './bossAI';
import { createBullet, updateMonsters, updateBullets, spawnGroundItem, updateGroundItems } from './entityManager';
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

            if (!gs.isPaused) {
                // -- 1. LOGIC UPDATES --
                if (!gs.bossActive) gs.cameraX += AUTO_SCROLL_SPEED;
                const speedMult = gs.powerups.fastRun > Date.now() ? 1.6 : 1;
                const p = gs.player;

                // Input handling
                p.vel.x = 0;
                if (keys.current['ArrowLeft'] || keys.current['KeyA']) p.vel.x = -MOVE_SPEED * speedMult;
                if (keys.current['ArrowRight'] || keys.current['KeyD']) p.vel.x = MOVE_SPEED * speedMult;

                if ((keys.current['ArrowUp'] || keys.current['KeyW']) && gs.onGround) {
                    p.vel.y = JUMP_FORCE;
                    gs.onGround = false;
                }

                // Shoot (S key) + trigger swing
                if (keys.current['KeyS'] && time - gs.lastShootTime > 300) {
                    const isBig = gs.powerups.bigBullet > Date.now();
                    gs.bullets.push(createBullet(p, isBig));
                    gs.lastShootTime = time;
                    gs.lastSwingTime = time; // trigger club swing on shoot
                }

                // Auto-swing club every 600ms while moving or periodically
                const isWalking = keys.current['ArrowLeft'] || keys.current['KeyA'] || keys.current['ArrowRight'] || keys.current['KeyD'];
                if (isWalking && time - gs.lastSwingTime > 600) {
                    gs.lastSwingTime = time;
                } else if (!isWalking && time - gs.lastSwingTime > 1200) {
                    gs.lastSwingTime = time; // idle swing every 1.2s
                }

                // Physics
                const vertResult = applyVerticalPhysics(p, gs.entities);
                gs.onGround = vertResult.onGround;

                if (vertResult.hitQuestion) {
                    vertResult.hitQuestion.blockType = 'brick';
                    const rand = Math.random();
                    const powerup: 'bigBullet' | 'fastRun' | 'hp' =
                        rand < 0.25 ? 'bigBullet' : rand < 0.5 ? 'fastRun' : 'hp';
                    gs.groundItems.push(spawnGroundItem(vertResult.hitQuestion, powerup));
                    actions.addScore(100);
                }

                applyHorizontalPhysics(p, gs.entities);

                // --- Platform crumble logic ---
                // 2F+ platforms: blockType !== 'ground' (y < 500)
                const GROUND_Y = 500;
                const CRUMBLE_WARN_MS = 2000;  // start flashing at 2s
                const CRUMBLE_FALL_MS = 3000;  // disappear at 3s
                const now = Date.now();
                const standingBlock = vertResult.standingOnBlock;

                gs.entities = gs.entities.filter(e => {
                    if (e.type !== 'block') return true;
                    const blk = e as Block;

                    // Only apply to non-ground platform blocks
                    if (blk.blockType === 'ground' || blk.pos.y >= GROUND_Y) return true;

                    const isStandingHere = standingBlock?.id === blk.id;

                    if (isStandingHere) {
                        // Start timer on first contact
                        if (blk.standingStartTime === undefined) {
                            blk.standingStartTime = now;
                        }
                        const elapsed = now - blk.standingStartTime;
                        blk.isCrumbling = elapsed >= CRUMBLE_WARN_MS;

                        // Remove block after 3s → player falls naturally
                        if (elapsed >= CRUMBLE_FALL_MS) {
                            return false; // remove from entities
                        }
                    } else {
                        // Player left this block → reset timer
                        blk.standingStartTime = undefined;
                        blk.isCrumbling = false;
                    }

                    return true;
                });


                // Fall Death
                if (p.pos.y > 600) {
                    actions.takeDamage(1);
                    const groundBlocks = gs.entities.filter(e => e.type === 'block' && (e as Block).blockType === 'ground');
                    const nextSafe = groundBlocks.find(e => e.pos.x > gs.cameraX + 100) || groundBlocks[0];
                    p.pos = nextSafe ? { x: nextSafe.pos.x, y: nextSafe.pos.y - 100 } : { x: gs.cameraX + 100, y: 300 };
                    p.vel = { x: 0, y: 0 };
                }

                // Camera boundary
                if (p.pos.x < gs.cameraX) p.pos.x = gs.cameraX;

                // Boss trigger
                if (p.pos.x > BOSS_TRIGGER_X && !gs.bossActive) {
                    gs.bossActive = true;
                    gs.entities.push(createBossEntity(gs.stage));
                }

                // Monster logic
                gs.entities = updateMonsters(
                    gs.entities, p, (amt) => actions.takeDamage(amt),
                    (amt) => actions.addScore(amt),
                );

                // Boss AI
                const boss = gs.entities.find(e => e.type === 'boss');
                if (boss) {
                    updateBoss(
                        boss, p, gs.bossTactics, time, gs.stage, gameActiveRef,
                        (bullet) => { gs.bullets.push(bullet); },
                    );
                    // Boss-player collision
                    if (aabbOverlap(p, boss)) {
                        if (actions.takeDamage(1)) p.pos.x -= 200;
                    }
                }

                // Bullet collisions
                const bulletResult = updateBullets(gs.bullets, gs.entities, p, (amt) => actions.takeDamage(amt), gs.cameraX);
                gs.entities = bulletResult.entities;
                gs.bullets = bulletResult.bullets;

                if (bulletResult.bossDefeated) {
                    actions.addScore(bulletResult.scoreGained);
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    gs.gameActive = false;
                    setScreen('victory');
                } else if (bulletResult.scoreGained > 0) {
                    actions.addScore(bulletResult.scoreGained);
                }

                // Ground items update
                const itemResult = updateGroundItems(gs.groundItems, p, gs.entities, gs.cameraX);
                gs.groundItems = itemResult.groundItems;
                if (itemResult.collected) {
                    if (itemResult.collected === 'hp') {
                        actions.setHP(gs.hp + 1);
                    } else {
                        actions.activatePowerup(itemResult.collected, 30000);
                    }
                    actions.addScore(50);
                }

                gs.cameraX = Math.max(gs.cameraX, p.pos.x - 400);
            }

            // -- 2. RENDER --
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground(ctx, gs.cameraX, time);

            ctx.save();
            ctx.translate(-gs.cameraX, 0);

            // Entities
            gs.entities.forEach(e => {
                if (e.type === 'block') {
                    drawBlock(ctx, e.pos.x, e.pos.y, e.width, e.height, (e as Block).blockType, (e as Block).isCrumbling);
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

            // Ground items (popped from ? blocks)
            drawGroundItems(ctx, gs.groundItems);

            // Player
            const p = gs.player;
            const isMoving = !gs.isPaused && (keys.current['ArrowLeft'] || keys.current['KeyA'] || keys.current['ArrowRight'] || keys.current['KeyD']);

            ctx.save();
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            drawPlayer(ctx, p, time, isMoving, faceImage.current, Date.now() < gs.invincibleUntil, gs.powerups, gs.lastSwingTime);
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
