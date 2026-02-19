/**
 * GameStrategy.ts
 *
 * This file contains all game policy-related constants and configuration.
 * By adjusting these values, developers and game designers can tune the gameplay
 * experience, difficulty, and balance.
 */

export const GAME_STRATEGY = {
    // --- GENERAL ---
    GENERAL: {
        TITLE: 'KIDS ADVENTURE',
    },

    // --- PHYSICS & MOVEMENT ---
    PHYSICS: {
        GRAVITY: 0.5,
        JUMP_FORCE: -15,
        MOVE_SPEED: 5,
        TERMINAL_VELOCITY: 20,
        /** Default horizontal speed with powerup applied */
        FAST_RUN_MULTIPLIER: 1.6,
        /** Ground level Y coordinate */
        GROUND_Y: 500,
        /** Depth at which player is considered "fallen off" */
        DEATH_Y: 650,
    },

    // --- PLAYER TUNING ---
    PLAYER: {
        INITIAL_HP: 5,
        MAX_HP_LIMIT: 10,
        INVINCIBILITY_DURATION_MS: 2000,
        /** Horizontal distance to knock back player when hit */
        KNOCKBACK_DISTANCE: 100,
        /** Camera follows player with this horizontal offset */
        CAMERA_FOLLOW_OFFSET: 400,
        /** Minimum time between sword/club swings (ms) */
        ATTACK_COOLDOWN_MS: 400,
        /** How long 'KeyA' must be held to charge a Mega Swing (ms) */
        MEGA_SWING_CHARGE_MS: 3000,
        /** Normal attack range (px) */
        CLUB_RANGE: 240,
        /** Ratio of club damage for mega swing */
        MEGA_SWING_DAMAGE_MULT: 4,
        /** Ratio of club range for mega swing */
        MEGA_SWING_RANGE_MULT: 2,
        /** Collision hitbox ratio for player-monster contact (0.0 to 1.0) */
        HITBOX_RATIO: 0.8,
    },

    // --- COLLISION TUNING ---
    COLLISION: {
        /** Vertical buffer for landing on blocks (px) */
        LANDING_BUFFER: 10,
        /** Vertical buffer for hitting head on blocks (px) */
        HEAD_HIT_BUFFER: 10,
        /** Ratio of width used for landing check (to allow falling into 1x1 gaps) */
        FOOTPRINT_RATIO: 0.4,
        /** Vertical inset to prevent horizontal collision snapping when on top (px) */
        HORIZONTAL_INSET: 10,
    },

    // --- MONSTER TUNING ---
    MONSTERS: {
        /** Initial spawn interval at stage 1 (ms) */
        BASE_SPAWN_INTERVAL_MS: 3000,
        /** Minimum allowed spawn interval after stage scaling (ms) */
        MIN_SPAWN_INTERVAL_MS: 1000,
        /** Spawn frequency increases by this factor per stage */
        SPAWN_FREQ_SCALING: 1.3,
        /** Monster horizontal speed scales by stage: base + (stage-1) * MULT */
        /** Distance ahead of camera to spawn continuous monsters */
        SPAWN_OFFSET_X: 1100,

        TYPES: {
            SKINNY: {
                HP: 2,
                SPEED_MULT: 0.9,
                WIDTH_RATIO: 1.05,
                HEIGHT_RATIO: 1.35,
                SPAWN_WEIGHT: 0.33,
            },
            FAT: {
                HP: 3,
                SPEED_MULT: 0.49,
                WIDTH_RATIO: 2.25,
                HEIGHT_RATIO: 1.8,
                SPAWN_WEIGHT: 0.33, // (0.66 - 0.33)
            },
            FLY: {
                HP: 1,
                SPEED_MULT: 1.2,
                WIDTH_RATIO: 1.0,
                HEIGHT_RATIO: 0.8,
                SPAWN_WEIGHT: 0.34, // (remainder)
            }
        }
    },

    // --- BOSS TUNING ---
    BOSS: {
        /** HP scales with stage: BASE_HP * stage */
        BASE_HP: 50,
        /** Size of the boss entity (px) */
        SIZE: 400,
        /** Boss appears at getBossTriggerX(stage) + OFFSET */
        SPAWN_OFFSET_X: 600,
        /** Pixels to hover above ground */
        HOVER_GAP: 20,
        /** Horizontal movement speed: (2 + stage * 0.5) */
        BASE_SPEED: 2,
        SPEED_STAGE_SCALING: 0.5,
        /** Boss movement arena bounds relative to screen edges */
        ARENA_INSET_LEFT: 250,
        ARENA_INSET_RIGHT: 50, // 1000 - 950
        /** Fire attack cooldown: 3500 / stage (ms) */
        FIRE_COOLDOWN_BASE_MS: 3500,
        /** Number of bullets in a fire wave: 6 * (1.2 ^ stage-1) */
        BULLET_COUNT_BASE: 6,
        BULLET_COUNT_SCALING: 1.2,
        /** Boss projectile speed: (8 + stage * 0.5) */
        BULLET_SPEED_BASE: 8,
        /** Boss collision hitbox ratio */
        HITBOX_RATIO: 0.7,
    },

    // --- ITEMS & POWERUPS ---
    ITEMS: {
        LIFETIME_MS: 10000,
        /** Items move horizontally at this speed */
        ROAM_SPEED: 1.5,
        /** Initial upward burst when popping out of a block */
        POP_VELOCITY_Y: -12,
        /** Gravity multiplier for items (typically floats more than player) */
        GRAVITY_MULT: 0.6,
        /** Chance to change roaming direction per frame */
        DIR_CHANGE_CHANCE: 0.008,
        /** Default powerup duration (ms) */
        POWERUP_DURATION_MS: 30000,
        /** Ammo refill amount */
        AMMO_REFILL: 30,
        /** Shield refill amount */
        SHIELD_REFILL: 3,

        /** Weights for random item drop from ? blocks */
        DROP_WEIGHTS: {
            BIG_BULLET: 0.2,
            FAST_RUN: 0.2,
            SHIELD: 0.2,
            AMMO: 0.2,
            HP: 0.2, // remainder
        }
    },

    // --- STAGE GENERATION ---
    STAGE: {
        /** Total number of stages to conquer */
        TOTAL_STAGES: 3,
        /** Base stage length: 100m * 1.5^(stage-1) */
        BASE_LENGTH_UNITS: 100,
        LENGTH_SCALING: 1.5,
        /** Boss trigger point: 80m * 1.5^(stage-1) */
        BOSS_TRIGGER_UNITS: 80,
        /** Chance for a hole/gap to appear in the ground */
        GROUND_HOLE_CHANCE: 0.12,
        /** Chance for a question block instead of brick */
        QUESTION_BLOCK_CHANCE: 0.15, // 1.0 - 0.85

        PLATFORMS: {
            /** Chance to skip a section on a floor to create a gap */
            FLOOR_GAP_CHANCE: 0.25,
            MIN_BLOCKS: 2,
            MAX_BLOCKS: 6,
            MIN_GAP_UNITS: 3,
            MAX_GAP_UNITS: 7,
            /** Platform crumble timings (ms) */
            CRUMBLE_WARN_MS: 1000,
            CRUMBLE_FALL_MS: 2000,
        }
    },

    // --- SCORING ---
    SCORE: {
        MONSTER_KILL: 300,
        BOSS_KILL: 5000,
        STOMP_KILL: 200,
        BLOCK_HIT: 100,
        ITEM_COLLECT: 50,
    },

    // --- WEAPON TUNING ---
    WEAPON: {
        /** Spiked ball radius (px) */
        FLAIL_RADIUS: 12.5,
        /** Spiked ball radius during Mega Swing (px) */
        MEGA_FLAIL_RADIUS: 20,
    },

    // --- UI STRINGS ---
    UI: {
        VICTORY_TITLE: 'VICTORY!',
        GAME_OVER_TITLE: 'GAME OVER',
        RETRY_BUTTON: 'RETRY',
        NEXT_STAGE_BUTTON: 'NEXT STAGE',
        MAIN_MENU_BUTTON: 'MAIN MENU',
        ALL_CLEAR_MESSAGE: 'All Stages Conquered!',
        STAGE_CLEAR_MESSAGE: (stage: number) => `Stage ${stage} Cleared!`,
    }
};
