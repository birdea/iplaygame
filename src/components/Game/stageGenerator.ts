import type { Entity, Block, Monster } from '../../types';
import { UNIT_SIZE, STAGE_LENGTH, BOSS_TRIGGER_X } from '../../constants';

let nextId = 0;

function getUniqueId(prefix: string): string {
    return `${prefix}-${nextId++}`;
}

/** Reset the ID counter (call at the start of each stage generation) */
export function resetIds(): void {
    nextId = 0;
}

/** Ground Y position (px) */
const GROUND_Y = 500;

/** Generate all ground blocks with random holes */
function generateGround(): Block[] {
    const blocks: Block[] = [];
    let x = 0;

    while (x < STAGE_LENGTH) {
        if (x > 1000 && x < BOSS_TRIGGER_X - 500 && Math.random() < 0.12) {
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
 * Each "section" randomly picks a floor height and places a run of blocks.
 */
function generatePlatforms(): Block[] {
    const platforms: Block[] = [];

    // Floor Y positions (2F, 3F, 4F above ground)
    const floorYMap: Record<number, number> = {
        2: GROUND_Y - UNIT_SIZE * 2,   // 2nd floor: 100px above ground
        3: GROUND_Y - UNIT_SIZE * 4,   // 3rd floor: 200px above ground
        4: GROUND_Y - UNIT_SIZE * 6,   // 4th floor: 300px above ground
    };

    // Walk through the stage in sections
    let x = 600; // start after safe zone
    const endX = BOSS_TRIGGER_X - 600;

    // Track which floors we've used recently to ensure variety
    const recentFloors: number[] = [];

    while (x < endX) {
        // Pick a floor, biasing away from recently used ones
        let floor: number;
        const available = [2, 3, 4].filter(f => !recentFloors.slice(-2).includes(f));
        if (available.length === 0) {
            floor = [2, 3, 4][Math.floor(Math.random() * 3)];
        } else {
            floor = available[Math.floor(Math.random() * available.length)];
        }
        recentFloors.push(floor);
        if (recentFloors.length > 4) recentFloors.shift();

        const floorY = floorYMap[floor];

        // Platform length: 2–6 blocks
        const platformLen = Math.floor(Math.random() * 5) + 2;
        // Gap before next platform: 1–4 blocks
        const gap = Math.floor(Math.random() * 4) + 1;

        for (let i = 0; i < platformLen; i++) {
            const bx = x + i * UNIT_SIZE;
            if (bx >= endX) break;
            const blockType: 'brick' | 'question' = Math.random() > 0.7 ? 'question' : 'brick';
            platforms.push({
                id: getUniqueId('platform'),
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

    return platforms;
}

/** Generate monsters with difficulty scaling */
function generateObstacles(stage: number): Entity[] {
    const entities: Entity[] = [];
    const monsterChance = (0.15 + (stage - 1) * 0.1) * 2;
    const monsterSpeed = 2 + (stage - 1) * 1.5;

    for (let bx = 500; bx < BOSS_TRIGGER_X - 500; bx += UNIT_SIZE * 2) {
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
    let mHP = 2; // Default for skinny

    if (rand < 0.33) {
        mType = 'skinny';
        mWidth = UNIT_SIZE * 0.7;
        mHeight = UNIT_SIZE * 0.9;
        mVelX = -baseSpeed * 1.8;
        mHP = 2;
    } else if (rand < 0.66) {
        mType = 'fat';
        mWidth = UNIT_SIZE * 1.5;
        mHeight = UNIT_SIZE * 1.2;
        mVelX = -baseSpeed * 0.7;
        mPosY = GROUND_Y - mHeight;
        mHP = 3;
    } else {
        mType = 'fly';
        mWidth = UNIT_SIZE;
        mHeight = UNIT_SIZE * 0.8;
        mVelX = -baseSpeed * 1.2;
        mPosY = 200 + Math.random() * 150;
        mHP = 1;
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
    const ground = generateGround();
    const platforms = generatePlatforms();
    const obstacles = generateObstacles(stage);
    return [...ground, ...platforms, ...obstacles];
}
