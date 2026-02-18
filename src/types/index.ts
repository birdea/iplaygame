export interface Vector2D {
    x: number;
    y: number;
}

export interface Entity {
    id: string;
    pos: Vector2D;
    vel: Vector2D;
    width: number;
    height: number;
    type: 'player' | 'monster' | 'boss' | 'bullet' | 'block' | 'item' | 'boss-bullet' | 'boss-punch';
    hp?: number;
    maxHP?: number;
    damage?: number;
    lastHitBySwing?: number;
}

export interface Block extends Entity {
    blockType: 'brick' | 'question' | 'ground';
    hasItem?: boolean;
    /** Timestamp (ms) when player first stepped on this platform block. undefined = no one standing. */
    standingStartTime?: number;
    /** True while the block is in the 1s warning phase before disappearing */
    isCrumbling?: boolean;
}

export interface Monster extends Entity {
    monsterType: 'ground' | 'skinny' | 'fat' | 'fly' | 'boss';
    direction: number;
}

/** An item that pops out of a question block and roams before disappearing */
export interface GroundItem {
    id: string;
    pos: { x: number; y: number };
    vel: { x: number; y: number };
    width: number;
    height: number;
    /** Which powerup this item grants when collected */
    powerup: 'bigBullet' | 'fastRun' | 'hp' | 'shield' | 'ammo';
    /** Timestamp (ms) when the item was spawned – expires after 10 s */
    spawnedAt: number;
    /** True while the item is in the initial pop-up phase */
    isPopping: boolean;
}

export interface Effect {
    id: string;
    pos: Vector2D;
    vel: Vector2D;
    life: number; // 0 to 1, where 1 is fresh
    color: string;
    size: number;
}
