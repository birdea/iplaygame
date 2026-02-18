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
