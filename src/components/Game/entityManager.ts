import type { Entity, GroundItem } from '../../types';
import { BULLET_SPEED, GRAVITY } from '../../constants';
import { aabbOverlap } from './physics';

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

        // Random direction change every ~2 s (1% chance per frame ≈ 60fps → ~0.6s avg)
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

/** Move all monsters and check monster-player collisions */
export function updateMonsters(
    entities: Entity[],
    player: Entity,
    takeDamage: (amount: number) => boolean,
    addScore: (amount: number) => void,
): Entity[] {
    const toRemove = new Set<string>();

    for (const e of entities) {
        if (e.type !== 'monster') continue;
        e.pos.x += e.vel.x;

        if (!aabbOverlap(player, e)) continue;

        // Stomp from above
        if (player.vel.y > 0 && player.pos.y + player.height - player.vel.y <= e.pos.y + 10) {
            toRemove.add(e.id);
            player.vel.y = -10;
            addScore(200);
        } else {
            if (takeDamage(1)) player.pos.x -= 100;
        }
    }

    if (toRemove.size === 0) return entities;
    return entities.filter(e => !toRemove.has(e.id));
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
                    entitiesToRemove.add(ent.id);
                    bulletsToRemove.add(b.id);
                    scoreGained += 200;
                }
            }
        } else if (b.type === 'boss-bullet') {
            if (aabbOverlap(b, player)) {
                if (takeDamage(1)) {
                    bulletsToRemove.add(b.id);
                    player.pos.x -= 50;
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
