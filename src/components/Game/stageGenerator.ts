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
            pos: { x, y: 500 },
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

/** Generate brick/question blocks and monsters with difficulty scaling */
function generateObstacles(stage: number): Entity[] {
    const entities: Entity[] = [];
    const monsterChance = (0.15 + (stage - 1) * 0.1) * 2;
    const monsterSpeed = 2 + (stage - 1) * 1.5;

    for (let bx = 500; bx < BOSS_TRIGGER_X - 500; bx += UNIT_SIZE * 2) {
        // Brick / Question blocks
        if (Math.random() > 0.7) {
            entities.push({
                id: getUniqueId('brick'),
                pos: { x: bx, y: 300 },
                vel: { x: 0, y: 0 },
                width: UNIT_SIZE,
                height: UNIT_SIZE,
                type: 'block',
                blockType: Math.random() > 0.5 ? 'question' : 'brick',
            } as Block);
        }

        // Monsters
        if (Math.random() < monsterChance) {
            entities.push(createMonster(bx, monsterSpeed));
        }
    }

    return entities;
}

function createMonster(x: number, baseSpeed: number): Monster {
    const rand = Math.random();
    let mType: 'skinny' | 'fat' | 'fly' = 'skinny';
    let mWidth = UNIT_SIZE;
    let mHeight = UNIT_SIZE;
    let mVelX = -baseSpeed;
    let mPosY = 450;

    if (rand < 0.33) {
        mType = 'skinny';
        mWidth = UNIT_SIZE * 0.7;
        mHeight = UNIT_SIZE * 0.9;
        mVelX = -baseSpeed * 1.8;
    } else if (rand < 0.66) {
        mType = 'fat';
        mWidth = UNIT_SIZE * 1.5;
        mHeight = UNIT_SIZE * 1.2;
        mVelX = -baseSpeed * 0.7;
        mPosY = 500 - mHeight;
    } else {
        mType = 'fly';
        mWidth = UNIT_SIZE;
        mHeight = UNIT_SIZE * 0.8;
        mVelX = -baseSpeed * 1.2;
        mPosY = 200 + Math.random() * 150;
    }

    return {
        id: getUniqueId('monster'),
        pos: { x, y: mPosY },
        vel: { x: mVelX, y: 0 },
        width: mWidth,
        height: mHeight,
        type: 'monster',
        monsterType: mType,
        direction: -1,
    } as Monster;
}

/** Generate all entities for a stage. Returns the full entity array. */
export function generateStage(stage: number): Entity[] {
    resetIds();
    const ground = generateGround();
    const obstacles = generateObstacles(stage);
    return [...ground, ...obstacles];
}
