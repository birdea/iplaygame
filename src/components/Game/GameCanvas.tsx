import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useInputs } from '../../hooks/useInputs';
import {
    UNIT_SIZE, STAGE_LENGTH, BOSS_TRIGGER_X, BOSS_SIZE,
    GRAVITY, JUMP_FORCE, MOVE_SPEED, BULLET_SPEED,
    PLAYER_WIDTH, PLAYER_HEIGHT
} from '../../constants';
import type { Entity, Block, Monster } from '../../types';
import confetti from 'canvas-confetti';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const keys = useInputs();
    const { stage, hp, score, setHP, addScore, setScreen, faces, selectedFaceIndex } = useGameStore();

    // Stable refs for actions to avoid re-triggering effects
    const actionsRef = useRef({ setHP, addScore, setScreen });
    useEffect(() => {
        actionsRef.current = { setHP, addScore, setScreen };
    }, [setHP, addScore, setScreen]);

    // Game state refs (mutable for performance)
    const playerRef = useRef<Entity>({
        id: 'player',
        pos: { x: 100, y: 300 },
        vel: { x: 0, y: 0 },
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        type: 'player'
    });

    const onGround = useRef(false);
    const cameraX = useRef(0);
    const entities = useRef<Entity[]>([]);
    const bullets = useRef<Entity[]>([]);
    const gameActive = useRef(true);
    const bossActive = useRef(false);
    const stageRef = useRef(stage);

    useEffect(() => {
        stageRef.current = stage;
    }, [stage]);

    const faceImage = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        if (faces[selectedFaceIndex]) {
            const img = new Image();
            img.src = faces[selectedFaceIndex];
            img.onload = () => { faceImage.current = img; };
        }
    }, [faces, selectedFaceIndex]);

    // Generate Stage
    useEffect(() => {
        const newEntities: Entity[] = [];

        // Floor
        for (let x = 0; x < STAGE_LENGTH; x += UNIT_SIZE) {
            newEntities.push({
                id: `ground-${x}`,
                pos: { x, y: 500 },
                vel: { x: 0, y: 0 },
                width: UNIT_SIZE,
                height: UNIT_SIZE,
                type: 'block',
                blockType: 'ground'
            } as Block);
        }

        // Random Bricks and Monsters
        for (let x = 500; x < BOSS_TRIGGER_X - 500; x += UNIT_SIZE * 2) {
            if (Math.random() > 0.7) {
                newEntities.push({
                    id: `brick-${x}`,
                    pos: { x, y: 300 },
                    vel: { x: 0, y: 0 },
                    width: UNIT_SIZE,
                    height: UNIT_SIZE,
                    type: 'block',
                    blockType: Math.random() > 0.8 ? 'question' : 'brick',
                    hasItem: true
                } as Block);
            }

            if (Math.random() > 0.85) {
                newEntities.push({
                    id: `monster-${x}`,
                    pos: { x, y: 450 },
                    vel: { x: -2, y: 0 },
                    width: UNIT_SIZE,
                    height: UNIT_SIZE,
                    type: 'monster',
                    monsterType: 'ground',
                    direction: -1
                } as Monster);
            }
        }

        entities.current = newEntities;
        playerRef.current.pos = { x: 100, y: 300 };
        playerRef.current.vel = { x: 0, y: 0 };
        cameraX.current = 0;
        bossActive.current = false;
        gameActive.current = true;
    }, [stage]);

    // Game Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        let lastShootTime = 0;

        const shoot = () => {
            bullets.current.push({
                id: `bullet-${Date.now()}`,
                pos: { x: playerRef.current.pos.x + playerRef.current.width, y: playerRef.current.pos.y + 20 },
                vel: { x: BULLET_SPEED, y: 0 },
                width: 10,
                height: 10,
                type: 'bullet'
            });
        };

        const spawnBoss = () => {
            if (bossActive.current) return;
            bossActive.current = true;
            entities.current.push({
                id: 'boss',
                pos: { x: BOSS_TRIGGER_X + 200, y: 300 },
                vel: { x: -3, y: 3 },
                width: BOSS_SIZE,
                height: BOSS_SIZE,
                type: 'boss',
                hp: 10 * stageRef.current,
            } as Entity);
        };

        const loop = (time: number) => {
            if (!gameActive.current) return;

            // -- 1. INPUT --
            if (keys.current['ArrowLeft'] || keys.current['KeyA']) {
                playerRef.current.vel.x = -MOVE_SPEED;
            } else if (keys.current['ArrowRight'] || keys.current['KeyD']) {
                playerRef.current.vel.x = MOVE_SPEED;
            } else {
                playerRef.current.vel.x = 0;
            }

            if ((keys.current['ArrowUp'] || keys.current['KeyW'] || keys.current['KeyA']) && onGround.current) {
                playerRef.current.vel.y = JUMP_FORCE;
                onGround.current = false;
            }

            if (keys.current['KeyS'] && time - lastShootTime > 300) {
                shoot();
                lastShootTime = time;
            }

            // -- 2. PHYSICS & COLLISION --
            const p = playerRef.current;
            p.vel.y += GRAVITY;
            p.pos.x += p.vel.x;
            p.pos.y += p.vel.y;

            if (p.pos.x < 0) p.pos.x = 0;
            if (p.pos.x > BOSS_TRIGGER_X && !bossActive.current) {
                spawnBoss();
            }

            onGround.current = false;

            entities.current.forEach(e => {
                if (e.type === 'block') {
                    if (p.pos.x < e.pos.x + e.width &&
                        p.pos.x + p.width > e.pos.x &&
                        p.pos.y < e.pos.y + e.height &&
                        p.pos.y + p.height > e.pos.y) {

                        if (p.vel.y > 0 && p.pos.y + p.height - p.vel.y <= e.pos.y) {
                            p.pos.y = e.pos.y - p.height;
                            p.vel.y = 0;
                            onGround.current = true;
                        }
                        else if (p.vel.y < 0 && p.pos.y - p.vel.y >= e.pos.y + e.height) {
                            p.pos.y = e.pos.y + e.height;
                            p.vel.y = 0;
                            if (e.type === 'block' && (e as Block).blockType === 'question') {
                                actionsRef.current.addScore(100);
                                (e as Block).blockType = 'brick';
                            }
                        }
                    }
                }

                if (e.type === 'monster') {
                    e.pos.x += e.vel.x;
                    if (e.pos.x < 0 || e.pos.x > STAGE_LENGTH) e.vel.x *= -1;

                    if (p.pos.x < e.pos.x + e.width &&
                        p.pos.x + p.width > e.pos.x &&
                        p.pos.y < e.pos.y + e.height &&
                        p.pos.y + p.height > e.pos.y) {

                        if (p.vel.y > 0 && p.pos.y + p.height - p.vel.y <= e.pos.y + 10) {
                            entities.current = entities.current.filter(ent => ent.id !== e.id);
                            p.vel.y = -10;
                            actionsRef.current.addScore(200);
                        } else {
                            actionsRef.current.setHP(hp - 1); // Note: this uses closure 'hp' which is fine since the loop restarts when hp changes, OR use functional update in store
                            p.pos.x -= 100;
                        }
                    }
                }

                if (e.type === 'boss') {
                    e.pos.x += e.vel.x;
                    e.pos.y += e.vel.y;
                    if (e.pos.y < 50 || e.pos.y > 450) e.vel.y *= -1;
                    if (e.pos.x < BOSS_TRIGGER_X || e.pos.x > STAGE_LENGTH - BOSS_SIZE) e.vel.x *= -1;

                    if (p.pos.x < e.pos.x + e.width &&
                        p.pos.x + p.width > e.pos.x &&
                        p.pos.y < e.pos.y + e.height &&
                        p.pos.y + p.height > e.pos.y) {
                        actionsRef.current.setHP(hp - 1);
                        p.pos.x -= 200;
                    }
                }
            });

            bullets.current.forEach(b => {
                b.pos.x += b.vel.x;
                const boss = entities.current.find(ent => ent.type === 'boss');
                if (boss && b.pos.x < boss.pos.x + boss.width &&
                    b.pos.x + b.width > boss.pos.x &&
                    b.pos.y < boss.pos.y + boss.height &&
                    b.pos.y + b.height > boss.pos.y) {

                    boss.hp = (boss.hp || 0) - 1;
                    bullets.current = bullets.current.filter(bul => bul.id !== b.id);
                    if (boss.hp <= 0) {
                        entities.current = entities.current.filter(ent => ent.id !== boss.id);
                        actionsRef.current.addScore(5000);
                        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                        gameActive.current = false;
                        actionsRef.current.setScreen('victory');
                    }
                }
            });
            bullets.current = bullets.current.filter(b => b.pos.x < cameraX.current + 1200);

            cameraX.current = Math.max(cameraX.current, p.pos.x - 400);

            // -- 3. RENDER --
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(-cameraX.current, 0);

            entities.current.forEach(e => {
                if (e.type === 'block') {
                    const blk = e as Block;
                    ctx.fillStyle = blk.blockType === 'ground' ? '#5D4037' : (blk.blockType === 'question' ? '#FFD600' : '#8D6E63');
                    ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
                    if (blk.blockType === 'question') {
                        ctx.fillStyle = 'white';
                        ctx.font = '24px Arial';
                        ctx.fillText('?', e.pos.x + 18, e.pos.y + 35);
                    }
                } else if (e.type === 'monster') {
                    ctx.fillStyle = '#E53935';
                    ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
                } else if (e.type === 'boss') {
                    ctx.fillStyle = '#1A237E';
                    ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
                    ctx.fillStyle = 'red';
                    ctx.fillRect(e.pos.x, e.pos.y - 40, e.width, 10);
                    ctx.fillStyle = 'green';
                    ctx.fillRect(e.pos.x, e.pos.y - 40, (e.hp! / (10 * stageRef.current)) * e.width, 10);
                }
            });

            ctx.fillStyle = 'white';
            bullets.current.forEach(b => {
                ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 5, 0, Math.PI * 2); ctx.fill();
            });

            ctx.fillStyle = '#D32F2F';
            ctx.fillRect(p.pos.x, p.pos.y + 30, p.width, p.height - 30);

            if (faceImage.current) {
                ctx.save();
                ctx.beginPath(); ctx.arc(p.pos.x + 25, p.pos.y + 25, 25, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(faceImage.current, p.pos.x, p.pos.y, 50, 50);
                ctx.restore();
            } else {
                ctx.fillStyle = '#FFCCBC';
                ctx.beginPath(); ctx.arc(p.pos.x + 25, p.pos.y + 25, 25, 0, Math.PI * 2); ctx.fill();
            }

            ctx.restore();

            // HUD
            ctx.fillStyle = 'black';
            ctx.font = 'bold 24px Outfit';
            ctx.fillText(`STAGE: ${stageRef.current}`, 20, 40);
            ctx.fillText(`SCORE: ${score}`, 20, 70);
            ctx.fillText(`${'❤️'.repeat(hp)}`, 20, 100);

            if (hp <= 0) {
                gameActive.current = false;
                actionsRef.current.setScreen('gameover');
            }

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [hp, score, keys]);

    return (
        <div className="game-container">
            <canvas ref={canvasRef} width={1000} height={600} className="rounded-xl shadow-2xl border-4 border-white/20 bg-sky-200" />
        </div>
    );
};
