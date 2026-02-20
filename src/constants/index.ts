import { GAME_STRATEGY } from '../config/GameStrategy';

export const UNIT_SIZE = 50; // 1m = 50px
export const getStageLength = (stage: number) =>
    GAME_STRATEGY.STAGE.BASE_LENGTH_UNITS * UNIT_SIZE * Math.pow(GAME_STRATEGY.STAGE.LENGTH_SCALING, stage - 1);
export const getBossTriggerX = (stage: number) =>
    GAME_STRATEGY.STAGE.BOSS_TRIGGER_UNITS * UNIT_SIZE * Math.pow(GAME_STRATEGY.STAGE.LENGTH_SCALING, stage - 1);

export const GRAVITY = GAME_STRATEGY.PHYSICS.GRAVITY;
export const JUMP_FORCE = GAME_STRATEGY.PHYSICS.JUMP_FORCE;
export const MOVE_SPEED = GAME_STRATEGY.PHYSICS.MOVE_SPEED;
export const BULLET_SPEED = 10; // Base speed for player bullet

export const PLAYER_WIDTH = GAME_STRATEGY.PLAYER.WIDTH;
export const PLAYER_HEIGHT = GAME_STRATEGY.PLAYER.HEIGHT;
export const CLUB_LENGTH = 106;
export const CLUB_RANGE = GAME_STRATEGY.PLAYER.CLUB_RANGE;
export const BOSS_SIZE = GAME_STRATEGY.BOSS.SIZE;

export const MINIMAP_SCALE = 0.15;
export const MINIMAP_WIDTH = 150;
export const MINIMAP_HEIGHT = 90;

export const COLORS = {
    SKY: '#5CE0FF',
    GROUND: '#E59110',
    BRICK: '#BA5D11',
    QUESTION: '#F7D01B',
};

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 600;

export const AUTO_SCROLL_SPEED = 1.0;

export const INVINCIBILITY_DURATION = GAME_STRATEGY.PLAYER.INVINCIBILITY_DURATION_MS;
export const SHIELD_DURATION = 5000;
export const SHIELD_REFILL = GAME_STRATEGY.ITEMS.SHIELD_REFILL;
export const AMMO_REFILL = GAME_STRATEGY.ITEMS.AMMO_REFILL;

