import type { Entity, Block, Monster } from '../../types';
import { UNIT_SIZE, getStageLength, getBossTriggerX } from '../../constants';

let nextId = 0;

function getUniqueId(prefix: string): string {
    return `${prefix}-${nextId++}`;
}

/** Reset the ID counter (call at the start of each stage generation) */
export function resetIds(): void {
    nextId = 0;
}

import { GAME_STRATEGY } from './GameStrategy';

const { GROUND_Y } = GAME_STRATEGY.PHYSICS;
const { STAGE, MONSTERS } = GAME_STRATEGY;

/** Generate all ground blocks with random holes */
function generateGround(stage: number): Block[] {
    const blocks: Block[] = [];
    let x = 0;
    const stageLength = getStageLength(stage);
    const bossTriggerX = getBossTriggerX(stage);

    while (x < stageLength + 1000) {
        // Holes appear only in the playable middle area up to boss trigger
        if (x > 1000 && x < bossTriggerX - 500 && Math.random() < STAGE.GROUND_HOLE_CHANCE) {
            const holeSize = Math.floor(Math.random() * 2) + 1;
            x += holeSize * UNIT_SIZE;
            continue;
        }

        blocks.push({
            id: getUniqueId('ground'),
            pos: { x, y: GROUND_Y },
            vel: { x: 0, y: 0 },
            width: UNIT_SIZE,
            height: UNIT_SIZE,
            type: 'block',
            blockType: 'ground',
        } as Block);
        x += UNIT_SIZE;
    }

    return blocks;
}

/**
 * Generate multi-floor platforms (2F / 3F / 4F) spread across the stage.
 * Each floor is generated independently to allow for overlapping and complex layouts.
 */
function generatePlatforms(stage: number): Block[] {
    const platforms: Block[] = [];
    const bossTriggerX = getBossTriggerX(stage);
    const startX = 600;

    const floorYs: number[] = [];
    const floorCount = STAGE.PLATFORMS.FLOOR_COUNT || 3;
    for (let i = 0; i < floorCount; i++) {
        floorYs.push(GROUND_Y - UNIT_SIZE * (2 + i * 2));
    }

    floorYs.forEach((floorY, floorIdx) => {
        // Stagger the horizontal start for each floor
        let x = startX + (floorIdx * 200);

        while (x < bossTriggerX + 1500) {
            // Random chance to create a longer gap between platforms on this floor
            if (Math.random() < STAGE.PLATFORMS.FLOOR_GAP_CHANCE) {
                x += UNIT_SIZE * (Math.floor(Math.random() * 4) + 2);
                continue;
            }

            // Platform length and gap between platforms on the same floor
            const platformLen = Math.floor(Math.random() * (STAGE.PLATFORMS.MAX_BLOCKS - STAGE.PLATFORMS.MIN_BLOCKS + 1)) + STAGE.PLATFORMS.MIN_BLOCKS;
            const gap = Math.floor(Math.random() * (STAGE.PLATFORMS.MAX_GAP_UNITS - STAGE.PLATFORMS.MIN_GAP_UNITS + 1)) + STAGE.PLATFORMS.MIN_GAP_UNITS;

            for (let i = 0; i < platformLen; i++) {
                const bx = x + i * UNIT_SIZE;
                // Randomly place question blocks
                const blockType: 'brick' | 'question' = Math.random() < STAGE.QUESTION_BLOCK_CHANCE ? 'question' : 'brick';

                platforms.push({
                    id: getUniqueId(`platform-${floorIdx}`),
                    pos: { x: bx, y: floorY },
                    vel: { x: 0, y: 0 },
                    width: UNIT_SIZE,
                    height: UNIT_SIZE,
                    type: 'block',
                    blockType,
                } as Block);
            }

            x += (platformLen + gap) * UNIT_SIZE;
        }
    });

    return platforms;
}

/** Generate monsters with difficulty scaling */
function generateObstacles(stage: number): Entity[] {
    const entities: Entity[] = [];
    const bossTriggerX = getBossTriggerX(stage);

    // Difficulty logic: base chance + stage scaling, then frequency scaling
    const monsterChance = (0.15 + (stage - 1) * 0.1) * 2 * Math.pow(MONSTERS.SPAWN_FREQ_SCALING, stage - 1);
    const monsterSpeed = 2 + (stage - 1) * MONSTERS.SPEED_SCALING_FACTOR;

    for (let bx = 500; bx < bossTriggerX - 500; bx += UNIT_SIZE * 2) {
        // Monsters
        if (Math.random() < monsterChance) {
            entities.push(createMonster(bx, monsterSpeed));
        }
    }

    return entities;
}

export function createMonster(x: number, baseSpeed: number): Monster {
    const rand = Math.random();
    let mType: 'skinny' | 'fat' | 'fly' = 'skinny';
    let mWidth = UNIT_SIZE;
    let mHeight = UNIT_SIZE;
    let mVelX = -baseSpeed;
    let mPosY = 450;
    let mHP = MONSTERS.TYPES.SKINNY.HP;

    const { SKINNY, FAT, FLY } = MONSTERS.TYPES;

    if (rand < SKINNY.SPAWN_WEIGHT) {
        mType = 'skinny';
        mWidth = UNIT_SIZE * SKINNY.WIDTH_RATIO;
        mHeight = UNIT_SIZE * SKINNY.HEIGHT_RATIO;
        mVelX = -baseSpeed * SKINNY.SPEED_MULT;
        mPosY = GROUND_Y - mHeight;
        mHP = SKINNY.HP;
    } else if (rand < SKINNY.SPAWN_WEIGHT + FAT.SPAWN_WEIGHT) {
        mType = 'fat';
        mWidth = UNIT_SIZE * FAT.WIDTH_RATIO;
        mHeight = UNIT_SIZE * FAT.HEIGHT_RATIO;
        mVelX = -baseSpeed * FAT.SPEED_MULT;
        mPosY = GROUND_Y - mHeight;
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


/** Generate all entities for a stage. Returns the full entity array. */
export function generateStage(stage: number): Entity[] {
    resetIds();
    const ground = generateGround(stage);
    const platforms = generatePlatforms(stage);
    const obstacles = generateObstacles(stage);
    return [...ground, ...platforms, ...obstacles];
}

/** Generate a single small platform during boss fight */
export function spawnBossPlatform(entities: Entity[], cameraX: number, floorCount: number): void {
    const floorIdx = Math.floor(Math.random() * floorCount);
    const floorY = GROUND_Y - UNIT_SIZE * (2 + floorIdx * 2);
    const platformLen = Math.floor(Math.random() * 2) + 1; // Smaller platforms
    const x = cameraX + Math.random() * 800; // Spawn randomly within screen

    for (let i = 0; i < platformLen; i++) {
        const bx = x + i * UNIT_SIZE;
        // Don't spawn if something is already there approximately
        if (entities.some(e => e.type === 'block' && Math.abs(e.pos.x - bx) < 10 && Math.abs(e.pos.y - floorY) < 10)) continue;

        const blockType: 'brick' | 'question' = Math.random() < STAGE.QUESTION_BLOCK_CHANCE ? 'question' : 'brick';

        entities.push({
            id: getUniqueId(`boss-platform-${Date.now()}-${i}`),
            pos: { x: bx, y: floorY },
            vel: { x: 0, y: 0 }, // Static tiles!
            width: UNIT_SIZE,
            height: UNIT_SIZE,
            type: 'block',
            blockType,
        } as Block);
    }
}
