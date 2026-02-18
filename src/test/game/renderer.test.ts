import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as renderer from '../../components/game/renderer';
import type { Entity, Monster } from '../../components/core/types';

describe('renderer.ts', () => {
    let ctx: any;

    beforeEach(() => {
        ctx = {
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
            font: '',
            textAlign: '',
            shadowColor: '',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            globalAlpha: 1,
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            arc: vi.fn(),
            ellipse: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
            translate: vi.fn(),
            scale: vi.fn(),
            rotate: vi.fn(),
            fillText: vi.fn(),
            clearRect: vi.fn(),
            clip: vi.fn(),
            drawImage: vi.fn(),
            quadraticCurveTo: vi.fn(),
            closePath: vi.fn(),
        };
    });

    it('drawBackground should call fillRect', () => {
        renderer.drawBackground(ctx, 100, 1000);
        expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('drawBlock should handle ground type', () => {
        renderer.drawBlock(ctx, 0, 0, 40, 40, 'ground');
        expect(ctx.fillRect).toHaveBeenCalled();
        expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('drawBlock should handle brick type', () => {
        renderer.drawBlock(ctx, 0, 0, 40, 40, 'brick');
        expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('drawBlock should handle question type', () => {
        renderer.drawBlock(ctx, 0, 0, 40, 40, 'question');
        expect(ctx.fillText).toHaveBeenCalledWith('?', expect.any(Number), expect.any(Number));
    });

    it('drawDragon should call necessary canvas methods', () => {
        renderer.drawDragon(ctx, 100, 100, 200, 200, 1000, 'idle');
        expect(ctx.arc).toHaveBeenCalled();
        expect(ctx.fill).toHaveBeenCalled();
    });

    it('drawPlayer should call drawImage if faceImg is provided', () => {
        const p = { pos: { x: 100, y: 100 }, width: 50, height: 50 } as Entity;
        const faceImg = {} as HTMLImageElement;
        renderer.drawPlayer(ctx, p, 1000, true, faceImg, false, { bigBullet: 0 });
        expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('drawMonster should handle fly type', () => {
        const m = { monsterType: 'fly' } as Monster;
        const e = { pos: { x: 100, y: 100 }, width: 40, height: 40 } as Entity;
        renderer.drawMonster(ctx, e, m, 1000, null);
        expect(ctx.ellipse).toHaveBeenCalled(); // Wings
    });

    it('drawHUD should draw life icons', () => {
        const data = {
            stage: 1,
            score: 1000,
            hp: 3,
            powerups: { bigBullet: 0, fastRun: 0 }
        };
        renderer.drawHUD(ctx, data);
        expect(ctx.fillText).toHaveBeenCalledWith('LIFE:', expect.any(Number), expect.any(Number));
        expect(ctx.arc).toHaveBeenCalled(); // 3 circles for HP
    });

    it('drawMinimap should scale and translate', () => {
        const player = { pos: { x: 100, y: 100 }, width: 50, height: 50 } as Entity;
        renderer.drawMinimap(ctx, 1000, 150, 90, 50, player, undefined);
        expect(ctx.scale).toHaveBeenCalled();
        expect(ctx.translate).toHaveBeenCalled();
    });
});
