import React, { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useInputs } from '../../hooks/useInputs';
import {
    UNIT_SIZE, STAGE_LENGTH, BOSS_TRIGGER_X, BOSS_SIZE,
    GRAVITY, JUMP_FORCE, MOVE_SPEED, BULLET_SPEED,
    PLAYER_WIDTH, PLAYER_HEIGHT, AUTO_SCROLL_SPEED
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

    const monsterFaces = useRef<(HTMLImageElement | null)[]>([null, null, null]);

    useEffect(() => {
        if (faces[selectedFaceIndex]) {
            const img = new Image();
            img.src = faces[selectedFaceIndex];
            img.onload = () => { faceImage.current = img; };
        }

        const mFaces = [
            '/monster/monster_face_1.jpg',
            '/monster/monster_face_2.jpg',
            '/monster/monster_face_3.jpg'
        ];
        mFaces.forEach((src, idx) => {
            const img = new Image();
            img.src = src;
            img.onload = () => { monsterFaces.current[idx] = img; };
        });
    }, [faces, selectedFaceIndex]);

    const MINIMAP_WIDTH = 150;
    const MINIMAP_HEIGHT = 90;

    const nextId = useRef(0);
    const getUniqueId = (prefix: string) => `${prefix}-${nextId.current++}`;

    // Generate Stage
    useEffect(() => {
        const newEntities: Entity[] = [];
        nextId.current = 0;

        // Floor with Holes
        let x = 0;
        while (x < STAGE_LENGTH) {
            // Create a hole occasionally (after starting area)
            if (x > 1000 && x < BOSS_TRIGGER_X - 500 && Math.random() < 0.12) {
                const holeSize = Math.floor(Math.random() * 2) + 1; // 1 or 2 blocks wide
                x += holeSize * UNIT_SIZE;
                continue;
            }

            newEntities.push({
                id: getUniqueId('ground'),
                pos: { x, y: 500 },
                vel: { x: 0, y: 0 },
                width: UNIT_SIZE,
                height: UNIT_SIZE,
                type: 'block',
                blockType: 'ground'
            } as Block);
            x += UNIT_SIZE;
        }

        // Difficulty scaling
        const monsterChance = (0.15 + (stageRef.current - 1) * 0.1) * 2;
        const monsterSpeed = 2 + (stageRef.current - 1) * 1.5;

        // Monsters and Bricks
        for (let bx = 500; bx < BOSS_TRIGGER_X - 500; bx += UNIT_SIZE * 2) {
            if (Math.random() > 0.7) {
                newEntities.push({
                    id: getUniqueId('brick'),
                    pos: { x: bx, y: 300 },
                    vel: { x: 0, y: 0 },
                    width: UNIT_SIZE,
                    height: UNIT_SIZE,
                    type: 'block',
                    blockType: Math.random() > 0.5 ? 'question' : 'brick',
                } as Block);
            }

            if (Math.random() < monsterChance) {
                const rand = Math.random();
                let mType: 'skinny' | 'fat' | 'fly' = 'skinny';
                let mWidth = UNIT_SIZE;
                let mHeight = UNIT_SIZE;
                let mVelX = -monsterSpeed;
                let mPosY = 450;

                if (rand < 0.33) {
                    mType = 'skinny';
                    mWidth = UNIT_SIZE * 0.7;
                    mHeight = UNIT_SIZE * 0.9;
                    mVelX = -monsterSpeed * 1.8;
                } else if (rand < 0.66) {
                    mType = 'fat';
                    mWidth = UNIT_SIZE * 1.5;
                    mHeight = UNIT_SIZE * 1.2;
                    mVelX = -monsterSpeed * 0.7;
                    mPosY = 500 - mHeight;
                } else {
                    mType = 'fly';
                    mWidth = UNIT_SIZE;
                    mHeight = UNIT_SIZE * 0.8;
                    mVelX = -monsterSpeed * 1.2;
                    mPosY = 200 + Math.random() * 150;
                }

                newEntities.push({
                    id: getUniqueId('monster'),
                    pos: { x: bx, y: mPosY },
                    vel: { x: mVelX, y: 0 },
                    width: mWidth,
                    height: mHeight,
                    type: 'monster',
                    monsterType: mType,
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

    // Helper: Draw Dragon (Flipped to face Left)
    const drawDragon = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, time: number, state: string) => {
        ctx.save();
        ctx.translate(x + width / 2, y + height / 2);

        // FLIP: Face Left
        ctx.scale(-1, 1);

        // Dragon is now larger, adjusted scale
        const scale = Math.min(width, height) / 300;
        ctx.scale(scale, scale);

        const bodyColor = state === 'punch' ? '#FF1744' : '#1A237E';
        const strokeColor = '#FFFFFF';
        ctx.lineWidth = 5;

        const drawDiamond = (dx: number, dy: number, s: number, angle: number) => {
            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.6, 0);
            ctx.lineTo(0, s);
            ctx.lineTo(-s * 0.6, 0);
            ctx.closePath();
            ctx.fillStyle = bodyColor;
            ctx.strokeStyle = strokeColor;
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        };

        // Back diamond "spikes"
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(time / 200 + i) * 10;
            drawDiamond(-80 - i * 40, offset - 20, 30, Math.PI / 4);
            drawDiamond(-80 - i * 40, offset + 60, 30, -Math.PI / 4);
        }

        // 2. Draw Body (The circular part behind the head)
        ctx.beginPath();
        ctx.arc(-60, 20, 50, 0, Math.PI * 2);
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = strokeColor;
        ctx.fill();
        ctx.stroke();

        // 3. Draw Head (The Pac-man like part with mouth)
        ctx.save();
        const mouthOpen = Math.abs(Math.sin(time / 300)) * 0.5 + 0.2;
        ctx.beginPath();
        // Drawing a modified circle with a mouth gap
        ctx.arc(40, 0, 80, mouthOpen, Math.PI * 2 - mouthOpen);
        ctx.lineTo(40, 0);
        ctx.closePath();
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = strokeColor;
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = (state === 'fire' || state === 'punch') ? 'yellow' : 'white';
        ctx.beginPath();
        ctx.ellipse(60, -30, 20, 10, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(70, -35, 5, 0, Math.PI * 2);
        ctx.fill();

        // 4. Fire Breath
        if (state === 'fire') {
            ctx.save();
            ctx.translate(100, 0);
            ctx.fillStyle = '#FFEB3B'; // Bright flame
            for (let i = 0; i < 5; i++) {
                const fx = Math.random() * 60;
                const fy = (Math.random() - 0.5) * 50;
                ctx.beginPath();
                ctx.arc(fx, fy, 15 + Math.random() * 10, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
        ctx.restore();
    }, []);

    // Helper: Draw Player with Arms and Legs
    const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, p: Entity, time: number, isMoving: boolean, faceImg: HTMLImageElement | null) => {
        const { pos } = p;

        // 1. Walking Animation Factor
        const walkCycle = isMoving ? Math.sin(time / 100) : 0;
        const armCycle = isMoving ? Math.sin(time / 100 + Math.PI) : 0;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        // Body Color (Active Powerup check)
        const isBigBullet = statsRef.current.powerups.bigBullet > Date.now();
        const bodyColor = isBigBullet ? '#F44336' : '#D32F2F';

        // 2. Draw Legs
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';

        // Left Leg
        ctx.save();
        ctx.translate(15, 60);
        ctx.rotate(walkCycle * 0.5);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 20); ctx.stroke();
        ctx.restore();

        // Right Leg
        ctx.save();
        ctx.translate(35, 60);
        ctx.rotate(-walkCycle * 0.5);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 20); ctx.stroke();
        ctx.restore();

        // 3. Draw Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(0, 30, 50, 40);

        // 4. Draw Arms
        ctx.lineWidth = 8;
        // Left Arm
        ctx.save();
        ctx.translate(5, 40);
        ctx.rotate(armCycle * 0.5);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, 15); ctx.stroke();
        ctx.restore();

        // Right Arm
        ctx.save();
        ctx.translate(45, 40);
        ctx.rotate(-armCycle * 0.5);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 15); ctx.stroke();
        ctx.restore();

        // 5. Draw Head
        if (faceImg) {
            ctx.save();
            ctx.beginPath(); ctx.arc(25, 25, 25, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(faceImg, 0, 0, 50, 50);
            ctx.restore();
            // Head border
            ctx.strokeStyle = '#FFCCBC';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(25, 25, 25, 0, Math.PI * 2); ctx.stroke();
        } else {
            ctx.fillStyle = '#FFCCBC';
            ctx.beginPath(); ctx.arc(25, 25, 25, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }, []);

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
                    bullets.current.push({
                        id: `bullet-${Date.now()}-${Math.random()}`,
                        pos: { x: p.pos.x + p.width, y: p.pos.y + 20 },
                        vel: { x: BULLET_SPEED * (isBig ? 1.2 : 1), y: 0 },
                        width: isBig ? 30 : 12, height: isBig ? 30 : 12,
                        type: 'bullet', damage: isBig ? 2 : 1
                    });
                    lastShootTime.current = time;
                }

                // Vertical Move
                p.vel.y += GRAVITY;
                p.pos.y += p.vel.y;

                // Vertical Collisions
                onGround.current = false;
                entities.current.forEach(e => {
                    if (e.type === 'block') {
                        if (p.pos.x < e.pos.x + e.width && p.pos.x + p.width > e.pos.x &&
                            p.pos.y < e.pos.y + e.height && p.pos.y + p.height > e.pos.y) {
                            if (p.vel.y > 0 && p.pos.y + p.height - p.vel.y <= e.pos.y + 10) {
                                p.pos.y = e.pos.y - p.height; p.vel.y = 0; onGround.current = true;
                            } else if (p.vel.y < 0 && p.pos.y - p.vel.y >= e.pos.y + e.height - 10) {
                                p.pos.y = e.pos.y + e.height; p.vel.y = 0;
                                if ((e as Block).blockType === 'question') {
                                    (e as Block).blockType = 'brick';
                                    const rand = Math.random();
                                    if (rand < 0.25) actionsRef.current.activatePowerup('bigBullet', 30000);
                                    else if (rand < 0.5) actionsRef.current.activatePowerup('fastRun', 30000);
                                    else if (rand < 0.75) actionsRef.current.setHP(statsRef.current.hp + 1);
                                    actionsRef.current.addScore(100);
                                }
                            }
                        }
                    }
                });

                // Horizontal Move
                p.pos.x += p.vel.x;
                entities.current.forEach(e => {
                    if (e.type === 'block' && p.pos.x < e.pos.x + e.width && p.pos.x + p.width > e.pos.x &&
                        p.pos.y < e.pos.y + e.height && p.pos.y + p.height > e.pos.y) {
                        if (p.vel.x > 0) p.pos.x = e.pos.x - p.width;
                        else if (p.vel.x < 0) p.pos.x = e.pos.x + e.width;
                    }
                });

                // Fall Death
                if (p.pos.y > 600) {
                    actionsRef.current.setHP(statsRef.current.hp - 1);
                    const groundBlocks = entities.current.filter(e => e.type === 'block' && (e as Block).blockType === 'ground');
                    const nextSafe = groundBlocks.find(e => e.pos.x > cameraX.current + 100) || groundBlocks[0];
                    p.pos = nextSafe ? { x: nextSafe.pos.x, y: nextSafe.pos.y - 100 } : { x: cameraX.current + 100, y: 300 };
                    p.vel = { x: 0, y: 0 };
                }

                if (p.pos.x < cameraX.current) p.pos.x = cameraX.current;
                if (p.pos.x > BOSS_TRIGGER_X && !bossActive.current) {
                    bossActive.current = true;
                    entities.current.push({
                        id: 'boss', pos: { x: BOSS_TRIGGER_X + 600, y: 100 },
                        vel: { x: -2, y: 0 }, width: BOSS_SIZE, height: BOSS_SIZE,
                        type: 'boss', hp: 50 * stageRef.current, maxHP: 50 * stageRef.current,
                    } as Entity);
                }

                // Monster & Boss Logic
                entities.current.forEach(e => {
                    if (e.type === 'monster') {
                        e.pos.x += e.vel.x;
                        if (p.pos.x < e.pos.x + e.width && p.pos.x + p.width > e.pos.x &&
                            p.pos.y < e.pos.y + e.height && p.pos.y + p.height > e.pos.y) {
                            if (p.vel.y > 0 && p.pos.y + p.height - p.vel.y <= e.pos.y + 10) {
                                entities.current = entities.current.filter(ent => ent.id !== e.id);
                                p.vel.y = -10; actionsRef.current.addScore(200);
                            } else {
                                actionsRef.current.setHP(statsRef.current.hp - 1); p.pos.x -= 100;
                            }
                        }
                    } else if (e.type === 'boss') {
                        e.vel.y += GRAVITY * 0.4; e.pos.y += e.vel.y;
                        if (e.pos.y + e.height > 500) { e.pos.y = 500 - e.height; e.vel.y = 0; if (Math.random() < 0.02) e.vel.y = -12; }
                        const dist = e.pos.x - p.pos.x;
                        if (dist > 300) e.pos.x -= 2; else if (dist < 100) e.pos.x += 2;
                        const cooldown = 3500 / stageRef.current;
                        if (time - bossTactics.current.lastAttackTime > cooldown) {
                            bossTactics.current.state = 'fire'; bossTactics.current.lastAttackTime = time; bossTactics.current.attackDuration = 1000;
                            for (let i = 0; i < 3; i++) {
                                setTimeout(() => {
                                    if (!gameActive.current) return;
                                    bullets.current.push({
                                        id: `boss-fire-${Date.now()}-${i}`,
                                        pos: { x: e.pos.x, y: e.pos.y + e.height * 0.4 + i * 20 },
                                        vel: { x: -6 - Math.random() * 2, y: (Math.random() - 0.5) * 2 },
                                        width: 30, height: 30, type: 'boss-bullet'
                                    });
                                }, i * 300);
                            }
                        }
                        if (bossTactics.current.attackDuration > 0) {
                            bossTactics.current.attackDuration -= 16;
                            if (bossTactics.current.attackDuration <= 0) bossTactics.current.state = 'idle';
                        }
                        if (p.pos.x < e.pos.x + e.width && p.pos.x + p.width > e.pos.x &&
                            p.pos.y < e.pos.y + e.height && p.pos.y + p.height > e.pos.y) {
                            actionsRef.current.setHP(statsRef.current.hp - 1); p.pos.x -= 200;
                        }
                    }
                });

                // Bullets Logic
                bullets.current.forEach(b => {
                    b.pos.x += b.vel.x; b.pos.y += b.vel.y;
                    if (b.type === 'bullet') {
                        const boss = entities.current.find(ent => ent.type === 'boss');
                        if (boss && b.pos.x < boss.pos.x + boss.width && b.pos.x + b.width > boss.pos.x &&
                            b.pos.y < boss.pos.y + boss.height && b.pos.y + b.height > boss.pos.y) {
                            boss.hp = (boss.hp || 0) - (b.damage || 1); bullets.current = bullets.current.filter(bul => bul.id !== b.id);
                            if (boss.hp <= 0) {
                                entities.current = entities.current.filter(ent => ent.id !== boss.id);
                                actionsRef.current.addScore(5000); confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                                gameActive.current = false; actionsRef.current.setScreen('victory');
                            }
                        }
                        entities.current.forEach(ent => {
                            if (ent.type === 'monster' && b.pos.x < ent.pos.x + ent.width && b.pos.x + b.width > ent.pos.x &&
                                b.pos.y < ent.pos.y + ent.height && b.pos.y + b.height > ent.pos.y) {
                                entities.current = entities.current.filter(e => e.id !== ent.id);
                                bullets.current = bullets.current.filter(bul => bul.id !== b.id);
                                actionsRef.current.addScore(200);
                            }
                        });
                    } else if (b.type === 'boss-bullet') {
                        if (b.pos.x < p.pos.x + p.width && b.pos.x + b.width > p.pos.x &&
                            b.pos.y < p.pos.y + p.height && b.pos.y + b.height > p.pos.y) {
                            actionsRef.current.setHP(statsRef.current.hp - 1);
                            bullets.current = bullets.current.filter(bul => bul.id !== b.id);
                            p.pos.x -= 50;
                        }
                    }
                });
                bullets.current = bullets.current.filter(bul => bul.pos.x > cameraX.current - 100 && bul.pos.x < cameraX.current + 1200);
                cameraX.current = Math.max(cameraX.current, p.pos.x - 400);
            }

            // -- 2. RENDER --
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(-cameraX.current, 0);

            entities.current.forEach(e => {
                if (e.type === 'block') {
                    const blk = e as Block;
                    ctx.fillStyle = blk.blockType === 'ground' ? '#5D4037' : (blk.blockType === 'question' ? '#FFD600' : '#8D6E63');
                    ctx.fillRect(e.pos.x, e.pos.y, e.width, e.height);
                    if (blk.blockType === 'question') {
                        ctx.fillStyle = 'white'; ctx.font = '24px Arial'; ctx.fillText('?', e.pos.x + 18, e.pos.y + 35);
                    }
                } else if (e.type === 'monster') {
                    const m = e as Monster;
                    const mFace = monsterFaces.current[m.monsterType === 'skinny' ? 0 : m.monsterType === 'fat' ? 1 : 2];
                    ctx.save(); ctx.translate(e.pos.x, e.pos.y);
                    const walkCycle = Math.sin(time / 150);
                    const limbWidth = m.monsterType === 'skinny' ? 4 : (m.monsterType === 'fat' ? 12 : 6);
                    ctx.strokeStyle = '#333'; ctx.lineWidth = limbWidth; ctx.lineCap = 'round';
                    if (m.monsterType === 'fly') {
                        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.6;
                        const wingOsc = Math.sin(time / 50) * 20;
                        ctx.beginPath(); ctx.ellipse(-10, 20, 20, Math.max(0.1, 10 + wingOsc), Math.PI / 4, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.ellipse(e.width + 10, 20, 20, Math.max(0.1, 10 + wingOsc), -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
                        ctx.globalAlpha = 1.0;
                        ctx.beginPath(); ctx.moveTo(e.width * 0.3, e.height); ctx.lineTo(e.width * 0.3, e.height + 10); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(e.width * 0.7, e.height); ctx.lineTo(e.width * 0.7, e.height + 10); ctx.stroke();
                    } else {
                        ctx.save(); ctx.translate(e.width * 0.3, e.height); ctx.rotate(walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke(); ctx.restore();
                        ctx.save(); ctx.translate(e.width * 0.7, e.height); ctx.rotate(-walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 15); ctx.stroke(); ctx.restore();
                        ctx.save(); ctx.translate(0, e.height * 0.4); ctx.rotate(-walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-15, 10); ctx.stroke(); ctx.restore();
                        ctx.save(); ctx.translate(e.width, e.height * 0.4); ctx.rotate(walkCycle * 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(15, 10); ctx.stroke(); ctx.restore();
                    }
                    ctx.fillStyle = m.monsterType === 'skinny' ? '#FF5252' : (m.monsterType === 'fat' ? '#D32F2F' : '#7E57C2');
                    ctx.fillRect(0, 0, e.width, e.height);
                    if (mFace) ctx.drawImage(mFace, 2, 2, e.width - 4, e.height - 4);
                    ctx.restore();
                } else if (e.type === 'boss') {
                    drawDragon(ctx, e.pos.x, e.pos.y, e.width, e.height, time, bossTactics.current.state);
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(e.pos.x, e.pos.y - 40, e.width, 10);
                    const hpWidth = Math.max(0, (e.hp! / (e.maxHP || 100)) * e.width);
                    ctx.fillStyle = '#4CAF50'; ctx.fillRect(e.pos.x, e.pos.y - 40, hpWidth, 10);
                }
            });

            bullets.current.forEach(b => {
                ctx.fillStyle = b.type === 'boss-bullet' ? '#FFD700' : 'white';
                ctx.beginPath(); ctx.arc(b.pos.x + b.width / 2, b.pos.y + b.height / 2, b.width / 2, 0, Math.PI * 2); ctx.fill();
                if (b.type === 'boss-bullet') {
                    ctx.fillStyle = 'rgba(255, 69, 0, 0.4)';
                    ctx.beginPath(); ctx.arc(b.pos.x + b.width + 5, b.pos.y + b.height / 2, b.width / 3, 0, Math.PI * 2); ctx.fill();
                }
            });

            const p = playerRef.current;
            const isMoving = !isPausedLoop && (keys.current['ArrowLeft'] || keys.current['KeyA'] || keys.current['ArrowRight'] || keys.current['KeyD']);
            drawPlayer(ctx, p, time, isMoving, faceImage.current);
            ctx.restore();

            const { hp: curHp, score: curScore, powerups: curPows } = statsRef.current;
            ctx.fillStyle = 'white'; ctx.font = 'bold 24px Outfit';
            ctx.fillText(`STAGE: ${stageRef.current}`, 20, 140);
            ctx.fillText(`SCORE: ${curScore}`, 20, 170);
            const safeHp = Math.max(0, Math.min(10, curHp || 0));
            if (safeHp > 0) ctx.fillText(`${'❤️'.repeat(safeHp)}`, 20, 110);

            if (curPows.bigBullet > Date.now()) {
                const sec = Math.ceil((curPows.bigBullet - Date.now()) / 1000);
                ctx.fillStyle = '#FFD600'; ctx.fillText(`BIG BULLET: ${sec}s`, 20, 210);
            }
            if (curPows.fastRun > Date.now()) {
                const sec = Math.ceil((curPows.fastRun - Date.now()) / 1000);
                ctx.fillStyle = '#00E676'; ctx.fillText(`FAST RUN: ${sec}s`, 20, 240);
            }

            // Minimap
            ctx.save();
            ctx.translate(canvas.width - MINIMAP_WIDTH - 20, 20);
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT); ctx.clip();
            const mScaleX = MINIMAP_WIDTH / STAGE_LENGTH;
            const mScaleY = MINIMAP_HEIGHT / 600;
            ctx.scale(mScaleX, mScaleY); ctx.translate(-cameraX.current, 0);
            ctx.fillStyle = '#5D4037'; ctx.fillRect(cameraX.current, 500, STAGE_LENGTH + 1000, 100);
            const bEnt = entities.current.find(ev => ev.type === 'boss');
            if (bEnt) { ctx.fillStyle = '#FF1744'; ctx.fillRect(bEnt.pos.x, bEnt.pos.y, bEnt.width, bEnt.height); }
            ctx.fillStyle = '#FFFFFF'; ctx.fillRect(p.pos.x, p.pos.y, p.width, p.height);
            ctx.restore();

            if (statsRef.current.hp <= 0) {
                gameActive.current = false; actionsRef.current.setScreen('gameover');
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
