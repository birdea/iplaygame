import type { Entity } from '../../../types';
import { CLUB_LENGTH } from '../../../constants';
import { GAME_STRATEGY } from '../../../config/GameStrategy';

// ── Dragon Slayer (Berserk Guts style) ──
function drawDragonSlayer(
    ctx2: CanvasRenderingContext2D,
    length: number,
    mega: boolean,
    prog: number,
    big: boolean
) {
    const bladeColor = mega ? '#9AA8C0' : (big ? '#C8A040' : '#8890A0');
    const rimColor = mega ? '#D0DFFF' : (big ? '#FFE090' : '#C0C8D8');
    const guardColor = mega ? '#4060A0' : (big ? '#8B6914' : '#555566');
    const gripColor = mega ? '#2A3A5A' : '#3A2010';

    ctx2.save();

    // Mega glint flicker
    if (mega && prog > 0.1) {
        const glintA = Math.abs(Math.sin(prog * Math.PI * 8)) * 0.9;
        ctx2.save();
        ctx2.globalAlpha = glintA;
        ctx2.shadowColor = '#FF8C42';
        ctx2.shadowBlur = 18;
        ctx2.strokeStyle = '#FFDDAA';
        ctx2.lineWidth = 2.5;
        ctx2.beginPath();
        ctx2.moveTo(10, 0);
        ctx2.lineTo(length * 0.7, 0);
        ctx2.stroke();
        ctx2.restore();
        ctx2.globalAlpha = 1;
    }

    // BLADE
    const bladeW = mega ? 22 : 18;
    const tipW = mega ? 14 : 11;

    ctx2.beginPath();
    ctx2.moveTo(0, -bladeW);
    ctx2.lineTo(length, -tipW);
    ctx2.lineTo(length + 4, 0);
    ctx2.lineTo(length, tipW);
    ctx2.lineTo(0, bladeW);
    ctx2.closePath();
    ctx2.fillStyle = bladeColor;
    ctx2.fill();

    ctx2.strokeStyle = '#222';
    ctx2.lineWidth = 2;
    ctx2.stroke();

    // Surface details
    ctx2.save();
    ctx2.strokeStyle = rimColor;
    ctx2.lineWidth = 2;
    ctx2.globalAlpha = 0.55;
    ctx2.beginPath();
    ctx2.moveTo(6, -bladeW * 0.3);
    ctx2.lineTo(length * 0.9, -tipW * 0.3);
    ctx2.stroke();
    ctx2.beginPath();
    ctx2.moveTo(6, bladeW * 0.3);
    ctx2.lineTo(length * 0.9, tipW * 0.3);
    ctx2.stroke();
    ctx2.lineWidth = 3;
    ctx2.globalAlpha = 0.75;
    ctx2.beginPath();
    ctx2.moveTo(4, -bladeW + 2);
    ctx2.lineTo(length - 2, -tipW + 2);
    ctx2.stroke();
    ctx2.globalAlpha = 0.35;
    ctx2.strokeStyle = '#000';
    ctx2.lineWidth = 1.5;
    for (let n = 0; n < 5; n++) {
        const nx = 20 + n * (length * 0.15);
        const side = n % 2 === 0 ? -1 : 1;
        ctx2.beginPath();
        ctx2.moveTo(nx, side * (bladeW - 3));
        ctx2.lineTo(nx + 4, side * (bladeW - 8));
        ctx2.stroke();
    }
    ctx2.restore();

    // CROSSGUARD
    const guardW = mega ? 34 : 28;
    const guardLen = mega ? 16 : 12;
    ctx2.fillStyle = guardColor;
    ctx2.strokeStyle = '#111';
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.roundRect(-guardLen / 2, -guardW / 2, guardLen, guardW, 2);
    ctx2.fill();
    ctx2.stroke();
    ctx2.fillStyle = '#999';
    ctx2.beginPath(); ctx2.arc(-2, -guardW * 0.3, 3, 0, Math.PI * 2); ctx2.fill();
    ctx2.beginPath(); ctx2.arc(-2, guardW * 0.3, 3, 0, Math.PI * 2); ctx2.fill();

    // GRIP
    const gripLen = 28;
    ctx2.save();
    ctx2.translate(-guardLen / 2, 0);
    ctx2.strokeStyle = gripColor;
    ctx2.lineWidth = 9;
    ctx2.lineCap = 'square';
    ctx2.beginPath();
    ctx2.moveTo(0, 0);
    ctx2.lineTo(-gripLen, 0);
    ctx2.stroke();
    ctx2.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx2.lineWidth = 2.5;
    ctx2.lineCap = 'butt';
    for (let g = 1; g <= 5; g++) {
        const gx = -g * (gripLen / 6);
        ctx2.beginPath();
        ctx2.moveTo(gx, -5); ctx2.lineTo(gx, 5); ctx2.stroke();
    }
    ctx2.restore();

    // POMMEL
    const pommelW = mega ? 14 : 11;
    const pommelH = mega ? 10 : 8;
    ctx2.fillStyle = guardColor;
    ctx2.strokeStyle = '#111';
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.roundRect(-guardLen / 2 - gripLen - pommelW, -pommelH / 2, pommelW, pommelH, 2);
    ctx2.fill();
    ctx2.stroke();

    ctx2.restore();
}

function drawChain(ctx: CanvasRenderingContext2D, length: number, mega: boolean, isActive: boolean) {
    const segments = 12;
    const segLen = length / segments;
    ctx.strokeStyle = mega ? '#FFD700' : '#9E9E9E';
    ctx.lineWidth = mega ? 7 : 4;
    let lx = 0, ly = 0;
    for (let i = 1; i <= segments; i++) {
        const rx = i * segLen;
        const ry = Math.sin((i / segments) * Math.PI) * (isActive ? -10 : 5);
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); ctx.stroke();
        ctx.fillStyle = '#757575';
        ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.fill();
        lx = rx; ly = ry;
    }
}

function drawFlailBall(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, mega: boolean, big: boolean, p: number, active: boolean) {
    ctx.save();
    ctx.translate(x, y);
    const ballColor = (big || mega) ? '#FFD700' : '#263238';
    ctx.fillStyle = ballColor;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    const ballRadius = mega ? GAME_STRATEGY.WEAPON.MEGA_FLAIL_RADIUS : GAME_STRATEGY.WEAPON.FLAIL_RADIUS;
    ctx.beginPath(); ctx.arc(0, 0, ballRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = (big || mega) ? '#FFF176' : '#546E7A';
    const rotation = t / 150 + (active ? p * 15 : 0);
    for (let s = 0; s < 8; s++) {
        ctx.save();
        ctx.rotate(rotation + (s * Math.PI * 2) / 8);
        ctx.beginPath();
        ctx.moveTo(ballRadius - 5, -10);
        ctx.lineTo(ballRadius + ballRadius * 0.8, 0);
        ctx.lineTo(ballRadius - 5, 10);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function drawSwordWeapon(
    ctx: CanvasRenderingContext2D,
    p: Entity,
    halfW: number, halfH: number,
    isSwinging: boolean, isMegaSwinging: boolean,
    swingElapsed: number, megaElapsed: number,
    time: number, isBigBullet: boolean,
) {
    const attackDir = p.attackDir || p.facing || 'right';

    const normalDuration = 500;
    const megaDuration = 700;
    const duration = isMegaSwinging ? megaDuration : normalDuration;
    const elapsed_sw = isMegaSwinging ? megaElapsed : swingElapsed;
    const progress = Math.min(1.0, elapsed_sw / duration);

    const isFlipped = p.facing === 'left';
    let dirAngle = 0;
    if (attackDir === 'up') dirAngle = -Math.PI / 2;
    else if (attackDir === 'down') dirAngle = Math.PI / 2;
    else if (attackDir === 'left') dirAngle = isFlipped ? 0 : Math.PI;
    else dirAngle = isFlipped ? Math.PI : 0;

    if (isMegaSwinging) {
        ctx.save();
        ctx.translate(halfW, halfH);

        if (progress < 0.55) {
            const spinProgress = progress / 0.55;
            const spinAngle = spinProgress * Math.PI * 4;
            const thrustOffset = Math.sin(spinProgress * Math.PI * 2) * 28;

            if (spinProgress > 0.1) {
                const trailCount = 5;
                const sweepAngle = Math.min(Math.PI * 2, spinProgress * Math.PI * 7);
                for (let tIdx = 0; tIdx < trailCount; tIdx++) {
                    const alpha = (1 - tIdx / trailCount) * Math.max(0, 1.4 - spinProgress * 1.8);
                    if (alpha <= 0) continue;
                    ctx.save();
                    ctx.globalAlpha = alpha * 0.75;
                    const trailRad = 132 + thrustOffset + tIdx * 8;
                    ctx.strokeStyle = tIdx % 2 === 0 ? '#FF6B35' : '#FFFFFF';
                    ctx.lineWidth = 9 - tIdx;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.arc(0, 0, trailRad, spinAngle - sweepAngle, spinAngle);
                    ctx.stroke();
                    ctx.restore();
                }
                ctx.globalAlpha = 1;
                if (spinProgress > 0.3 && spinProgress < 0.85) {
                    const burstA = Math.sin((spinProgress - 0.3) / 0.55 * Math.PI);
                    ctx.save();
                    ctx.globalAlpha = burstA * 0.45;
                    ctx.strokeStyle = '#FF8C42';
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.arc(0, 0, 140 + thrustOffset, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    ctx.globalAlpha = 1;
                }
            }
            ctx.rotate(spinAngle);
            ctx.translate(thrustOffset, 0);
            drawDragonSlayer(ctx, 144, true, spinProgress, isBigBullet);

        } else {
            const thrustProgress = (progress - 0.55) / 0.45;
            let thrustDist = 0;
            if (thrustProgress < 0.35) {
                const t2 = thrustProgress / 0.35;
                thrustDist = (1 - Math.pow(1 - t2, 3)) * 130;
            } else if (thrustProgress < 0.6) {
                thrustDist = 130;
            } else {
                const t2 = (thrustProgress - 0.6) / 0.4;
                thrustDist = 130 * (1 - Math.pow(t2, 2));
            }

            ctx.rotate(dirAngle);
            ctx.translate(thrustDist, 0);

            if (thrustDist > 15) {
                const ta = Math.min(thrustProgress / 0.35, 1)
                    * (1 - Math.max(0, (thrustProgress - 0.6) / 0.4)) * 0.7;
                ctx.save();
                ctx.globalAlpha = ta;
                ctx.strokeStyle = '#FFD580';
                ctx.lineWidth = 8;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-thrustDist * 0.65, -7);
                ctx.lineTo(-12, -7);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-thrustDist * 0.65, 7);
                ctx.lineTo(-12, 7);
                ctx.stroke();
                ctx.restore();
                ctx.globalAlpha = 1;
            }
            if (thrustProgress > 0.3 && thrustProgress < 0.62) {
                const flashA = Math.sin((thrustProgress - 0.3) / 0.32 * Math.PI);
                ctx.save();
                ctx.globalAlpha = flashA * 0.7;
                ctx.fillStyle = '#FFDD00';
                ctx.shadowColor = '#FFA000';
                ctx.shadowBlur = 22;
                ctx.beginPath();
                ctx.arc(140, 0, 24, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                ctx.globalAlpha = 1;
            }

            drawDragonSlayer(ctx, 144, true, progress, isBigBullet);
        }

        ctx.restore();

    } else if (isSwinging) {
        ctx.save();
        ctx.translate(halfW, halfH);

        let thrustDist = 0;
        let shakeY = 0;

        if (progress < 0.30) {
            const t = progress / 0.30;
            const ease = 1 - Math.pow(1 - t, 3);
            thrustDist = ease * 80;
        } else if (progress < 0.55) {
            thrustDist = 80;
            const shakeT = (progress - 0.30) / 0.25;
            shakeY = Math.sin(shakeT * Math.PI * 5) * 14;
        } else {
            const t = (progress - 0.55) / 0.45;
            const ease = Math.pow(t, 2);
            thrustDist = 80 * (1 - ease);
        }

        if (progress > 0.27 && progress < 0.42) {
            const flashA = Math.sin((progress - 0.27) / 0.15 * Math.PI);
            ctx.save();
            ctx.globalAlpha = flashA * 0.5;
            ctx.fillStyle = '#FFD580';
            const fx = Math.cos(dirAngle) * (thrustDist + 110);
            const fy = Math.sin(dirAngle) * (thrustDist + 110);
            ctx.beginPath();
            ctx.arc(fx, fy, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        if (thrustDist > 5) {
            const trailA = Math.min(progress / 0.3, 1) * (1 - Math.max(0, (progress - 0.55) / 0.45)) * 0.5;
            ctx.save();
            ctx.globalAlpha = trailA;
            ctx.strokeStyle = '#C8C8D8';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            const sx = Math.cos(dirAngle) * 5;
            const sy = Math.sin(dirAngle) * 5;
            const ex = Math.cos(dirAngle) * (thrustDist + 30);
            const ey = Math.sin(dirAngle) * (thrustDist + 30);
            ctx.beginPath(); ctx.moveTo(sx, sy - 5); ctx.lineTo(ex, ey - 5); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(sx, sy + 5); ctx.lineTo(ex, ey + 5); ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        const perpX = -Math.sin(dirAngle) * shakeY;
        const perpY = Math.cos(dirAngle) * shakeY;
        ctx.rotate(dirAngle);
        ctx.translate(thrustDist + perpX, perpY);
        drawDragonSlayer(ctx, 132, false, progress, isBigBullet);
        ctx.restore();

    } else {
        ctx.save();
        ctx.translate(halfW, halfH);
        const idleAngle = -Math.PI * 0.38 + Math.sin(time / 800) * 0.05;
        ctx.rotate(idleAngle);
        drawDragonSlayer(ctx, 132, false, 0, isBigBullet);
        ctx.restore();
    }
}

function drawClubWeapon(
    ctx: CanvasRenderingContext2D,
    p: Entity,
    halfW: number, halfH: number,
    isSwinging: boolean, isMegaSwinging: boolean,
    swingElapsed: number, megaElapsed: number,
    time: number, isBigBullet: boolean,
) {
    ctx.save();

    const attackDir = p.attackDir || p.facing || 'right';
    const isFlipped = p.facing === 'left';
    let baseAngle = 0;

    if (attackDir === 'up') baseAngle = -Math.PI / 2;
    else if (attackDir === 'down') baseAngle = Math.PI / 2;
    else if (attackDir === 'left') baseAngle = isFlipped ? 0 : Math.PI;
    else if (attackDir === 'right') baseAngle = isFlipped ? Math.PI : 0;

    ctx.translate(halfW, halfH);
    ctx.rotate(baseAngle);

    const normalDuration = 500;
    const megaDuration = 600;
    const duration = isMegaSwinging ? megaDuration : normalDuration;
    const elapsed = isMegaSwinging ? megaElapsed : swingElapsed;
    const progress = Math.min(1.0, elapsed / duration);

    let rightArmAngle = 0;
    let flailRotation = 0;
    let chainExtensionRatio = 0;
    let isSpinning = false;
    let spinAngle = 0;

    if (isSwinging || isMegaSwinging) {
        if (progress < 0.3) {
            isSpinning = true;
            const spinProgress = progress / 0.3;
            spinAngle = spinProgress * Math.PI * 2;
            rightArmAngle = -Math.PI / 4 + Math.sin(spinProgress * Math.PI) * 0.2;
            chainExtensionRatio = 0.2;
        } else {
            const throwProgress = (progress - 0.3) / 0.7;
            const throwPhase = Math.sin(throwProgress * Math.PI);
            const arcSize = isMegaSwinging ? Math.PI : Math.PI / 3;
            rightArmAngle = -arcSize / 2 + throwPhase * arcSize;
            chainExtensionRatio = 0.2 + throwPhase * 0.8;
            flailRotation = throwPhase * 0.1;
        }
    } else {
        rightArmAngle = Math.PI * 0.6;
        chainExtensionRatio = 0.1;
    }

    if (isSpinning) {
        ctx.restore();
        ctx.save();
        ctx.translate(halfW, halfH);
        ctx.rotate(spinAngle);

        const spinRadius = 40 + (isMegaSwinging ? 20 : 0);
        ctx.strokeStyle = '#9E9E9E';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(spinRadius, 0);
        ctx.stroke();

        drawFlailBall(ctx, spinRadius, 0, time, isMegaSwinging, isBigBullet, progress, isSwinging || isMegaSwinging);
        ctx.restore();
    } else {
        ctx.rotate(rightArmAngle);

        const armLen = isSwinging || isMegaSwinging ? 25 : 15;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(armLen, 0);
        ctx.stroke();

        ctx.save();
        ctx.translate(armLen, 0);
        ctx.rotate(flailRotation);
        ctx.strokeStyle = '#4E342E';
        ctx.lineWidth = 10;
        const handleLen = (isSwinging || isMegaSwinging) ? 35 : 10;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(handleLen, 0); ctx.stroke();

        ctx.translate(handleLen, 0);
        const baseChainLen = CLUB_LENGTH;
        const currentChainLen = isMegaSwinging
            ? (baseChainLen * 0.2 + chainExtensionRatio * baseChainLen * 2.5)
            : (baseChainLen * 0.2 + chainExtensionRatio * baseChainLen);

        drawChain(ctx, currentChainLen, isMegaSwinging, isSwinging || isMegaSwinging);
        drawFlailBall(ctx, currentChainLen, 0, time, isMegaSwinging, isBigBullet, progress, isSwinging || isMegaSwinging);
        ctx.restore();
        ctx.restore();
    }
}

/** Draw the player character with arms, legs, weapon, and optional face image */
export function drawPlayer(
    ctx: CanvasRenderingContext2D,
    p: Entity,
    time: number,
    isMoving: boolean,
    faceImg: HTMLImageElement | null,
    isInvincible: boolean,
    powerups: { bigBullet: number },
    lastSwingTime: number = 0,
    shieldUntil: number = 0,
    aCharged: boolean = false,
    lastMegaSwingTime: number = 0,
    weapon: 'sword' | 'club' = 'club',
    isBlocking: boolean = false,
    isCrouching: boolean = false,
): void {
    const now = Date.now();
    const isShieldActive = shieldUntil > now;
    if (isInvincible && !isShieldActive && Math.floor(time / 100) % 2 === 0) return;

    const walkCycle = isMoving ? Math.sin(time / 100) : 0;
    const armCycle = isMoving ? Math.sin(time / 100 + Math.PI) : 0;
    const { pos } = p;

    const swingElapsed = time - lastSwingTime;
    const isSwinging = swingElapsed < 500;

    const megaElapsed = time - lastMegaSwingTime;
    const isMegaSwinging = megaElapsed < 600;

    const halfW = p.width / 2;
    const halfH = p.height / 2;

    ctx.save();
    ctx.translate(pos.x + halfW, pos.y);
    if (p.facing === 'left') {
        ctx.scale(-1, 1);
    }
    ctx.translate(-halfW, 0);

    // Charging Aura
    if (aCharged) {
        ctx.save();
        ctx.translate(halfW, halfH);
        ctx.rotate(time / 200);
        ctx.beginPath();
        const pulse = Math.sin(time / 100) * 10;
        ctx.arc(0, 0, (halfW + 30) + pulse, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, halfW + 5, 0, 0, (halfW + 35) + pulse);
        grad.addColorStop(0, 'rgba(255, 215, 0, 0)');
        grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        for (let r = 0; r < 8; r++) {
            ctx.rotate(Math.PI / 4);
            ctx.beginPath();
            ctx.moveTo((halfW + 10) + pulse, 0);
            ctx.lineTo((halfW + 30) + pulse, 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Shield Effect
    if (isShieldActive) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(halfW, halfH, halfH * 1.5, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(halfW, halfH, halfH, halfW, halfH, halfH * 1.625);
        grad.addColorStop(0, 'rgba(33, 150, 243, 0)');
        grad.addColorStop(1, 'rgba(33, 150, 243, 0.4)');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.lineDashOffset = -time / 20;
        ctx.stroke();
        ctx.restore();
    }

    // Parry Shield
    if (isBlocking) {
        ctx.save();
        ctx.translate(halfW + 15, p.height * 0.5);
        ctx.fillStyle = '#90A4AE';
        ctx.strokeStyle = '#ECEFF1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-15, -20);
        ctx.quadraticCurveTo(0, -25, 15, -20);
        ctx.lineTo(15, 12);
        ctx.quadraticCurveTo(0, 32, -15, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(8, -12);
        ctx.moveTo(0, -15);
        ctx.lineTo(0, 15);
        ctx.stroke();
        ctx.restore();
    }

    const isBigBullet = powerups.bigBullet > Date.now();
    const bodyColor = isBigBullet ? '#F44336' : '#D32F2F';

    // Legs
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, p.width * 0.2);
    ctx.lineCap = 'round';

    const legY = p.height * 0.75;
    const legLen = p.height * 0.25;
    const legX1 = p.width * 0.3;
    const legX2 = p.width * 0.7;

    ctx.save();
    ctx.translate(legX1, legY);
    ctx.rotate(walkCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, legLen); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(legX2, legY);
    ctx.rotate(-walkCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, legLen); ctx.stroke();
    ctx.restore();

    // Body
    ctx.fillStyle = bodyColor;
    const bodyY = isCrouching ? p.height * 0.2 : p.height * 0.375;
    ctx.fillRect(0, bodyY, p.width, p.height - bodyY);

    // Left arm
    ctx.lineWidth = Math.max(2, p.width * 0.16);
    ctx.save();
    ctx.translate(p.width * 0.1, p.height * 0.5);
    ctx.rotate(armCycle * 0.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-p.width * 0.3, p.width * 0.3); ctx.stroke();
    ctx.restore();

    // Right arm + Weapon
    if (!isBlocking) {
        if (weapon === 'sword') {
            drawSwordWeapon(ctx, p, halfW, halfH, isSwinging, isMegaSwinging, swingElapsed, megaElapsed, time, isBigBullet);
        } else {
            drawClubWeapon(ctx, p, halfW, halfH, isSwinging, isMegaSwinging, swingElapsed, megaElapsed, time, isBigBullet);
        }
    } else {
        ctx.lineWidth = Math.max(2, p.width * 0.16);
        ctx.save();
        ctx.translate(p.width * 0.7, p.height * 0.5);
        ctx.rotate(0.2);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(12, 4); ctx.stroke();
        ctx.restore();
    }

    // Head
    if (faceImg) {
        ctx.save();
        ctx.beginPath(); ctx.arc(halfW, halfW, halfW, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(faceImg, 0, 0, p.width, p.width);
        ctx.restore();
        ctx.strokeStyle = '#FFCCBC';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(halfW, halfW, halfW, 0, Math.PI * 2); ctx.stroke();
    } else {
        ctx.fillStyle = '#FFCCBC';
        ctx.beginPath(); ctx.arc(halfW, halfW, halfW, 0, Math.PI * 2); ctx.fill();
        const eyeOffsetX = p.facing === 'left' ? -halfW * 0.28 : halfW * 0.28;
        ctx.fillStyle = '#1a1a1a';
        const eyeRadius = halfW * 0.16;
        const eyeSpacing = halfW * 0.2;
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX - eyeSpacing, halfW * 0.8, eyeRadius, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX + eyeSpacing, halfW * 0.8, eyeRadius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        const pupilShift = p.facing === 'left' ? -halfW * 0.08 : halfW * 0.08;
        const pupilRadius = eyeRadius * 0.45;
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX - eyeSpacing + pupilShift, halfW * 0.76, pupilRadius, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(halfW + eyeOffsetX + eyeSpacing + pupilShift, halfW * 0.76, pupilRadius, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
}
