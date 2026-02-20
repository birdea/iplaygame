/**
 * entityFactories.ts
 *
 * Pure entity creation functions ("game content").
 * These define WHAT entities look like (dimensions, HP, speed, etc.)
 * while the generator/manager modules handle WHERE and WHEN to spawn them.
 */

import type { Entity, Block, Monster, GroundItem, Effect } from '../../types';
import { UNIT_SIZE, BULLET_SPEED } from '../../constants';
import { GAME_STRATEGY } from '../../config/GameStrategy';

const { PHYSICS, MONSTERS, ITEMS } = GAME_STRATEGY;

// ─── ID generation ───────────────────────────────────────────────────

let nextId = 0;

export function getUniqueId(prefix: string): string {
    return `${prefix}-${nextId++}`;
}

/** Reset the ID counter (call at the start of each stage generation) */
export function resetIds(): void {
    nextId = 0;
}

// ─── Block factories ─────────────────────────────────────────────────

export function createGroundBlock(x: number): Block {
    return {
        id: getUniqueId('ground'),
        pos: { x, y: PHYSICS.GROUND_Y },
        vel: { x: 0, y: 0 },
        width: UNIT_SIZE,
        height: UNIT_SIZE,
        type: 'block',
        blockType: 'ground',
    } as Block;
}

export function createPlatformBlock(
    x: number,
    y: number,
    floorIdx: number,
    blockType: 'brick' | 'question',
): Block {
    return {
        id: getUniqueId(`platform-${floorIdx}`),
        pos: { x, y },
        vel: { x: 0, y: 0 },
        width: UNIT_SIZE,
        height: UNIT_SIZE,
        type: 'block',
        blockType,
    } as Block;
}

export function createBossPlatformBlock(
    x: number,
    y: number,
    index: number,
    blockType: 'brick' | 'question',
): Block {
    return {
        id: getUniqueId(`boss-platform-${Date.now()}-${index}`),
        pos: { x, y },
        vel: { x: 0, y: 0 },
        width: UNIT_SIZE,
        height: UNIT_SIZE,
        type: 'block',
        blockType,
    } as Block;
}

// ─── Monster factory ─────────────────────────────────────────────────

export function createMonster(x: number, baseSpeed: number): Monster {
    const rand = Math.random();
    const { SKINNY, FAT, FLY } = MONSTERS.TYPES;

    let mType: 'skinny' | 'fat' | 'fly' = 'skinny';
    let mWidth = UNIT_SIZE;
    let mHeight = UNIT_SIZE;
    let mVelX = -baseSpeed;
    let mPosY = 450;
    let mHP = SKINNY.HP;

    if (rand < SKINNY.SPAWN_WEIGHT) {
        mType = 'skinny';
        mWidth = UNIT_SIZE * SKINNY.WIDTH_RATIO;
        mHeight = UNIT_SIZE * SKINNY.HEIGHT_RATIO;
        mVelX = -baseSpeed * SKINNY.SPEED_MULT;
        mPosY = PHYSICS.GROUND_Y - mHeight;
        mHP = SKINNY.HP;
    } else if (rand < SKINNY.SPAWN_WEIGHT + FAT.SPAWN_WEIGHT) {
        mType = 'fat';
        mWidth = UNIT_SIZE * FAT.WIDTH_RATIO;
        mHeight = UNIT_SIZE * FAT.HEIGHT_RATIO;
        mVelX = -baseSpeed * FAT.SPEED_MULT;
        mPosY = PHYSICS.GROUND_Y - mHeight;
        mHP = FAT.HP;
    } else {
        mType = 'fly';
        mWidth = UNIT_SIZE * FLY.WIDTH_RATIO;
        mHeight = UNIT_SIZE * FLY.HEIGHT_RATIO;
        mVelX = -baseSpeed * FLY.SPEED_MULT;
        mPosY = 200 + Math.random() * 150;
        mHP = FLY.HP;
    }

    return {
        id: getUniqueId('monster'),
        pos: { x, y: mPosY },
        vel: { x: mVelX, y: 0 },
        width: mWidth,
        height: mHeight,
        type: 'monster',
        monsterType: mType,
        hp: mHP,
        direction: -1,
    } as Monster;
}

// ─── Bullet factory ──────────────────────────────────────────────────

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

// ─── Item factory ────────────────────────────────────────────────────

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

// ─── Effect factory ──────────────────────────────────────────────────

export function spawnSparks(effects: Effect[], x: number, y: number, color: string = '#FF9800') {
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
