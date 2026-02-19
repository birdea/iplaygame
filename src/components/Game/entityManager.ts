import type { Entity, GroundItem, Effect } from '../../types';
import { BULLET_SPEED, GRAVITY } from '../../constants';
import { aabbOverlap } from './physics';
import { createMonster } from './stageGenerator';
import { GAME_STRATEGY } from './GameStrategy';

const { ITEMS, SCORE, MONSTERS, PLAYER, BOSS } = GAME_STRATEGY;

/** Create a player bullet */
export function createBullet(player: Entity, isBigBullet: boolean): Entity {
    return {
        id: `bullet-${Date.now()}-${Math.random()}`,
        pos: { x: player.pos.x + player.width, y: player.pos.y + 20 },
        vel: { x: BULLET_SPEED * (isBigBullet ? 1.2 : 1), y: 0 },
        width: isBigBullet ? 30 : 12,
        height: isBigBullet ? 30 : 12,
        type: 'bullet',
        damage: isBigBullet ? 2 : 1,
    };
}

/** Spawn a ground item that pops out of a question block */
export function spawnGroundItem(
    block: Entity,
    powerup: GroundItem['powerup'],
): GroundItem {
    const goLeft = Math.random() < 0.5;
    return {
        id: `item-${Date.now()}-${Math.random()}`,
        pos: { x: block.pos.x + block.width / 2 - 12, y: block.pos.y - 28 },
        vel: { x: goLeft ? -ITEMS.ROAM_SPEED : ITEMS.ROAM_SPEED, y: ITEMS.POP_VELOCITY_Y },
        width: 24 * (ITEMS.SIZE_MULTIPLIER || 1),
        height: 24 * (ITEMS.SIZE_MULTIPLIER || 1),
        powerup,
        spawnedAt: Date.now(),
        isPopping: true,
    };
}

export function getRandomItemType(): 'bigBullet' | 'fastRun' | 'hp' | 'shield' | 'ammo' {
    const rand = Math.random();
    const { BIG_BULLET, FAST_RUN, SHIELD, AMMO } = ITEMS.DROP_WEIGHTS;
    if (rand < BIG_BULLET) return 'bigBullet';
    if (rand < BIG_BULLET + FAST_RUN) return 'fastRun';
    if (rand < BIG_BULLET + FAST_RUN + SHIELD) return 'shield';
    if (rand < BIG_BULLET + FAST_RUN + SHIELD + AMMO) return 'ammo';
    return 'hp';
}

export interface GroundItemUpdateResult {
    groundItems: GroundItem[];
    collected: GroundItem['powerup'] | null;
}

/**
 * Update all ground items: apply gravity, bounce off walls, expire after 10 s,
 * and detect collection by the player.
 */
export function updateGroundItems(
    items: GroundItem[],
    player: Entity,
    entities: Entity[],
    cameraX: number,
): GroundItemUpdateResult {
    const now = Date.now();
    let collected: GroundItem['powerup'] | null = null;
    const surviving: GroundItem[] = [];

    const ITEM_GRAVITY = GRAVITY * ITEMS.GRAVITY_MULT;

    for (const item of items) {
        // Expire after 10 s
        if (now - item.spawnedAt >= ITEMS.LIFETIME_MS) continue;

        // Apply gravity
        item.vel.y += ITEM_GRAVITY;
        item.pos.y += item.vel.y;
        item.pos.x += item.vel.x;

        // Land on blocks
        for (const e of entities) {
            if (e.type !== 'block') continue;
            const itemEnt = { pos: item.pos, vel: item.vel, width: item.width, height: item.height } as Entity;
            if (!aabbOverlap(itemEnt, e)) continue;
            // Landing on top
            if (item.vel.y > 0 && item.pos.y + item.height - item.vel.y <= e.pos.y + 10) {
                item.pos.y = e.pos.y - item.height;
                item.vel.y = 0;
                item.isPopping = false;
            }
        }

        // Bounce off left/right screen edges (relative to camera)
        if (item.pos.x < cameraX) {
            item.pos.x = cameraX;
            item.vel.x = Math.abs(item.vel.x);
        } else if (item.pos.x + item.width > cameraX + 1000) {
            item.pos.x = cameraX + 1000 - item.width;
            item.vel.x = -Math.abs(item.vel.x);
        }

        // Random direction change
        if (!item.isPopping && Math.random() < ITEMS.DIR_CHANGE_CHANCE) {
            item.vel.x = -item.vel.x;
        }

        // Player collection check
        const playerRect = { pos: player.pos, vel: player.vel, width: player.width, height: player.height } as Entity;
        const itemRect = { pos: item.pos, vel: item.vel, width: item.width, height: item.height } as Entity;
        if (aabbOverlap(playerRect, itemRect)) {
            collected = item.powerup;
            continue; // remove from list
        }

        surviving.push(item);
    }

    return { groundItems: surviving, collected };
}

/** Helper to spawn impact sparks */
function spawnSparks(effects: Effect[], x: number, y: number, color: string = '#FF9800') {
    const count = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
        effects.push({
            id: `effect-${Date.now()}-${Math.random()}`,
            pos: { x, y },
            vel: {
                x: (Math.random() - 0.5) * 10,
                y: (Math.random() - 0.5) * 10,
            },
            life: 1.0,
            color,
            size: 2 + Math.random() * 4,
        });
    }
}

export interface MonsterUpdateResult {
    entities: Entity[];
    bossDefeated: boolean;
    scoreGained: number;
    lastBlockHitSwingTime: number;
}

/** Move all monsters and check monster-player collisions */
export function updateMonsters(
    entities: Entity[],
    player: Entity,
    takeDamage: (amount: number) => boolean,
    time: number,
    lastSwingTime: number = 0,
    lastBlockHitSwingTime: number = 0,
    effects: Effect[] = [],
    groundItems: GroundItem[] = [],
    cameraX: number = 0,
    CLUB_RANGE: number = 100,
    damage: number = 1,
    onBossHit?: (isTailHit: boolean) => void,
): MonsterUpdateResult {
    const toRemove = new Set<string>();
    const isSwinging = (time - lastSwingTime) < 500;
    let bossDefeated = false;
    let scoreGainedTotal = 0;
    let currentLastBlockHitSwingTime = lastBlockHitSwingTime;

    // Pre-calculate blocks for edge-check
    const blocks = entities.filter(e => e.type === 'block');

    for (const e of entities) {
        if (e.type !== 'monster' && e.type !== 'boss' && e.type !== 'block') continue;

        if (e.type === 'monster') {
            // Remove if far off screen (left)
            if (e.pos.x < cameraX - 200) {
                toRemove.add(e.id);
                continue;
            }
            e.pos.x += e.vel.x;
        }

        // 1. Club/Flail Attack check
        if (isSwinging) {
            const playerCX = player.pos.x + player.width / 2;
            const playerCY = player.pos.y + 30; // Attack center (top/shoulder area)
            const targetCX = e.pos.x + e.width / 2;
            const targetCY = e.pos.y + e.height / 2;

            const dx_center = targetCX - playerCX;
            const dy_center = targetCY - playerCY;
            const distSq = dx_center * dx_center + dy_center * dy_center;

            // Optimization: Skip if way out of range
            if (distSq > (CLUB_RANGE + 100) ** 2) continue;

            const angle = Math.atan2(dy_center, dx_center);

            const attackDir = player.attackDir || player.facing || 'right';
            const range = (GAME_STRATEGY.ATTACK as any)[attackDir.toUpperCase()] || GAME_STRATEGY.ATTACK.RIGHT;

            let isWithinDirection = false;
            if (attackDir === 'left') {
                const normAngle = angle < 0 ? angle + Math.PI * 2 : angle;
                isWithinDirection = normAngle >= range.MIN && normAngle <= range.MAX;
            } else {
                isWithinDirection = angle >= range.MIN && angle <= range.MAX;
            }

            // Hitbox distance check
            const dx = Math.abs(playerCX - targetCX) - e.width / 2;
            const dy = Math.abs(playerCY - targetCY) - e.height / 2;
            const distance = Math.sqrt(Math.max(0, dx) ** 2 + Math.max(0, dy) ** 2);

            if (distance < CLUB_RANGE && e.lastHitBySwing !== lastSwingTime && isWithinDirection) {
                if (e.type === 'block') {
                    const blk = e as any;
                    if (blk.blockType === 'brick' || blk.blockType === 'question') {
                        // Edge Check: Only leftmost or rightmost tiles in a platform can be broken by weapon
                        const hasLeft = blocks.some(b => b.id !== e.id && b.pos.y === e.pos.y && Math.abs(b.pos.x - (e.pos.x - e.width)) < 5);
                        const hasRight = blocks.some(b => b.id !== e.id && b.pos.y === e.pos.y && Math.abs(b.pos.x - (e.pos.x + e.width)) < 5);

                        const isEdge = !hasLeft || !hasRight;

                        if (isEdge) {
                            // Only 1 block hit per swing
                            if (currentLastBlockHitSwingTime === lastSwingTime) continue;

                            blk.lastHitBySwing = lastSwingTime;
                            blk.hitCount = (blk.hitCount || 0) + 1;
                            currentLastBlockHitSwingTime = lastSwingTime;
                            spawnSparks(effects, targetCX, targetCY, '#795548');

                            if (blk.hitCount >= GAME_STRATEGY.STAGE.PLATFORMS.BLOCK_MAX_HITS) {
                                toRemove.add(e.id);
                                // Destruction by weapon: Only question blocks drop items
                                if (blk.blockType === 'question') {
                                    const powerup = getRandomItemType();
                                    groundItems.push(spawnGroundItem(blk, powerup));
                                }
                            }
                            // Flail stops at block
                            continue;
                        }
                    }
                } else {
                    // Monster or Boss hit
                    e.lastHitBySwing = lastSwingTime;
                    e.hp = (e.hp || 1) - damage;
                    spawnSparks(effects, targetCX, targetCY, e.type === 'boss' ? '#FFEB3B' : '#FF5722');

                    if (e.type === 'boss' && onBossHit) {
                        const centerX = e.pos.x + e.width / 2;
                        // If facing left, head is left, tail is right. Hit from right = tail hit.
                        const isTailHit = (e.facing === 'left' && playerCX > centerX) ||
                            (e.facing === 'right' && playerCX < centerX);
                        onBossHit(isTailHit);
                    }

                    if (e.hp <= 0) {
                        toRemove.add(e.id);
                        if (e.type === 'monster') {
                            scoreGainedTotal += SCORE.MONSTER_KILL;
                        } else if (e.type === 'boss') {
                            scoreGainedTotal += SCORE.BOSS_KILL;
                            bossDefeated = true;
                        }
                    }
                    if (e.type === 'monster') continue;
                }
            }
        }

        if (e.type === 'monster') {
            // 2. Stomp from above
            const isCurrentlyOverlapping = aabbOverlap(player, e);
            if (isCurrentlyOverlapping && player.vel.y > 0 && player.pos.y + player.height - player.vel.y <= e.pos.y + 20) {
                e.hp = (e.hp || 1) - 1;
                player.vel.y = -10;
                spawnSparks(effects, e.pos.x + e.width / 2, e.pos.y + e.height / 2, '#4CAF50');
                if (e.hp <= 0) {
                    toRemove.add(e.id);
                    scoreGainedTotal += SCORE.STOMP_KILL;
                }
                continue;
            }

            // 3. Normal Collision
            if (isCurrentlyOverlapping && aabbOverlap(player, e, PLAYER.HITBOX_RATIO)) {
                if (takeDamage(1)) {
                    player.pos.x -= PLAYER.KNOCKBACK_DISTANCE;
                    spawnSparks(effects, player.pos.x + player.width / 2, player.pos.y + player.height / 2, '#F44336');
                }
            }
        }
    }

    const resultEntities = toRemove.size === 0
        ? entities
        : entities.filter(e => !toRemove.has(e.id));

    return {
        entities: resultEntities,
        bossDefeated,
        scoreGained: scoreGainedTotal,
        lastBlockHitSwingTime: currentLastBlockHitSwingTime
    };
}

export interface BulletCollisionResult {
    entities: Entity[];
    bullets: Entity[];
    bossDefeated: boolean;
    scoreGained: number;
}

/** Process all bullet movements and collisions */
export function updateBullets(
    bulletList: Entity[],
    entityList: Entity[],
    player: Entity,
    takeDamage: (amount: number) => boolean,
    cameraX: number,
    effects: Effect[] = [],
    onBossHit?: (isTailHit: boolean) => void,
): BulletCollisionResult {
    const bulletsToRemove = new Set<string>();
    const entitiesToRemove = new Set<string>();
    let bossDefeated = false;
    let scoreGained = 0;

    for (const b of bulletList) {
        b.pos.x += b.vel.x;
        b.pos.y += b.vel.y;

        if (b.type === 'bullet') {
            // Check boss hit
            const boss = entityList.find(ent => ent.type === 'boss');
            if (boss && aabbOverlap(b, boss)) {
                boss.hp = (boss.hp || 0) - (b.damage || 1);
                bulletsToRemove.add(b.id);
                spawnSparks(effects, b.pos.x, b.pos.y, '#FFEB3B');

                if (onBossHit) {
                    const centerX = boss.pos.x + boss.width / 2;
                    const isTailHit = (boss.facing === 'left' && b.pos.x > centerX) ||
                        (boss.facing === 'right' && b.pos.x < centerX);
                    onBossHit(isTailHit);
                }
                if (boss.hp! <= 0) {
                    entitiesToRemove.add(boss.id);
                    scoreGained += SCORE.BOSS_KILL;
                    bossDefeated = true;
                }
            }

            // Check monster hit
            for (const ent of entityList) {
                if (ent.type !== 'monster') continue;
                if (aabbOverlap(b, ent)) {
                    ent.hp = (ent.hp || 1) - (b.damage || 1);
                    bulletsToRemove.add(b.id);
                    spawnSparks(effects, b.pos.x, b.pos.y, '#FFCC80');
                    if (ent.hp <= 0) {
                        entitiesToRemove.add(ent.id);
                        scoreGained += SCORE.STOMP_KILL;
                    }
                }
            }
        } else if (b.type === 'boss-bullet') {
            if (aabbOverlap(b, player, BOSS.HITBOX_RATIO)) {
                if (takeDamage(b.damage || 1)) {
                    bulletsToRemove.add(b.id);
                    player.pos.x -= PLAYER.KNOCKBACK_DISTANCE / 2;
                    spawnSparks(effects, b.pos.x, b.pos.y, '#F44336');
                }
            }
        }
    }

    // Filter out destroyed entities and bullets, plus off-screen bullets
    const entities = entitiesToRemove.size > 0
        ? entityList.filter(e => !entitiesToRemove.has(e.id))
        : entityList;

    const bullets = bulletList
        .filter(b => !bulletsToRemove.has(b.id))
        .filter(b => b.pos.x > cameraX - 100 && b.pos.x < cameraX + 1200);

    return { entities, bullets, bossDefeated, scoreGained };
}

/** Update effects (sparks) life and position */
export function updateEffects(effects: Effect[]): Effect[] {
    return effects.filter(eff => {
        eff.pos.x += eff.vel.x;
        eff.pos.y += eff.vel.y;
        eff.vel.y += 0.2; // slight gravity
        eff.life -= 0.05; // fade out
        return eff.life > 0;
    });
}

/** Periodically spawn a monster ahead of the player/camera */
export function spawnContinuousMonster(
    entities: Entity[],
    cameraX: number,
    stage: number,
    time: number,
    lastSpawnTime: { current: number }
): void {
    const baseInterval = Math.max(MONSTERS.MIN_SPAWN_INTERVAL_MS, MONSTERS.BASE_SPAWN_INTERVAL_MS - stage * 200);
    const SPAWN_INTERVAL = baseInterval / Math.pow(MONSTERS.SPAWN_FREQ_SCALING, stage - 1);

    if (time - lastSpawnTime.current > SPAWN_INTERVAL) {
        lastSpawnTime.current = time;
        const spawnX = cameraX + MONSTERS.SPAWN_OFFSET_X;
        const monsterSpeed = 2 + (stage - 1) * MONSTERS.SPEED_SCALING_FACTOR;
        entities.push(createMonster(spawnX, monsterSpeed));
    }
}

