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
}

export interface Monster extends Entity {
    monsterType: 'ground' | 'skinny' | 'fat' | 'fly' | 'boss';
    direction: number;
}

export interface Bullet extends Entity {
    isEnemy?: boolean;
    isBig?: boolean;
}
