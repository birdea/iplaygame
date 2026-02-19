import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useInputs } from '../../hooks/useInputs';
import {
    MOVE_SPEED, JUMP_FORCE, getBossTriggerX, AUTO_SCROLL_SPEED,
    CANVAS_WIDTH, CANVAS_HEIGHT,
} from '../../constants';
import type { Block, Entity } from '../../types';
import confetti from 'canvas-confetti';
import { MobileControls } from '../UI/MobileControls';
import { Pause } from 'lucide-react';

// Extracted game modules
import { applyVerticalPhysics, applyHorizontalPhysics, aabbOverlap } from './physics';
import { generateStage, spawnBossPlatform } from './stageGenerator';
import {
    drawBackground, drawBlock, drawDragon, drawPlayer,
    drawMonster, drawBullets, drawGroundItems, drawBossHPBar, drawMinimap, drawEffects,
    drawBossWarning, drawDamageVignette,
} from './renderer';
import { createBossEntity, updateBoss } from './bossAI';
import {
    createBullet, updateMonsters, updateBullets, spawnGroundItem,
    getRandomItemType, updateGroundItems, updateEffects, spawnContinuousMonster
} from './entityManager';
import { createInitialGameState, createGameActions } from './gameState';
import { AMMO_REFILL, SHIELD_REFILL, MINIMAP_WIDTH, MINIMAP_HEIGHT } from '../../constants';
import { GAME_STRATEGY } from './GameStrategy';
import {
    resumeAudio, playHitEnemy, playStompEnemy, playPlayerHurt,
    playShoot, playBossHit, playItemCollect,
} from './soundManager';

const { PHYSICS, PLAYER, STAGE, SCORE, ITEMS, BOSS } = GAME_STRATEGY;

import type { GameLoopState, GameActions } from './gameState';



export const GameCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { keys, setKey } = useInputs();

    // Zustand selectors – only UI-facing state
    const setScreen = useGameStore(s => s.setScreen);
    const faces = useGameStore(s => s.faces);
    const selectedFaceIndex = useGameStore(s => s.selectedFaceIndex);
    const selectedWeapon = useGameStore(s => s.selectedWeapon);

    // Read-only mirrors from Zustand (driven by syncFromLoop)
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
        gs.ammo = store.ammo;
        gs.shields = store.shields;
        gs.player.width = store.playerWidth;
        gs.player.height = store.playerHeight;
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
                aCharged: g.aCharged,
                ammo: g.ammo,
                shields: g.shields,
                shieldUntil: g.shieldUntil,
                blockCooldownUntil: g.blockCooldownUntil,
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
    const lastMonsterSpawnTime = useRef<number>(0);
    const lastBossPlatformTime = useRef<number>(0);

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

    // Audio Context 활성화 (브라우저는 첫 사용자 인터랙션 전까지 Audio 차단)
    // once: true를 사용하지 않음 — AudioContext는 포커스 이탈 후 재-suspended될 수 있음
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
            const p = gs.player;

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
                const speedMult = gs.powerups.fastRun > Date.now() ? PHYSICS.FAST_RUN_MULTIPLIER : 1;

                // Input handling
                p.vel.x = 0;
                if (keys.current['ArrowLeft']) {
                    p.vel.x = -MOVE_SPEED * speedMult;
                    p.facing = 'left';
                }
                if (keys.current['ArrowRight']) {
                    p.vel.x = MOVE_SPEED * speedMult;
                    p.facing = 'right';
                }

                if ((keys.current['ArrowUp'] || keys.current['Space']) && gs.onGround) {
                    p.vel.y = JUMP_FORCE;
                    gs.onGround = false;
                }

                // Crouching
                const currentStore = useGameStore.getState();
                const isCrouching = keys.current['ArrowDown'] && gs.onGround;
                const targetHeight = isCrouching
                    ? currentStore.playerHeight * (GAME_STRATEGY.PLAYER as any).CROUCH_HEIGHT_RATIO
                    : currentStore.playerHeight;

                if (p.height !== targetHeight) {
                    if (isCrouching) {
                        p.pos.y += (p.height - targetHeight); // Offset Y so it looks like crouching down
                    } else {
                        // Check if can stand up (no ceiling)
                        // For simplicity, just stand up for now, but in a real game we'd check collision above
                        p.pos.y -= (targetHeight - p.height);
                    }
                    p.height = targetHeight;
                }
                gs.isCrouching = isCrouching;

                // A key: Shoot Bullet (Special Attack)
                if (keys.current['KeyA'] && time - gs.lastShootTime > 300 && gs.ammo > 0) {
                    const isBig = gs.powerups.bigBullet > Date.now();
                    gs.bullets.push(createBullet(p, isBig));
                    gs.lastShootTime = time;
                    gs.ammo--;
                    playShoot();
                }

                // S/W keys: Flail Attacks (S=Basic, W=Upper)
                const CHARGE_DURATION = PLAYER.MEGA_SWING_CHARGE_MS;
                const isSwingingW = keys.current['KeyW'];
                const isSwingingS = keys.current['KeyS'];

                if (isSwingingS || isSwingingW) {
                    if (isSwingingW) p.attackDir = 'up';
                    else p.attackDir = p.facing || 'right';

                    if (gs.aChargeStart === 0) {
                        gs.aChargeStart = time;
                    } else if (time - gs.aChargeStart >= CHARGE_DURATION) {
                        gs.aCharged = true;
                    }
                } else {
                    if (gs.aCharged) {
                        // RELEASE MEGA SWING (Direction depends on what was being held)
                        // Note: p.attackDir should already be set above while holding
                        gs.lastMegaSwingTime = time;
                        gs.aCharged = false;
                    } else if (gs.aChargeStart !== 0) {
                        // Normal swing if released before full charge
                        if (time - gs.lastSwingTime > PLAYER.ATTACK_COOLDOWN_MS) {
                            gs.lastSwingTime = time;
                        }
                    }
                    gs.aChargeStart = 0;
                    gs.aCharged = false;
                }

                // D key: Use Shield (Defense) or Parry
                if (keys.current['KeyD'] && time - gs.lastShieldTime > 500) {
                    if (gs.shields > 0) {
                        if (actions.useShield()) {
                            gs.lastShieldTime = time;
                        }
                    } else {
                        if (actions.activateBlock()) {
                            gs.lastShieldTime = time;
                        }
                    }
                }

                // Physics
                const vertResult = applyVerticalPhysics(p, gs.entities);
                gs.onGround = vertResult.onGround;

                if (vertResult.hitBlock) {
                    const block = vertResult.hitBlock;
                    if (block.blockType === 'question' || block.blockType === 'brick') {
                        const wasQuestion = block.blockType === 'question';
                        block.hitCount = (block.hitCount || 0) + 1;

                        if (block.hitCount >= STAGE.PLATFORMS.BLOCK_MAX_HITS) {
                            if (wasQuestion) {
                                const powerup = getRandomItemType();
                                gs.groundItems.push(spawnGroundItem(block, powerup));
                                actions.addScore(SCORE.BLOCK_HIT);
                            }
                            gs.entities = gs.entities.filter(e => e.id !== block.id);
                        }
                    }
                }

                // Stomp logic
                if (vertResult.standingOnBlock && (vertResult.standingOnBlock.blockType === 'question' || vertResult.standingOnBlock.blockType === 'brick')) {
                    const block = vertResult.standingOnBlock as Block;
                    const wasQuestion = block.blockType === 'question';

                    // Stepping on it also increases hitCount
                    block.hitCount = (block.hitCount || 0) + 0.05; // Stepping on is slower destruction than headbutt

                    if (block.hitCount >= STAGE.PLATFORMS.BLOCK_MAX_HITS) {
                        if (wasQuestion) {
                            const powerup = getRandomItemType();
                            gs.groundItems.push(spawnGroundItem(block, powerup));
                            actions.addScore(SCORE.BLOCK_HIT);
                        }
                        gs.entities = gs.entities.filter(e => e.id !== block.id);
                    }
                }

                applyHorizontalPhysics(p, gs.entities);

                // --- Platform crumble logic ---
                // 2F+ platforms: blockType !== 'ground' (y < 500)
                const GROUND_Y = PHYSICS.GROUND_Y;
                const CRUMBLE_WARN_MS = STAGE.PLATFORMS.CRUMBLE_WARN_MS;
                const CRUMBLE_FALL_MS = STAGE.PLATFORMS.CRUMBLE_FALL_MS;
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
                if (p.pos.y > PHYSICS.DEATH_Y) {
                    actions.takeDamage(1);
                    const groundBlocks = gs.entities.filter(e => e.type === 'block' && (e as Block).blockType === 'ground');
                    const nextSafe = groundBlocks.find(e => e.pos.x > gs.cameraX + 100) || groundBlocks[0];
                    p.pos = nextSafe ? { x: nextSafe.pos.x, y: nextSafe.pos.y - 100 } : { x: gs.cameraX + 100, y: 300 };
                    p.vel = { x: 0, y: 0 };
                }

                // Camera boundary
                if (p.pos.x < gs.cameraX) p.pos.x = gs.cameraX;

                // Boss trigger warning
                const bossTriggerX = getBossTriggerX(gs.stage);
                if (p.pos.x > bossTriggerX - 500 && p.pos.x < bossTriggerX && !gs.bossActive) {
                    gs.bossWarning = true;
                } else {
                    gs.bossWarning = false;
                }

                // Boss trigger
                if (p.pos.x > bossTriggerX && !gs.bossActive) {
                    gs.bossActive = true;
                    gs.entities.push(createBossEntity(gs.stage));
                }

                // Monster logic
                spawnContinuousMonster(gs.entities, gs.cameraX, gs.stage, time, lastMonsterSpawnTime);

                const isMegaSwing = (time - gs.lastMegaSwingTime) < 700;
                const effectiveRange = isMegaSwing ? PLAYER.CLUB_RANGE * PLAYER.MEGA_SWING_RANGE_MULT : PLAYER.CLUB_RANGE;

                const onBossHit = (isTailHit: boolean) => {
                    if (isTailHit && gs.bossActive && !gs.bossTactics.turnAtTime) {
                        gs.bossTactics.turnAtTime = time + 500;
                        const bossEntity = gs.entities.find(e => e.type === 'boss');
                        if (bossEntity) {
                            gs.bossTactics.turnTargetFacing = bossEntity.facing === 'left' ? 'right' : 'left';
                        }
                    }
                };

                const monsterResult = updateMonsters(
                    gs.entities, p, (amt) => actions.takeDamage(amt),
                    time, isMegaSwing ? gs.lastMegaSwingTime : gs.lastSwingTime,
                    gs.lastBlockHitSwingTime,
                    gs.effects, gs.groundItems, gs.cameraX, effectiveRange,
                    isMegaSwing ? PLAYER.MEGA_SWING_DAMAGE_MULT : 1,
                    onBossHit,
                    () => {
                        // 퍽/쿵! — 몬스터 or 보스 타격
                        if (gs.bossActive) {
                            playBossHit();
                        } else {
                            playHitEnemy();
                        }
                    },
                    () => playStompEnemy(),  // 푹! — 밟기
                    () => playPlayerHurt(),  // 으악! — 플레이어 피격
                    isMegaSwing ? 700 : 500, // swingDuration 추가
                );
                gs.entities = monsterResult.entities;
                gs.lastBlockHitSwingTime = monsterResult.lastBlockHitSwingTime;
                if (monsterResult.scoreGained > 0) actions.addScore(monsterResult.scoreGained);
                if (monsterResult.bossDefeated) {
                    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
                    gs.gameActive = false;
                    setScreen('victory');
                }

                // Boss AI
                const boss = gs.entities.find(e => e.type === 'boss');
                if (boss) {
                    updateBoss(
                        boss, p, gs.bossTactics, time, gs.stage, gameActiveRef, gs.cameraX,
                        (bullet: Entity) => { gs.bullets.push(bullet); },
                    );
                    // Boss-player collision
                    if (aabbOverlap(p, boss, BOSS.HITBOX_RATIO)) {
                        if (actions.takeDamage(1)) {
                            p.pos.x -= PLAYER.KNOCKBACK_DISTANCE * 2;
                            playPlayerHurt(); // 으악! — 보스에 직접 충돌
                        }
                    }
                }

                // Bullet collisions
                const bulletResult = updateBullets(
                    gs.bullets, gs.entities, p,
                    (amt) => actions.takeDamage(amt),
                    gs.cameraX, gs.effects, onBossHit,
                    () => playHitEnemy(),    // 퍽! — 총알이 적 타격
                    () => playPlayerHurt(), // 으악! — 보스 불에 피격
                );
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
                    } else if (itemResult.collected === 'ammo') {
                        actions.addAmmo(AMMO_REFILL);
                    } else if (itemResult.collected === 'shield') {
                        actions.addShields(SHIELD_REFILL);
                    } else {
                        actions.activatePowerup(itemResult.collected as 'bigBullet' | 'fastRun', ITEMS.POWERUP_DURATION_MS);
                    }
                    actions.addScore(SCORE.ITEM_COLLECT);
                    playItemCollect(); // 딩동! — 아이템 획득
                }

                // Effects update
                gs.effects = updateEffects(gs.effects);

                // Update camera
                if (gs.bossActive) {
                    // Lock camera to the boss arena anchor
                    gs.cameraX = bossTriggerX;
                    // Limit player within this screen range (Anchor to +1000)
                    if (p.pos.x < gs.cameraX) p.pos.x = gs.cameraX;
                    if (p.pos.x > gs.cameraX + CANVAS_WIDTH - p.width) p.pos.x = gs.cameraX + CANVAS_WIDTH - p.width;

                    // Infinite platforms during boss fight
                    if (time - lastBossPlatformTime.current > (BOSS.PLATFORM_SPAWN_INTERVAL_MS || 2000)) {
                        spawnBossPlatform(gs.entities, gs.cameraX, STAGE.PLATFORMS.FLOOR_COUNT);
                        lastBossPlatformTime.current = time;
                    }
                } else {
                    gs.cameraX = Math.max(gs.cameraX, p.pos.x - PLAYER.CAMERA_FOLLOW_OFFSET);
                }

                // Move boss-spawned platforms left (optional, or just use their velocity)
                // Actually they have vel.x = -2 already.
                gs.entities.forEach(e => {
                    if (e.type === 'block' && e.vel.x !== 0) {
                        e.pos.x += e.vel.x;
                    }
                });
            }

            // -- 2. RENDER --
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

            // Bullets
            drawBullets(ctx, gs.bullets);

            // Ground items (popped from ? blocks)
            drawGroundItems(ctx, gs.groundItems);

            // Effects (Sparks)
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

            // HUD
            // drawHUD(ctx, {
            //     stage: gs.stage,
            //     score: gs.score,
            //     hp: gs.hp,
            //     ammo: gs.ammo,
            //     shields: gs.shields,
            //     powerups: gs.powerups,
            // });

            // Minimap
            const bossEnt = gs.entities.find(ev => ev.type === 'boss');
            drawMinimap(ctx, canvas.width, MINIMAP_WIDTH, MINIMAP_HEIGHT, gs.cameraX, p, bossEnt, gs.stage);

            if (gs.bossWarning) {
                drawBossWarning(ctx, time);
            }
            drawDamageVignette(ctx, gs.lastDamageTime, Date.now());

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
            <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="game-canvas rounded-xl shadow-2xl border-4 border-white/20"
            />

            {/* Top-Left Status Bar (HUD) */}
            <div className="hud-container">
                <button
                    onClick={() => actionsRef.current.togglePaused()}
                    className="pause-btn"
                    title="Pause Game (Esc)"
                >
                    <Pause size={20} fill="white" />
                </button>
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
