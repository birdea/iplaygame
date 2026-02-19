import type { Entity } from '../../types';
import { getBossTriggerX } from '../../constants';

export interface BossTactics {
    lastAttackTime: number;
    state: 'idle' | 'punch' | 'fire';
    attackDuration: number;
    // Movement pattern
    moveDir: 1 | -1;          // current horizontal direction
    lastDirChangeTime: number; // when we last changed direction
    dirChangeCooldown: number; // ms until next direction change
    targetY: number;           // target Y for floating above tiles
}

export function createBossTactics(): BossTactics {
    return {
        lastAttackTime: 0,
        state: 'idle',
        attackDuration: 0,
        moveDir: -1,
        lastDirChangeTime: 0,
        dirChangeCooldown: 1500 + Math.random() * 1500,
        targetY: 0,
    };
}

import { GAME_STRATEGY } from './GameStrategy';

const { BOSS, PHYSICS } = GAME_STRATEGY;

export function createBossEntity(stage: number): Entity {
    // Boss spawns to the right of the trigger, floating above ground tiles (y=500)
    const hoverGap = BOSS.HOVER_GAP;
    const spawnY = PHYSICS.GROUND_Y - BOSS.SIZE - hoverGap;
    const triggerX = getBossTriggerX(stage);
    return {
        id: 'boss',
        pos: { x: triggerX + BOSS.SPAWN_OFFSET_X, y: spawnY },
        vel: { x: -2, y: 0 },
        width: BOSS.SIZE,
        height: BOSS.SIZE,
        type: 'boss',
        hp: BOSS.BASE_HP * stage,
        maxHP: BOSS.BASE_HP * stage,
    };
}

/**
 * Update boss physics, AI behavior, and attack patterns.
 * Boss hovers just above the tile floor and moves left/right dynamically.
 */
export function updateBoss(
    boss: Entity,
    player: Entity,
    tactics: BossTactics,
    time: number,
    stage: number,
    gameActive: { current: boolean },
    cameraX: number,
    spawnBullet: (bullet: Entity) => void,
): void {
    // --- Hover above tiles ---
    // Ground tiles are at y=500, boss should hover just above them
    const GROUND_Y = PHYSICS.GROUND_Y;
    const HOVER_GAP = BOSS.HOVER_GAP; // pixels above ground
    const targetY = GROUND_Y - boss.height - HOVER_GAP;

    // Smooth vertical approach (spring-like)
    const dy = targetY - boss.pos.y;
    boss.vel.y += dy * 0.05;
    boss.vel.y *= 0.85; // damping
    boss.pos.y += boss.vel.y;

    // Clamp so boss never goes underground
    if (boss.pos.y > targetY) {
        boss.pos.y = targetY;
        boss.vel.y = 0;
    }

    // --- Horizontal movement: varied left/right patterns ---
    const now = time;

    // Change direction on cooldown or when hitting arena boundaries
    // Boss should not enter left inset of the screen
    const arenaLeft = cameraX + BOSS.ARENA_INSET_LEFT;
    const arenaRight = cameraX + (1000 - BOSS.ARENA_INSET_RIGHT) - boss.width;

    if (
        now - tactics.lastDirChangeTime > tactics.dirChangeCooldown ||
        boss.pos.x <= arenaLeft ||
        boss.pos.x >= arenaRight
    ) {
        // Decide next move pattern
        const pattern = Math.random();
        if (pattern < 0.35) {
            // Chase player
            tactics.moveDir = player.pos.x < boss.pos.x ? -1 : 1;
            tactics.dirChangeCooldown = 800 + Math.random() * 800;
        } else if (pattern < 0.65) {
            // Retreat away from player
            tactics.moveDir = player.pos.x < boss.pos.x ? 1 : -1;
            tactics.dirChangeCooldown = 600 + Math.random() * 600;
        } else {
            // Random direction
            tactics.moveDir = Math.random() < 0.5 ? -1 : 1;
            tactics.dirChangeCooldown = 1000 + Math.random() * 2000;
        }
        tactics.lastDirChangeTime = now;
    }

    // Speed scales with stage and distance to player
    const baseSpeed = BOSS.BASE_SPEED + stage * BOSS.SPEED_STAGE_SCALING;
    const dist = Math.abs(boss.pos.x - player.pos.x);
    const speedMult = dist > 400 ? 1.5 : dist < 150 ? 0.5 : 1.0;
    boss.vel.x = tactics.moveDir * baseSpeed * speedMult;
    boss.pos.x += boss.vel.x;

    // Clamp to arena
    boss.pos.x = Math.max(arenaLeft, Math.min(arenaRight, boss.pos.x));

    // --- Fire attack on cooldown ---
    const cooldown = BOSS.FIRE_COOLDOWN_BASE_MS / stage;
    if (time - tactics.lastAttackTime > cooldown) {
        tactics.state = 'fire';
        tactics.lastAttackTime = time;
        tactics.attackDuration = 1000;

        // Difficulty scales with stage
        const baseCount = BOSS.BULLET_COUNT_BASE;
        const bulletCount = Math.floor(baseCount * Math.pow(BOSS.BULLET_COUNT_SCALING, stage - 1)) + Math.floor(Math.random() * stage);

        // Randomly pick between 7 o'clock and 11 o'clock direction for this wave
        // 11 o'clock -> Up-Left (-30 deg from left), 7 o'clock -> Down-Left (+30 deg from left)
        const isEleven = Math.random() < 0.5;
        const targetAngleY = isEleven ? -Math.PI / 6 : Math.PI / 6;

        for (let i = 0; i < bulletCount; i++) {
            setTimeout(() => {
                if (!gameActive.current) return;

                // complexity increases with stage: wave patterns and spread
                const phase = (i / bulletCount) * Math.PI * 2;
                const waveOffset = Math.sin(phase + time / 500) * (10 + stage * 5);
                const spreadIdx = i - (bulletCount / 2);

                // Base speed for breath
                const speed = BOSS.BULLET_SPEED_BASE + stage * 0.5;

                spawnBullet({
                    id: `boss-fire-${Date.now()}-${i}`,
                    pos: { x: boss.pos.x, y: boss.pos.y + boss.height * 0.4 + spreadIdx * 5 + waveOffset },
                    vel: {
                        x: -speed * Math.cos(targetAngleY) - (Math.random() * 2),
                        y: speed * Math.sin(targetAngleY) + (spreadIdx * 1.5) + (Math.sin(time / 200 + i) * 2)
                    },
                    width: 30 + (stage > 2 ? 10 : 0),
                    height: 30 + (stage > 2 ? 10 : 0),
                    type: 'boss-bullet',
                    damage: 2, // 2 HP damage
                });
            }, i * Math.max(40, 150 - stage * 15));
        }
    }


    // Attack duration countdown
    if (tactics.attackDuration > 0) {
        tactics.attackDuration -= 16;
        if (tactics.attackDuration <= 0) tactics.state = 'idle';
    }
}
