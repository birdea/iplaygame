import type { Entity, GroundItem, Effect } from '../../types';
import { BULLET_SPEED, GRAVITY } from '../../constants';
import { aabbOverlap } from './physics';
import { createMonster } from './stageGenerator';

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

const ITEM_LIFETIME_MS = 10_000;
const ITEM_GRAVITY = GRAVITY * 0.6;
const ITEM_ROAM_SPEED = 1.5;
const ITEM_POP_VEL_Y = -12; // initial upward burst

/** Spawn a ground item that pops out of a question block */
export function spawnGroundItem(
    block: Entity,
    powerup: GroundItem['powerup'],
): GroundItem {
    const goLeft = Math.random() < 0.5;
    return {
        id: `item-${Date.now()}-${Math.random()}`,
        pos: { x: block.pos.x + block.width / 2 - 12, y: block.pos.y - 28 },
        vel: { x: goLeft ? -ITEM_ROAM_SPEED : ITEM_ROAM_SPEED, y: ITEM_POP_VEL_Y },
        width: 24,
        height: 24,
        powerup,
        spawnedAt: Date.now(),
        isPopping: true,
    };
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

    for (const item of items) {
        // Expire after 10 s
        if (now - item.spawnedAt >= ITEM_LIFETIME_MS) continue;

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

        // Random direction change every ~2 s
        if (!item.isPopping && Math.random() < 0.008) {
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
}

/** Move all monsters and check monster-player collisions */
export function updateMonsters(
    entities: Entity[],
    player: Entity,
    takeDamage: (amount: number) => boolean,
    addScore: (amount: number) => void,
    time: number,
    lastSwingTime: number = 0,
    effects: Effect[] = [],
    cameraX: number = 0,
    CLUB_RANGE: number = 100,
    damage: number = 1,
): MonsterUpdateResult {
    const toRemove = new Set<string>();
    const isSwinging = (time - lastSwingTime) < 500;
    let bossDefeated = false;
    let scoreGainedTotal = 0;

    for (const e of entities) {
        if (e.type !== 'monster' && e.type !== 'boss') continue;

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
            const monsterCX = e.pos.x + e.width / 2;
            const monsterCY = e.pos.y + e.height / 2;

            // Point-to-Rectangle distance: 
            // Calculate distance from player's attack center to the nearest point on the monster's hitbox
            const dx = Math.abs(playerCX - monsterCX) - e.width / 2;
            const dy = Math.abs(playerCY - monsterCY) - e.height / 2;
            const distance = Math.sqrt(Math.max(0, dx) ** 2 + Math.max(0, dy) ** 2);

            // Use e.lastHitBySwing to prevent multi-hits in one swing
            if (distance < CLUB_RANGE && e.lastHitBySwing !== lastSwingTime) {
                e.lastHitBySwing = lastSwingTime;
                e.hp = (e.hp || 1) - damage;
                spawnSparks(effects, e.pos.x + e.width / 2, e.pos.y + e.height / 2, e.type === 'boss' ? '#FFEB3B' : '#FF5722');

                if (e.hp <= 0) {
                    toRemove.add(e.id);
                    if (e.type === 'monster') {
                        scoreGainedTotal += 300;
                    } else if (e.type === 'boss') {
                        scoreGainedTotal += 5000;
                        bossDefeated = true;
                    }
                }
                if (e.type === 'monster') continue; // Only for monsters, boss stays
            }
        }

        if (e.type === 'boss') continue; // Boss doesn't do stomp/damage here, handled in GameCanvas

        // 2. Stomp from above (Check this WITHOUT the 0.8 ratio for easier stomping)
        const isCurrentlyOverlapping = aabbOverlap(player, e);
        if (isCurrentlyOverlapping && player.vel.y > 0 && player.pos.y + player.height - player.vel.y <= e.pos.y + 20) {
            e.hp = (e.hp || 1) - 1;
            player.vel.y = -10;
            spawnSparks(effects, e.pos.x + e.width / 2, e.pos.y + e.height / 2, '#4CAF50');
            if (e.hp <= 0) {
                toRemove.add(e.id);
                addScore(200);
            }
            continue; // Successfully stomped, don't take damage
        }

        // 3. Normal Collision (Take damage) - Use 0.8 ratio for fairer hits
        if (isCurrentlyOverlapping && aabbOverlap(player, e, 0.8)) {
            if (takeDamage(1)) player.pos.x -= 100;
        }
    }

    const resultEntities = toRemove.size === 0
        ? entities
        : entities.filter(e => !toRemove.has(e.id));

    return {
        entities: resultEntities,
        bossDefeated,
        scoreGained: scoreGainedTotal
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
                if (boss.hp! <= 0) {
                    entitiesToRemove.add(boss.id);
                    scoreGained += 5000;
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
                        scoreGained += 200;
                    }
                }
            }
        } else if (b.type === 'boss-bullet') {
            if (aabbOverlap(b, player, 0.8)) {
                if (takeDamage(1)) {
                    bulletsToRemove.add(b.id);
                    player.pos.x -= 50;
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
    const SPAWN_INTERVAL = Math.max(1000, 3000 - stage * 200); // Faster at higher stages
    if (time - lastSpawnTime.current > SPAWN_INTERVAL) {
        lastSpawnTime.current = time;
        const spawnX = cameraX + 1100; // Just off screen to the right
        const monsterSpeed = 2 + (stage - 1) * 1.5;
        entities.push(createMonster(spawnX, monsterSpeed));
    }
}
