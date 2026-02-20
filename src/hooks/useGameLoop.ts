import { useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import {
    MOVE_SPEED, JUMP_FORCE, getBossTriggerX, AUTO_SCROLL_SPEED,
    CANVAS_WIDTH, AMMO_REFILL, SHIELD_REFILL,
} from '../constants';
import type { Block, Entity } from '../types';
import confetti from 'canvas-confetti';

import { applyVerticalPhysics, applyHorizontalPhysics } from '../components/Game/physics';
import { generateStage, spawnBossPlatform } from '../components/Game/stageGenerator';
import { createBossEntity, updateBoss } from '../components/Game/bossAI';
import {
    createBullet, updateMonsters, updateBullets, spawnGroundItem,
    getRandomItemType, updateGroundItems, updateEffects, spawnContinuousMonster
} from '../components/Game/entityManager';
import { createInitialGameState, createGameActions } from '../components/Game/gameState';
import type { GameLoopState, GameActionsWithFlush } from '../components/Game/gameState';
import { GAME_STRATEGY } from '../config/GameStrategy';
import {
    playHitEnemy, playStompEnemy, playPlayerHurt,
    playShoot, playBossHit, playItemCollect,
} from '../components/Game/soundManager';

const { PHYSICS, PLAYER, STAGE, SCORE, ITEMS, BOSS } = GAME_STRATEGY;

export interface GameLoopRefs {
    gsRef: React.MutableRefObject<GameLoopState>;
    actionsRef: React.MutableRefObject<GameActionsWithFlush>;
    gameActiveRef: React.MutableRefObject<boolean>;
    lastMonsterSpawnTime: React.MutableRefObject<number>;
    lastBossPlatformTime: React.MutableRefObject<number>;
    initialPlayerDims: React.MutableRefObject<{ width: number; height: number }>;
}

export function useGameLoop() {
    const setScreen = useGameStore(s => s.setScreen);

    const gsRef = useRef<GameLoopState>(null!);
    const actionsRef = useRef<GameActionsWithFlush>(null!);
    const initialPlayerDims = useRef<{ width: number; height: number }>({ width: PLAYER.WIDTH, height: PLAYER.HEIGHT });
    const gameActiveRef = useRef(true);
    const lastMonsterSpawnTime = useRef<number>(0);
    const lastBossPlatformTime = useRef<number>(0);

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
        initialPlayerDims.current = { width: store.playerWidth, height: store.playerHeight };
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

    const update = (time: number, keys: Record<string, boolean>) => {
        const gs = gsRef.current;
        const actions = actionsRef.current;
        const p = gs.player;

        gameActiveRef.current = gs.gameActive;

        // -- INPUTS & PAUSE --
        if (keys['Escape'] && time - gs.lastEscTime > 300) {
            actions.togglePaused();
            gs.lastEscTime = time;
        }

        if (!gs.gameActive) return;

        if (!gs.isPaused) {
            // -- LOGIC UPDATES --
            if (!gs.bossActive) gs.cameraX += AUTO_SCROLL_SPEED;
            const speedMult = gs.powerups.fastRun > Date.now() ? PHYSICS.FAST_RUN_MULTIPLIER : 1;

            // Movement
            p.vel.x = 0;
            if (keys['ArrowLeft'] || keys['KeyA_Movement']) {
                p.vel.x = -MOVE_SPEED * speedMult;
                p.facing = 'left';
            }
            if (keys['ArrowRight'] || keys['KeyD_Movement']) {
                p.vel.x = MOVE_SPEED * speedMult;
                p.facing = 'right';
            }

            // Jump
            if ((keys['ArrowUp'] || keys['Space'] || keys['KeyW'] || keys['KeyE']) && gs.onGround) {
                p.vel.y = JUMP_FORCE;
                gs.onGround = false;
            }

            // Crouching
            const isCrouching = (keys['ArrowDown'] || keys['KeyS_Movement']) && gs.onGround;
            const targetHeight = isCrouching
                ? initialPlayerDims.current.height * PLAYER.CROUCH_HEIGHT_RATIO
                : initialPlayerDims.current.height;

            if (p.height !== targetHeight) {
                if (isCrouching) {
                    p.pos.y += (p.height - targetHeight);
                } else {
                    p.pos.y -= (targetHeight - p.height);
                }
                p.height = targetHeight;
            }
            gs.isCrouching = isCrouching;

            // --- WEAPON & SHIELD LOGIC ---
            const isHoldingD = keys['KeyD'];
            const isPressingAttack = keys['KeyA'] || keys['KeyS'] || keys['KeyF'];

            if (isHoldingD && isPressingAttack) {
                keys['KeyD'] = false;
            }

            const isShielding = keys['KeyD'];
            gs.isBlocking = isShielding;

            if (isShielding) {
                if (time - gs.lastShieldTime > 200) {
                    if (gs.shields > 0) {
                        if (actions.useShield()) {
                            gs.lastShieldTime = time;
                        }
                    }
                }
            } else {
                // Shoot
                if (keys['KeyA'] && time - gs.lastShootTime > 300 && gs.ammo > 0) {
                    const isBig = gs.powerups.bigBullet > Date.now();
                    gs.bullets.push(createBullet(p, isBig));
                    gs.lastShootTime = time;
                    gs.ammo--;
                    playShoot();
                }

                // Melee attacks
                const CHARGE_DURATION = PLAYER.MEGA_SWING_CHARGE_MS;
                const isChargingS = keys['KeyS'];
                const isSwingingF = keys['KeyF'];

                // Auto-fire
                if (time - gs.lastSwingTime > PLAYER.ATTACK_COOLDOWN_MS) {
                    const nearestMonster = gs.entities.find(e => {
                        if (e.type !== 'monster' && e.type !== 'boss') return false;
                        const dx = Math.abs(e.pos.x - p.pos.x);
                        return dx < PLAYER.CLUB_RANGE;
                    });
                    if (nearestMonster) {
                        p.attackDir = p.facing || 'right';
                        gs.lastSwingTime = time;
                    }
                }

                if (isChargingS || isSwingingF) {
                    p.attackDir = isSwingingF ? 'up' : (p.facing || 'right');
                    if (gs.aChargeStart === 0) {
                        gs.aChargeStart = time;
                    } else if (time - gs.aChargeStart >= CHARGE_DURATION) {
                        gs.aCharged = true;
                    }
                } else {
                    if (gs.aCharged) {
                        gs.lastMegaSwingTime = time;
                        gs.aCharged = false;
                    } else if (gs.aChargeStart !== 0) {
                        if (time - gs.lastSwingTime > PLAYER.ATTACK_COOLDOWN_MS) {
                            gs.lastSwingTime = time;
                        }
                    }
                    gs.aChargeStart = 0;
                    gs.aCharged = false;
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

            // Stomp on block
            if (vertResult.standingOnBlock && (vertResult.standingOnBlock.blockType === 'question' || vertResult.standingOnBlock.blockType === 'brick')) {
                const block = vertResult.standingOnBlock as Block;
                const wasQuestion = block.blockType === 'question';
                block.hitCount = (block.hitCount || 0) + 0.05;
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

            // Platform crumble logic
            const GROUND_Y = PHYSICS.GROUND_Y;
            const CRUMBLE_WARN_MS = STAGE.PLATFORMS.CRUMBLE_WARN_MS;
            const CRUMBLE_FALL_MS = STAGE.PLATFORMS.CRUMBLE_FALL_MS;
            const now = Date.now();
            const standingBlock = vertResult.standingOnBlock;

            gs.entities = gs.entities.filter(e => {
                if (e.type !== 'block') return true;
                const blk = e as Block;
                if (blk.blockType === 'ground' || blk.pos.y >= GROUND_Y) return true;

                const isStandingHere = standingBlock?.id === blk.id;
                if (isStandingHere) {
                    if (blk.standingStartTime === undefined) {
                        blk.standingStartTime = now;
                    }
                    const elapsed = now - blk.standingStartTime;
                    blk.isCrumbling = elapsed >= CRUMBLE_WARN_MS;
                    if (elapsed >= CRUMBLE_FALL_MS) {
                        return false;
                    }
                } else {
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
            gs.bossWarning = p.pos.x > bossTriggerX - 500 && p.pos.x < bossTriggerX && !gs.bossActive;

            // Boss trigger
            if (p.pos.x > bossTriggerX && !gs.bossActive) {
                gs.bossActive = true;
                gs.entities.push(createBossEntity(gs.stage));
            }

            // Monster spawning
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

            // Monster collisions
            const monsterResult = updateMonsters(
                gs.entities, p, (amt) => actions.takeDamage(amt),
                time, isMegaSwing ? gs.lastMegaSwingTime : gs.lastSwingTime,
                gs.lastBlockHitSwingTime,
                gs.effects, gs.groundItems, gs.cameraX, effectiveRange,
                isMegaSwing ? PLAYER.MEGA_SWING_DAMAGE_MULT : 1,
                onBossHit,
                () => {
                    if (gs.bossActive) {
                        playBossHit();
                    } else {
                        playHitEnemy();
                    }
                },
                () => playStompEnemy(),
                () => playPlayerHurt(),
                isMegaSwing ? 700 : 500,
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

                // Boss-player limb collision
                const bossConst = GAME_STRATEGY.BOSS;
                const center = { x: boss.pos.x + boss.width / 2, y: boss.pos.y + boss.height / 2 };
                const facingVal = gs.bossTactics.visualFacing;
                const scale = Math.min(boss.width, boss.height) / 300;
                const pCenterX = p.pos.x + p.width / 2;
                const pCenterY = p.pos.y + p.height / 2;

                const checkLimbHit = (localX: number, localY: number, radius: number) => {
                    const worldX = center.x + (localX * facingVal) * scale;
                    const worldY = center.y + (localY) * scale;
                    const dx = worldX - pCenterX;
                    const dy = worldY - pCenterY;
                    return Math.sqrt(dx * dx + dy * dy) < (radius * scale + Math.min(p.width, p.height) * 0.4);
                };

                let limbHit = false;
                const tx = -110;
                const ty = 20;
                const tsCount = bossConst.LIMBS.TAIL_SEGMENT_COUNT;
                const tsLen = bossConst.LIMBS.TAIL_SEGMENT_LENGTH;
                const tailBaseAngle = Math.PI;

                const tipScale = (gs.stage > 1 ? (1 + (gs.stage - 2) * 0.2) : 1) * 1.5;

                if (gs.stage > 1) {
                    let curX = tx, curY = ty;
                    for (let s = 0; s < tsCount; s++) {
                        const phase = time / 800 + s * 0.4;
                        const wave = Math.sin(phase) * 0.5;
                        const angle = tailBaseAngle + wave;

                        curX += Math.cos(angle) * tsLen;
                        curY += Math.sin(angle) * tsLen;
                    }

                    // Only check hitbox at the tip (Policy 1)
                    if (checkLimbHit(curX, curY, 25 * tipScale)) {
                        limbHit = true;
                    }
                }

                if (limbHit) {
                    if (actions.takeDamage(1)) {
                        p.pos.x -= PLAYER.KNOCKBACK_DISTANCE * 2;
                        playPlayerHurt();
                    }
                }
            }

            // Bullet collisions
            const bulletResult = updateBullets(
                gs.bullets, gs.entities, p,
                (amt) => actions.takeDamage(amt),
                gs.cameraX, gs.effects, onBossHit,
                () => playHitEnemy(),
                () => playPlayerHurt(),
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

            // Ground items
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
                playItemCollect();
            }

            // Effects
            gs.effects = updateEffects(gs.effects);

            // Camera
            if (gs.bossActive) {
                gs.cameraX = bossTriggerX;
                if (p.pos.x < gs.cameraX) p.pos.x = gs.cameraX;
                if (p.pos.x > gs.cameraX + CANVAS_WIDTH - p.width) p.pos.x = gs.cameraX + CANVAS_WIDTH - p.width;

                if (time - lastBossPlatformTime.current > (BOSS.PLATFORM_SPAWN_INTERVAL_MS || 2000)) {
                    spawnBossPlatform(gs.entities, gs.cameraX, STAGE.PLATFORMS.FLOOR_COUNT);
                    lastBossPlatformTime.current = time;
                }
            } else {
                gs.cameraX = Math.max(gs.cameraX, p.pos.x - PLAYER.CAMERA_FOLLOW_OFFSET);
            }

            // Move platforms with velocity
            gs.entities.forEach(e => {
                if (e.type === 'block' && e.vel.x !== 0) {
                    e.pos.x += e.vel.x;
                }
            });

            // Flush state to Zustand once per frame
            actions.flushSync();
        }

        // Death check
        if (gs.hp <= 0) {
            gs.gameActive = false;
            setScreen('gameover');
        }
    };

    return { gsRef, actionsRef, update };
}
