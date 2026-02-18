import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useInputs } from '../../hooks/useInputs';
import {
    MOVE_SPEED, JUMP_FORCE, BOSS_TRIGGER_X, AUTO_SCROLL_SPEED,
    PLAYER_WIDTH, PLAYER_HEIGHT, INVINCIBILITY_DURATION
} from '../../constants';
import type { Entity, Block, Monster } from '../../types';
import confetti from 'canvas-confetti';
import { MobileControls } from '../UI/MobileControls';
import { Pause } from 'lucide-react';

// Extracted modules
import { applyVerticalPhysics, applyHorizontalPhysics, aabbOverlap } from './physics';
import { generateStage } from './stageGenerator';
import { drawBackground, drawBlock, drawDragon, drawPlayer, drawMonster, drawBullets, drawBossHPBar, drawHUD, drawMinimap } from './renderer';
import { createBossTactics, createBossEntity, updateBoss } from './bossAI';
import { createBullet, updateMonsters, updateBullets } from './entityManager';

const MINIMAP_WIDTH = 150;
const MINIMAP_HEIGHT = 90;

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { keys, setKey } = useInputs();
    const {
        stage, hp, score, powerups,
        setHP, addScore, setScreen, activatePowerup,
        faces, selectedFaceIndex, isPaused, togglePaused
    } = useGameStore();

    // Stable refs for actions to avoid re-triggering effects
    const actionsRef = useRef({ setHP, addScore, setScreen, activatePowerup });
    useEffect(() => {
        actionsRef.current = { setHP, addScore, setScreen, activatePowerup };
    }, [setHP, addScore, setScreen, activatePowerup]);

    // Game state refs (mutable for performance)
    const statsRef = useRef({ hp, score, powerups, isPaused });
    useEffect(() => {
        statsRef.current = { hp, score, powerups, isPaused };
    }, [hp, score, powerups, isPaused]);

    const lastShootTime = useRef(0);
    const lastEscTime = useRef(0);

    const playerRef = useRef<Entity>({
        id: 'player',
        pos: { x: 100, y: 300 },
        vel: { x: 0, y: 0 },
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        type: 'player'
    });

    const invincibleUntil = useRef(0);

    const takeDamage = useCallback((amount: number = 1) => {
        if (Date.now() < invincibleUntil.current) return false;
        actionsRef.current.setHP(statsRef.current.hp - amount);
        invincibleUntil.current = Date.now() + INVINCIBILITY_DURATION;
        return true;
    }, []);

    const onGround = useRef(false);
    const cameraX = useRef(0);
    const entities = useRef<Entity[]>([]);
    const bullets = useRef<Entity[]>([]);
    const gameActive = useRef(true);
    const bossActive = useRef(false);
    const stageRef = useRef(stage);
    const bossTactics = useRef(createBossTactics());

    useEffect(() => {
        stageRef.current = stage;
    }, [stage]);

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
            '/monster/monster_face_3.png'
        ];
        mFaces.forEach((src, idx) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { monsterFaces.current[idx] = img; };
        });
    }, [faces, selectedFaceIndex]);

    // Generate Stage
    useEffect(() => {
        entities.current = generateStage(stage);
        playerRef.current.pos = { x: 100, y: 300 };
        playerRef.current.vel = { x: 0, y: 0 };
        cameraX.current = 0;
        bossActive.current = false;
        gameActive.current = true;
    }, [stage]);

    // Game Loop - Ref-based for perfect stability (no restarts)
    const loopRef = useRef<(time: number) => void>(null);

    loopRef.current = (time: number) => {
        try {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // -- 0. INPUTS & PAUSE --
            if (keys.current['Escape'] && time - lastEscTime.current > 300) {
                togglePaused();
                lastEscTime.current = time;
            }

            if (!gameActive.current) return;

            const isPausedLoop = statsRef.current.isPaused;

            if (!isPausedLoop) {
                // -- 1. LOGIC UPDATES --
                cameraX.current += AUTO_SCROLL_SPEED;
                const speedMult = statsRef.current.powerups.fastRun > Date.now() ? 1.6 : 1;
                const p = playerRef.current;

                // Input handling
                p.vel.x = 0;
                if (keys.current['ArrowLeft'] || keys.current['KeyA']) p.vel.x = -MOVE_SPEED * speedMult;
                if (keys.current['ArrowRight'] || keys.current['KeyD']) p.vel.x = MOVE_SPEED * speedMult;

                if ((keys.current['ArrowUp'] || keys.current['KeyW'] || keys.current['Space']) && onGround.current) {
                    p.vel.y = JUMP_FORCE;
                    onGround.current = false;
                }

                // Shoot
                if (keys.current['KeyS'] && time - lastShootTime.current > 300) {
                    const isBig = statsRef.current.powerups.bigBullet > Date.now();
                    bullets.current.push(createBullet(p, isBig));
                    lastShootTime.current = time;
                }

                // Physics
                const vertResult = applyVerticalPhysics(p, entities.current);
                onGround.current = vertResult.onGround;

                if (vertResult.hitQuestion) {
                    vertResult.hitQuestion.blockType = 'brick';
                    const rand = Math.random();
                    if (rand < 0.25) actionsRef.current.activatePowerup('bigBullet', 30000);
                    else if (rand < 0.5) actionsRef.current.activatePowerup('fastRun', 30000);
                    else if (rand < 0.75) actionsRef.current.setHP(statsRef.current.hp + 1);
                    actionsRef.current.addScore(100);
                }

                applyHorizontalPhysics(p, entities.current);

                // Fall Death
                if (p.pos.y > 600) {
                    takeDamage(1);
                    const groundBlocks = entities.current.filter(e => e.type === 'block' && (e as Block).blockType === 'ground');
                    const nextSafe = groundBlocks.find(e => e.pos.x > cameraX.current + 100) || groundBlocks[0];
                    p.pos = nextSafe ? { x: nextSafe.pos.x, y: nextSafe.pos.y - 100 } : { x: cameraX.current + 100, y: 300 };
                    p.vel = { x: 0, y: 0 };
                }

                // Camera boundary
                if (p.pos.x < cameraX.current) p.pos.x = cameraX.current;

                // Boss trigger
                if (p.pos.x > BOSS_TRIGGER_X && !bossActive.current) {
                    bossActive.current = true;
                    entities.current.push(createBossEntity(stageRef.current));
                }

                // Monster logic
                entities.current = updateMonsters(
                    entities.current, p, takeDamage,
                    (amt) => actionsRef.current.addScore(amt),
                );

                // Boss AI
                const boss = entities.current.find(e => e.type === 'boss');
                if (boss) {
                    updateBoss(
                        boss, p, bossTactics.current, time, stageRef.current, gameActive,
                        (bullet) => { bullets.current.push(bullet); },
                    );
                    // Boss-player collision
                    if (aabbOverlap(p, boss)) {
                        if (takeDamage(1)) p.pos.x -= 200;
                    }
                }

                // Bullet collisions
                const bulletResult = updateBullets(bullets.current, entities.current, p, takeDamage, cameraX.current);
                entities.current = bulletResult.entities;
                bullets.current = bulletResult.bullets;

                if (bulletResult.bossDefeated) {
                    actionsRef.current.addScore(bulletResult.scoreGained);
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    gameActive.current = false;
                    actionsRef.current.setScreen('victory');
                } else if (bulletResult.scoreGained > 0) {
                    actionsRef.current.addScore(bulletResult.scoreGained);
                }

                cameraX.current = Math.max(cameraX.current, p.pos.x - 400);
            }

            // -- 2. RENDER --
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground(ctx, cameraX.current, time);

            ctx.save();
            ctx.translate(-cameraX.current, 0);

            // Entities
            entities.current.forEach(e => {
                if (e.type === 'block') {
                    drawBlock(ctx, e.pos.x, e.pos.y, e.width, e.height, (e as Block).blockType);
                } else if (e.type === 'monster') {
                    const m = e as Monster;
                    const mFace = monsterFaces.current[m.monsterType === 'skinny' ? 0 : m.monsterType === 'fat' ? 1 : 2];
                    drawMonster(ctx, e, m, time, mFace);
                } else if (e.type === 'boss') {
                    drawDragon(ctx, e.pos.x, e.pos.y, e.width, e.height, time, bossTactics.current.state);
                    drawBossHPBar(ctx, e);
                }
            });

            // Bullets
            drawBullets(ctx, bullets.current);

            // Player
            const p = playerRef.current;
            const isMoving = !statsRef.current.isPaused && (keys.current['ArrowLeft'] || keys.current['KeyA'] || keys.current['ArrowRight'] || keys.current['KeyD']);

            ctx.save();
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;
            drawPlayer(ctx, p, time, isMoving, faceImage.current, Date.now() < invincibleUntil.current, statsRef.current.powerups);
            ctx.restore();

            ctx.restore();

            // HUD
            drawHUD(ctx, {
                stage: stageRef.current,
                score: statsRef.current.score,
                hp: statsRef.current.hp,
                powerups: statsRef.current.powerups,
            });

            // Minimap
            const bossEnt = entities.current.find(ev => ev.type === 'boss');
            drawMinimap(ctx, canvas.width, MINIMAP_WIDTH, MINIMAP_HEIGHT, cameraX.current, p, bossEnt);

            // Death check
            if (statsRef.current.hp <= 0) {
                gameActive.current = false;
                actionsRef.current.setScreen('gameover');
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
                    onClick={() => togglePaused()}
                    className="pause-btn"
                    title="Pause Game (Esc)"
                >
                    <Pause size={20} fill="white" />
                </button>

                <div className="hud-card">
                    <div className="hud-item">
                        <span className="hud-label">World</span>
                        <span className="hud-value">1-{stage}</span>
                    </div>

                    <div className="hud-divider" />

                    <div className="hud-item">
                        <span className="hud-label">Score</span>
                        <span className="hud-value" style={{ color: 'var(--accent)' }}>
                            {String(score).padStart(7, '0')}
                        </span>
                    </div>

                    <div className="hud-divider" />

                    <div className="hud-item">
                        <span className="hud-label">Life</span>
                        <div className="health-bar-container">
                            {[...Array(Math.max(3, hp))].map((_, i) => (
                                <div
                                    key={i}
                                    className={`health-segment ${i < hp ? 'active' : ''}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <MobileControls setKey={setKey} />

            {isPaused && (
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
                                onClick={() => togglePaused(false)}
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
