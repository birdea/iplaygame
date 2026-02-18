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
import { MobileControls } from '../UI/MobileControls';

export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { keys, setKey } = useInputs();
    const {
        stage, hp, score, powerups,
        setHP, addScore, setScreen, activatePowerup,
        faces, selectedFaceIndex
    } = useGameStore();

    // Stable refs for actions to avoid re-triggering effects
    const actionsRef = useRef({ setHP, addScore, setScreen, activatePowerup });
    useEffect(() => {
        actionsRef.current = { setHP, addScore, setScreen, activatePowerup };
    }, [setHP, addScore, setScreen, activatePowerup]);

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

    // Boss state
    const bossTactics = useRef({
        lastAttackTime: 0,
        state: 'idle' as 'idle' | 'punch' | 'fire',
        attackDuration: 0
    });

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
                    blockType: Math.random() > 0.5 ? 'question' : 'brick',
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
            const isBig = powerups.bigBullet > Date.now();
            bullets.current.push({
                id: `bullet-${Date.now()}`,
                pos: { x: playerRef.current.pos.x + playerRef.current.width, y: playerRef.current.pos.y + 20 },
                vel: { x: BULLET_SPEED * (isBig ? 1.2 : 1), y: 0 },
                width: isBig ? 24 : 10,
                height: isBig ? 24 : 10,
                type: 'bullet',
                damage: isBig ? 1.5 : 1
            });
        };

        const spawnBoss = () => {
            if (bossActive.current) return;
            bossActive.current = true;
            entities.current.push({
                id: 'boss',
                pos: { x: BOSS_TRIGGER_X + 400, y: 300 },
                vel: { x: -1, y: 0 },
                width: BOSS_SIZE,
                height: BOSS_SIZE,
                type: 'boss',
                hp: 20 * stageRef.current,
            } as Entity);
        };

        const loop = (time: number) => {
            if (!gameActive.current) return;

            // Powerup checks
            const speedMult = powerups.fastRun > Date.now() ? 1.5 : 1;

            // -- 1. INPUT --
            // Left/Right
            if (keys.current['ArrowLeft'] || keys.current['KeyA']) {
                playerRef.current.vel.x = -MOVE_SPEED * speedMult;
            } else if (keys.current['ArrowRight'] || keys.current['KeyD']) {
                playerRef.current.vel.x = MOVE_SPEED * speedMult;
            } else {
                playerRef.current.vel.x = 0;
            }

            // Jump: Up, W, or Space (Virtual A)
            if ((keys.current['ArrowUp'] || keys.current['KeyW'] || keys.current['Space']) && onGround.current) {
                playerRef.current.vel.y = JUMP_FORCE;
                onGround.current = false;
            }

            // Down: (Can be used for crouching or fast fall if implemented)
            if (keys.current['ArrowDown'] || keys.current['KeyS']) {
                // Currently no action for Down in this side-scroller
            }

            // S for Shoot
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
                                (e as Block).blockType = 'brick';
                                // Random Item Logic
                                const rand = Math.random();
                                if (rand < 0.25) { // bigBullet
                                    actionsRef.current.activatePowerup('bigBullet', 30000);
                                    actionsRef.current.addScore(100);
                                } else if (rand < 0.5) { // fastRun
                                    actionsRef.current.activatePowerup('fastRun', 30000);
                                    actionsRef.current.addScore(100);
                                } else if (rand < 0.75) { // HP +1
                                    actionsRef.current.setHP(hp + 1);
                                    actionsRef.current.addScore(100);
                                } else { // Nothing
                                    actionsRef.current.addScore(10);
                                }
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
                            actionsRef.current.setHP(hp - 1);
                            p.pos.x -= 100;
                        }
                    }
                }

                if (e.type === 'boss') {
                    const distToPlayer = e.pos.x - p.pos.x;

                    // Boss Movement: Approaches Player
                    if (distToPlayer > 150) {
                        e.pos.x -= 1.5;
                    } else if (distToPlayer < 100) {
                        e.pos.x += 1;
                    }

                    // Floating
                    e.pos.y = 300 + Math.sin(time / 500) * 50;

                    // Boss Attacks
                    if (time - bossTactics.current.lastAttackTime > 3000) {
                        const attackType = Math.random() > 0.5 ? 'punch' : 'fire';
                        bossTactics.current.state = attackType;
                        bossTactics.current.lastAttackTime = time;
                        bossTactics.current.attackDuration = 1000;

                        if (attackType === 'fire') {
                            // Spawn Boss Bullet (Fire)
                            bullets.current.push({
                                id: `boss-fire-${Date.now()}`,
                                pos: { x: e.pos.x - 20, y: e.pos.y + e.height / 2 },
                                vel: { x: -8, y: 0 },
                                width: 20,
                                height: 20,
                                type: 'boss-bullet'
                            });
                        }
                    }

                    if (bossTactics.current.attackDuration > 0) {
                        bossTactics.current.attackDuration -= 16;
                        if (bossTactics.current.attackDuration <= 0) {
                            bossTactics.current.state = 'idle';
                        }
                    }

                    // Punch Attack logic 
                    if (bossTactics.current.state === 'punch') {
                        // Boss lunges forward
                        e.pos.x -= 5;
                    }

                    if (p.pos.x < e.pos.x + e.width &&
                        p.pos.x + p.width > e.pos.x &&
                        p.pos.y < e.pos.y + e.height &&
                        p.pos.y + p.height > e.pos.y) {
                        actionsRef.current.setHP(hp - 1);
                        p.pos.x -= 200;
                    }
                }
            });

            // Bullet collisions
            bullets.current.forEach(b => {
                b.pos.x += b.vel.x;
                if (b.type === 'bullet') {
                    const boss = entities.current.find(ent => ent.type === 'boss');
                    if (boss && b.pos.x < boss.pos.x + boss.width &&
                        b.pos.x + b.width > boss.pos.x &&
                        b.pos.y < boss.pos.y + boss.height &&
                        b.pos.y + b.height > boss.pos.y) {

                        boss.hp = (boss.hp || 0) - (b.damage || 1);
                        bullets.current = bullets.current.filter(bul => bul.id !== b.id);
                        if (boss.hp <= 0) {
                            entities.current = entities.current.filter(ent => ent.id !== boss.id);
                            actionsRef.current.addScore(5000);
                            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                            gameActive.current = false;
                            actionsRef.current.setScreen('victory');
                        }
                    }
                    // Monster kill
                    entities.current.forEach(ent => {
                        if (ent.type === 'monster' && b.pos.x < ent.pos.x + ent.width &&
                            b.pos.x + b.width > ent.pos.x &&
                            b.pos.y < ent.pos.y + ent.height &&
                            b.pos.y + b.height > ent.pos.y) {
                            entities.current = entities.current.filter(e => e.id !== ent.id);
                            bullets.current = bullets.current.filter(bul => bul.id !== b.id);
                            actionsRef.current.addScore(200);
                        }
                    });
                } else if (b.type === 'boss-bullet') {
                    if (b.pos.x < p.pos.x + p.width &&
                        b.pos.x + b.width > p.pos.x &&
                        b.pos.y < p.pos.y + p.height &&
                        b.pos.y + b.height > p.pos.y) {
                        actionsRef.current.setHP(hp - 1);
                        bullets.current = bullets.current.filter(bul => bul.id !== b.id);
                        p.pos.x -= 50;
                    }
                }
            });
            bullets.current = bullets.current.filter(b => b.pos.x > cameraX.current - 100 && b.pos.x < cameraX.current + 1200);

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
                    ctx.fillStyle = bossTactics.current.state === 'punch' ? '#FF1744' : '#1A237E';
                    ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);

                    // Boss eye
                    ctx.fillStyle = 'yellow';
                    ctx.fillRect(e.pos.x + 20, e.pos.y + 30, 30, 10);

                    // HP Bar
                    ctx.fillStyle = 'red';
                    ctx.fillRect(e.pos.x, e.pos.y - 40, e.width, 10);
                    ctx.fillStyle = 'green';
                    ctx.fillRect(e.pos.x, e.pos.y - 40, (e.hp! / (20 * stageRef.current)) * e.width, 10);

                    if (bossTactics.current.state === 'fire') {
                        ctx.fillStyle = 'orange';
                        ctx.beginPath();
                        ctx.arc(e.pos.x - 10, e.pos.y + e.height / 2, 15, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });

            bullets.current.forEach(b => {
                ctx.fillStyle = b.type === 'boss-bullet' ? '#FF5722' : 'white';
                ctx.beginPath();
                ctx.arc(b.pos.x + b.width / 2, b.pos.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
                ctx.fill();
            });

            ctx.fillStyle = powerups.bigBullet > Date.now() ? '#F44336' : '#D32F2F';
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
            ctx.fillStyle = 'white';
            ctx.font = 'bold 24px Outfit';
            ctx.fillText(`STAGE: ${stageRef.current}`, 20, 140);
            ctx.fillText(`SCORE: ${score}`, 20, 170);
            ctx.fillText(`${'❤️'.repeat(hp)}`, 20, 110);

            // Powerup HUD
            if (powerups.bigBullet > Date.now()) {
                const sec = Math.ceil((powerups.bigBullet - Date.now()) / 1000);
                ctx.fillStyle = '#FFD600';
                ctx.fillText(`BIG BULLET: ${sec}s`, 20, 210);
            }
            if (powerups.fastRun > Date.now()) {
                const sec = Math.ceil((powerups.fastRun - Date.now()) / 1000);
                ctx.fillStyle = '#00E676';
                ctx.fillText(`FAST RUN: ${sec}s`, 20, 240);
            }

            if (hp <= 0) {
                gameActive.current = false;
                actionsRef.current.setScreen('gameover');
            }

            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [hp, score, powerups, keys]);

    return (
        <div className="game-container">
            <canvas ref={canvasRef} width={1000} height={600} className="rounded-xl shadow-2xl border-4 border-white/20 bg-sky-200" />
            <MobileControls setKey={setKey} />
        </div>
    );
};
