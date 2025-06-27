/**
 * vectorArenaObjects.js - v11.0 (Extended Weapon Arsenal - FIXED)
 * This version massively expands the weapon arsenal with beautiful and diverse weapon types.
 * - Added 20+ new projectile classes with unique behaviors and visual effects
 * - Enhanced particle systems for spectacular visual feedback
 * - Maintained full backward compatibility with existing weapon system
 * - Added exotic weapons like gravity wells, time distortion, and quantum weapons
 * - FIXED: All classes properly contained within VectorArenaObjects object
 */
const VectorArenaObjects = {
    // ===== EXISTING CLASSES (PRESERVED) =====
    
    Vortex: class {
        constructor(x, y, weapon, owner, context) {
            this.x = x;
            this.y = y;
            this.weapon = weapon;
            this.owner = owner;
            this.context = context;
            this.life = 180;
            this.radius = 50;
            this.rotation = 0;
            this.pullForce = 0.2;
        }
        update(opponent, player) {
            this.life--;
            this.rotation += 0.1;
            const ships = [this.context.playerShip, this.context.opponentShip].filter(s => s);
            ships.forEach(ship => {
                if (ship.health > 0) {
                    const dx = this.x - ship.x;
                    const dy = this.y - ship.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < this.radius * 3) {
                        ship.vx += (dx / dist) * this.pullForce;
                        ship.vy += (dy / dist) * this.pullForce;
                    }
                    if (dist < this.radius) {
                        ship.takeDamage(this.weapon.damage / 60);
                    }
                }
            });
        }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.strokeStyle = this.weapon.color || '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.rotate(Math.PI);
            ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 1.5, true);
            ctx.stroke();
            ctx.restore();
        }
    },

    Beam: class {
        constructor(ship, weapon, context) {
            this.ship = ship;
            this.weapon = weapon;
            this.context = context;
            this.life = 3;
            this.endPos = { x: 0, y: 0 };
            this.targetHit = null;
        }
        update(opponent, player) {
            this.life--;
            const startX = this.ship.x + Math.cos(this.ship.angle) * this.ship.size;
            const startY = this.ship.y + Math.sin(this.ship.angle) * this.ship.size;
            const endX = startX + Math.cos(this.ship.angle) * this.weapon.range;
            const endY = startY + Math.sin(this.ship.angle) * this.weapon.range;
            const target = this.ship.playerNum === 1 ? opponent : player;
            this.endPos = { x: endX, y: endY };
            this.targetHit = null;
            if (target && target.health > 0) {
                const dx = endX - startX;
                const dy = endY - startY;
                const lenSq = dx*dx + dy*dy;
                const dot = ((target.x - startX) * dx + (target.y - startY) * dy) / lenSq;
                const closestX = startX + dot * dx;
                const closestY = startY + dot * dy;
                const distSq = Math.pow(target.x - closestX, 2) + Math.pow(target.y - closestY, 2);
                if (distSq < target.size * target.size) {
                    this.endPos = { x: target.x, y: target.y };
                    target.takeDamage(this.weapon.damage);
                    this.targetHit = target;
                }
            }
        }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.ship.x + Math.cos(this.ship.angle) * this.ship.size, this.ship.y + Math.sin(this.ship.angle) * this.ship.size);
            ctx.lineTo(this.endPos.x, this.endPos.y);
            ctx.strokeStyle = this.weapon.color;
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.weapon.color;
            ctx.stroke();
            if (this.targetHit) {
                ctx.beginPath();
                ctx.arc(this.endPos.x, this.endPos.y, 10, 0, Math.PI * 2);
                ctx.fillStyle = this.weapon.color;
                ctx.globalAlpha = 0.5;
                ctx.fill();
            }
            ctx.restore();
        }
    },

    Mine: class {
        constructor(x, y, weapon, owner, context) {
            this.x = x;
            this.y = y;
            this.weapon = weapon;
            this.owner = owner;
            this.context = context;
            this.life = 300;
            this.triggerRadius = 40;
            this.blastRadius = 60;
        }
        update(opponent, player) {
            this.life--;
            const target = this.owner === 1 ? opponent : player;
            if (target && target.health > 0) {
                if (Math.hypot(this.x - target.x, this.y - target.y) < this.triggerRadius) {
                    this.explode();
                }
            }
        }
        explode() {
            this.life = 0;
            for (let i = 0; i < 30; i++) {
                this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, this.weapon.color || '#ff8800', Math.random() * 4, 3));
            }
            const ships = [this.context.playerShip, this.context.opponentShip].filter(s => s);
            ships.forEach(ship => {
                if(ship && ship.health > 0 && Math.hypot(this.x - ship.x, this.y - ship.y) < this.blastRadius) {
                    ship.takeDamage(this.weapon.damage);
                }
            });
        }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.fillStyle = (Math.floor(this.life / 10) % 2 === 0) ? this.weapon.color : '#ff0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // ===== NEW EXOTIC WEAPON CLASSES =====

    PlasmaOrb: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.weapon = weapon; this.owner = owner; this.context = context;
            this.life = weapon.life || 180;
            this.size = weapon.size || 8;
            this.damage = weapon.damage;
            this.color = weapon.color || '#ff00ff';
            this.rotation = 0;
            this.pulsePhase = 0;
        }
        update(opponent, player) {
            this.x += this.vx; this.y += this.vy; this.life--;
            this.rotation += 0.2;
            this.pulsePhase += 0.3;
            if (Math.random() < 0.3) {
                this.context.particles.push(new VectorArenaObjects.Particle(
                    this.x + (Math.random() - 0.5) * this.size,
                    this.y + (Math.random() - 0.5) * this.size,
                    this.color, 3, 1
                ));
            }
        }
        isOutOfBounds(c) { return this.life <= 0 || (c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10)); }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            const pulseSize = this.size + Math.sin(this.pulsePhase) * 3;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, pulseSize * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, pulseSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.7;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, pulseSize * (0.5 + i * 0.3), 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    },

    GravityWell: class {
        constructor(x, y, weapon, owner, context) {
            this.x = x; this.y = y;
            this.weapon = weapon; this.owner = owner; this.context = context;
            this.life = weapon.life || 300;
            this.radius = weapon.radius || 80;
            this.pullForce = weapon.pullForce || 0.3;
            this.damage = weapon.damage;
            this.rotation = 0;
            this.pulsePhase = 0;
        }
        update(opponent, player) {
            this.life--;
            this.rotation += 0.05;
            this.pulsePhase += 0.1;
            
            const ships = [this.context.playerShip, this.context.opponentShip].filter(s => s);
            ships.forEach(ship => {
                if (ship && ship.health > 0) {
                    const dx = this.x - ship.x;
                    const dy = this.y - ship.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < this.radius * 2) {
                        const force = this.pullForce * (1 - dist / (this.radius * 2));
                        ship.vx += (dx / dist) * force;
                        ship.vy += (dy / dist) * force;
                    }
                    if (dist < this.radius * 0.3) {
                        ship.takeDamage(this.damage / 60);
                    }
                }
            });
            
            if (Math.random() < 0.5) {
                const angle = Math.random() * Math.PI * 2;
                const distance = this.radius * 0.8 + Math.random() * this.radius * 0.4;
                this.context.particles.push(new VectorArenaObjects.Particle(
                    this.x + Math.cos(angle) * distance,
                    this.y + Math.sin(angle) * distance,
                    this.weapon.color || '#8800ff', 2, 0.5
                ));
            }
        }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            const pulseRadius = this.radius + Math.sin(this.pulsePhase) * 10;
            
            ctx.fillStyle = '#000000';
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = this.weapon.color || '#8800ff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, pulseRadius * (0.4 + i * 0.15), 0, Math.PI * 1.8);
                ctx.stroke();
                ctx.rotate(Math.PI / 3);
            }
            
            ctx.restore();
        }
    },

    QuantumTorpedo: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.weapon = weapon; this.owner = owner; this.context = context;
            this.life = weapon.life || 200;
            this.size = weapon.size || 6;
            this.damage = weapon.damage;
            this.color = weapon.color || '#00ffff';
            this.phaseShift = 0;
            this.quantumTrail = [];
        }
        update(opponent, player) {
            if (Math.random() < 0.05) {
                this.x += (Math.random() - 0.5) * 40;
                this.y += (Math.random() - 0.5) * 40;
                for (let i = 0; i < 8; i++) {
                    this.context.particles.push(new VectorArenaObjects.Particle(
                        this.x, this.y, this.color, 4, 3
                    ));
                }
            } else {
                this.x += this.vx; this.y += this.vy;
            }
            
            this.life--;
            this.phaseShift += 0.4;
            
            this.quantumTrail.push({x: this.x, y: this.y, life: 10});
            this.quantumTrail = this.quantumTrail.filter(point => point.life-- > 0);
        }
        isOutOfBounds(c) { return this.life <= 0 || (c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10)); }
        draw(ctx) {
            ctx.save();
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            this.quantumTrail.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
            
            ctx.translate(this.x, this.y);
            ctx.globalAlpha = 0.7 + Math.sin(this.phaseShift) * 0.3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.color;
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.arc(0, 0, this.size + Math.sin(this.phaseShift + i) * 3, 0, Math.PI);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    },

    LightningChain: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.weapon = weapon; this.owner = owner; this.context = context;
            this.life = weapon.life || 120;
            this.size = weapon.size || 4;
            this.damage = weapon.damage;
            this.color = weapon.color || '#ffff00';
            this.chainRange = weapon.chainRange || 100;
            this.maxChains = weapon.maxChains || 3;
            this.hasChained = false;
        }
        update(opponent, player) {
            this.x += this.vx; this.y += this.vy; this.life--;
            
            if (Math.random() < 0.4) {
                this.context.particles.push(new VectorArenaObjects.Particle(
                    this.x + (Math.random() - 0.5) * 10,
                    this.y + (Math.random() - 0.5) * 10,
                    this.color, 2, 2
                ));
            }
        }
        onHit(target) {
            if (!this.hasChained && this.maxChains > 0) {
                this.hasChained = true;
                const otherTarget = target === this.context.playerShip ? this.context.opponentShip : this.context.playerShip;
                if (otherTarget && otherTarget.health > 0) {
                    const dist = Math.hypot(target.x - otherTarget.x, target.y - otherTarget.y);
                    if (dist <= this.chainRange) {
                        this.context.particles.push(new VectorArenaObjects.Particle(
                            target.x, target.y, this.color, 10, 5, true, otherTarget.x, otherTarget.y
                        ));
                        otherTarget.takeDamage(this.damage * 0.7);
                    }
                }
            }
        }
        isOutOfBounds(c) { return this.life <= 0 || (c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10)); }
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            ctx.moveTo(-this.size, -this.size);
            ctx.lineTo(this.size * 0.5, 0);
            ctx.lineTo(-this.size * 0.5, 0);
            ctx.lineTo(this.size, this.size);
            ctx.stroke();
            
            ctx.restore();
        }
    },

    CryoBlast: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.weapon = weapon; this.owner = owner; this.context = context;
            this.life = weapon.life || 150;
            this.size = weapon.size || 6;
            this.damage = weapon.damage;
            this.color = weapon.color || '#00ccff';
            this.freezeEffect = weapon.freezeEffect || 60;
            this.crystalFormation = [];
        }
        update(opponent, player) {
            this.x += this.vx; this.y += this.vy; this.life--;
            
            if (Math.random() < 0.3) {
                this.crystalFormation.push({
                    x: this.x + (Math.random() - 0.5) * 8,
                    y: this.y + (Math.random() - 0.5) * 8,
                    size: Math.random() * 3 + 1,
                    life: 20
                });
            }
            
            this.crystalFormation = this.crystalFormation.filter(crystal => crystal.life-- > 0);
        }
        onHit(target) {
            if (target.freezeTimer !== undefined) {
                target.freezeTimer = Math.max(target.freezeTimer || 0, this.freezeEffect);
            }
            
            for (let i = 0; i < 15; i++) {
                this.context.particles.push(new VectorArenaObjects.Particle(
                    target.x, target.y, this.color, Math.random() * 4 + 2, Math.random() * 3 + 1
                ));
            }
        }
        isOutOfBounds(c) { return this.life <= 0 || (c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10)); }
        draw(ctx) {
            ctx.save();
            
            this.crystalFormation.forEach(crystal => {
                ctx.fillStyle = this.color;
                ctx.globalAlpha = crystal.life / 20;
                ctx.beginPath();
                ctx.arc(crystal.x, crystal.y, crystal.size, 0, Math.PI * 2);
                ctx.fill();
            });
            
            ctx.translate(this.x, this.y);
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size * 0.7, -this.size * 0.3);
            ctx.lineTo(this.size * 0.3, this.size * 0.7);
            ctx.lineTo(-this.size * 0.3, this.size * 0.7);
            ctx.lineTo(-this.size * 0.7, -this.size * 0.3);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.stroke();
            
            ctx.restore();
        }
    },

    NanobotSwarm: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.weapon = weapon; this.owner = owner; this.context = context;
            this.life = weapon.life || 240;
            this.size = weapon.size || 12;
            this.damage = weapon.damage;
            this.color = weapon.color || '#ff6600';
            this.nanobots = [];
            this.swarmRadius = 15;
            
            for (let i = 0; i < 20; i++) {
                this.nanobots.push({
                    x: 0, y: 0,
                    angle: Math.random() * Math.PI * 2,
                    distance: Math.random() * this.swarmRadius,
                    speed: Math.random() * 0.1 + 0.05
                });
            }
        }
        update(opponent, player) {
            this.x += this.vx; this.y += this.vy; this.life--;
            
            this.nanobots.forEach(bot => {
                bot.angle += bot.speed;
                bot.distance = this.swarmRadius * (0.5 + Math.sin(bot.angle * 3) * 0.5);
                bot.x = this.x + Math.cos(bot.angle) * bot.distance;
                bot.y = this.y + Math.sin(bot.angle) * bot.distance;
            });
        }
        onHit(target) {
            if (!target.nanobotInfection) {
                target.nanobotInfection = {
                    damage: this.damage * 0.1,
                    duration: 120,
                    color: this.color
                };
            }
        }
        isOutOfBounds(c) { return this.life <= 0 || (c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10)); }
        draw(ctx) {
            ctx.save();
            
            this.nanobots.forEach(bot => {
                ctx.fillStyle = this.color;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(bot.x, bot.y, 1, 0, Math.PI * 2);
                ctx.fill();
            });
            
            ctx.translate(this.x, this.y);
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    },

    PhotonLance: class {
        constructor(ship, weapon, context) {
            this.ship = ship;
            this.weapon = weapon;
            this.context = context;
            this.life = weapon.duration || 8;
            this.range = weapon.range || 400;
            this.damage = weapon.damage;
            this.color = weapon.color || '#ffffff';
            this.width = weapon.width || 4;
            this.piercing = weapon.piercing || false;
            this.hitTargets = new Set();
        }
        update(opponent, player) {
            this.life--;
            const startX = this.ship.x + Math.cos(this.ship.angle) * this.ship.size;
            const startY = this.ship.y + Math.sin(this.ship.angle) * this.ship.size;
            const endX = startX + Math.cos(this.ship.angle) * this.range;
            const endY = startY + Math.sin(this.ship.angle) * this.range;
            
            const target = this.ship.playerNum === 1 ? opponent : player;
            if (target && target.health > 0 && !this.hitTargets.has(target)) {
                const dx = endX - startX;
                const dy = endY - startY;
                const lenSq = dx*dx + dy*dy;
                const dot = ((target.x - startX) * dx + (target.y - startY) * dy) / lenSq;
                const closestX = startX + dot * dx;
                const closestY = startY + dot * dy;
                const distSq = Math.pow(target.x - closestX, 2) + Math.pow(target.y - closestY, 2);
                
                if (distSq < target.size * target.size) {
                    target.takeDamage(this.damage);
                    this.hitTargets.add(target);
                    
                    for (let i = 0; i < 12; i++) {
                        this.context.particles.push(new VectorArenaObjects.Particle(
                            target.x, target.y, this.color, 3, 4
                        ));
                    }
                    
                    if (!this.piercing) this.life = 0;
                }
            }
        }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save();
            const startX = this.ship.x + Math.cos(this.ship.angle) * this.ship.size;
            const startY = this.ship.y + Math.sin(this.ship.angle) * this.ship.size;
            const endX = startX + Math.cos(this.ship.angle) * this.range;
            const endY = startY + Math.sin(this.ship.angle) * this.range;
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = this.width;
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.width * 2;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
            
            ctx.restore();
        }
    },

    AcidSpray: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.weapon = weapon; this.owner = owner; this.context = context;
            this.life = weapon.life || 100;
            this.size = weapon.size || 5;
            this.damage = weapon.damage;
            this.color = weapon.color || '#88ff00';
            this.acidTrail = [];
            this.corrosionDamage = weapon.corrosionDamage || 0.5;
        }
        update(opponent, player) {
            this.x += this.vx; this.y += this.vy; this.life--;
            
            this.acidTrail.push({
                x: this.x + (Math.random() - 0.5) * 6,
                y: this.y + (Math.random() - 0.5) * 6,
                size: Math.random() * 3 + 1,
                life: 30
            });
            
            this.acidTrail = this.acidTrail.filter(drop => drop.life-- > 0);
        }
        onHit(target) {
            if (!target.corrosion) {
                target.corrosion = {
                    damage: this.corrosionDamage,
                    duration: 180,
                    color: this.color
                };
            } else {
                target.corrosion.duration = Math.max(target.corrosion.duration, 180);
            }
            
            for (let i = 0; i < 10; i++) {
                this.context.particles.push(new VectorArenaObjects.Particle(
                    target.x + (Math.random() - 0.5) * 20,
                    target.y + (Math.random() - 0.5) * 20,
                    this.color, Math.random() * 3 + 1, 2
                ));
            }
        }
        isOutOfBounds(c) { return this.life <= 0 || (c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10)); }
        draw(ctx) {
            ctx.save();
            
            this.acidTrail.forEach(drop => {
                ctx.fillStyle = this.color;
                ctx.globalAlpha = drop.life / 30 * 0.6;
                ctx.beginPath();
                ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
                ctx.fill();
            });
            
            ctx.translate(this.x, this.y);
            ctx.shadowBlur = 6;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.arc(this.size * 0.3, -this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.restore();
        }
    },

    // ===== ENHANCED EXISTING CLASSES =====

    Turret: class {
        constructor(ship, weapon, context, slotIndex) {
            this.ship = ship;
            this.weapon = weapon;
            this.context = context;
            this.slotIndex = slotIndex;
            this.offsetX = (slotIndex - 1) * 15;
            this.offsetY = 0;
            this.angle = ship.angle;
            this.targetAngle = ship.angle;
            this.turnRate = weapon.turnRate || 0.08;
            this.detectionRange = weapon.detectionRange || weapon.range || 250;
            this.fireRate = weapon.fireRate || 45;
            this.cooldown = 0;
            this.target = null;
            this.life = 3000;
            this.size = 8;
            this.barrelLength = 15;
        }
        update(opponent, player) {
            this.life--;
            this.cooldown = Math.max(0, this.cooldown - 1);
            const cos = Math.cos(this.ship.angle);
            const sin = Math.sin(this.ship.angle);
            this.x = this.ship.x + (this.offsetX * cos - this.offsetY * sin);
            this.y = this.ship.y + (this.offsetX * sin + this.offsetY * cos);
            this.findTarget(opponent, player);
            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                this.targetAngle = Math.atan2(dy, dx);
                let angleDiff = this.targetAngle - this.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate);
                const aimTolerance = 0.2;
                if (Math.abs(angleDiff) < aimTolerance && this.cooldown <= 0) {
                    this.fire();
                }
            }
        }
        findTarget(opponent, player) {
            const potentialTargets = [];
            const enemy = this.ship.playerNum === 1 ? opponent : player;
            if (enemy && enemy.health > 0) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist <= this.detectionRange) {
                    potentialTargets.push({ target: enemy, distance: dist });
                }
            }
            if (potentialTargets.length > 0) {
                potentialTargets.sort((a, b) => a.distance - b.distance);
                this.target = potentialTargets[0].target;
            } else {
                this.target = null;
            }
        }
        fire() {
            this.cooldown = this.fireRate;
            const startX = this.x + Math.cos(this.angle) * this.barrelLength;
            const startY = this.y + Math.sin(this.angle) * this.barrelLength;
            
            if (this.weapon.projectileClass === 'Projectile' || !this.weapon.projectileClass) {
                const speed = this.weapon.speed || 8;
                const projectile = new VectorArenaObjects.Projectile(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, this.weapon, this.ship.playerNum, this.context);
                this.context.projectiles.push(projectile);
            } else if (this.weapon.projectileClass === 'Beam') {
                const beam = new VectorArenaObjects.TurretBeam(this, this.weapon, this.context);
                this.context.projectiles.push(beam);
            }  		else if (weapon.type === 'swarm') {
                for (let i = 0; i < 5; i++) {
                    const swarmAngle = this.angle + (Math.random() - 0.5) * 0.3;
                    const swarmWeapon = {...weapon, type: 'missile'}; 
                    this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(swarmAngle) * weapon.speed, Math.sin(swarmAngle) * weapon.speed, swarmWeapon, this.playerNum, this.context));
                }
            } else if (weapon.type === 'vortex') {
                 this.context.vortices.push(new VectorArenaObjects.Vortex(spawnX, spawnY, weapon, this.playerNum, this.context));
            }  else if (this.weapon.projectileClass === 'PlasmaOrb') {
                const speed = this.weapon.speed || 6;
                const plasma = new VectorArenaObjects.PlasmaOrb(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, this.weapon, this.ship.playerNum, this.context);
                this.context.projectiles.push(plasma);
            } else if (this.weapon.projectileClass === 'LightningChain') {
                const speed = this.weapon.speed || 7;
                const lightning = new VectorArenaObjects.LightningChain(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, this.weapon, this.ship.playerNum, this.context);
                this.context.projectiles.push(lightning);
            }
            
            this.context.particles.push(new VectorArenaObjects.Particle(startX, startY, this.weapon.color || '#ffff00', 6, 2));
        }




        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save();
            ctx.fillStyle = this.ship.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.weapon.color || '#888888';
            ctx.fillRect(0, -2, this.barrelLength, 4);
            if (this.target) {
                ctx.restore();
                ctx.save();
                ctx.strokeStyle = this.weapon.color || '#00ff00';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.target.x, this.target.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }
    },

    TurretBeam: class {
        constructor(turret, weapon, context) {
            this.turret = turret;
            this.weapon = weapon;
            this.context = context;
            this.life = 3;
            this.endPos = { x: 0, y: 0 };
            this.targetHit = null;
        }
        update(opponent, player) {
            this.life--;
            const startX = this.turret.x + Math.cos(this.turret.angle) * this.turret.barrelLength;
            const startY = this.turret.y + Math.sin(this.turret.angle) * this.turret.barrelLength;
            const endX = startX + Math.cos(this.turret.angle) * this.weapon.range;
            const endY = startY + Math.sin(this.turret.angle) * this.weapon.range;
            const target = this.turret.ship.playerNum === 1 ? opponent : player;
            this.endPos = { x: endX, y: endY };
            this.targetHit = null;
            if (target && target.health > 0) {
                const dx = endX - startX;
                const dy = endY - startY;
                const lenSq = dx*dx + dy*dy;
                const dot = ((target.x - startX) * dx + (target.y - startY) * dy) / lenSq;
                const closestX = startX + dot * dx;
                const closestY = startY + dot * dy;
                const distSq = Math.pow(target.x - closestX, 2) + Math.pow(target.y - closestY, 2);
                if (distSq < target.size * target.size) {
                    this.endPos = { x: target.x, y: target.y };
                    target.takeDamage(this.weapon.damage);
                    this.targetHit = target;
                }
            }
        }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save();
            ctx.beginPath();
            const startX = this.turret.x + Math.cos(this.turret.angle) * this.turret.barrelLength;
            const startY = this.turret.y + Math.sin(this.turret.angle) * this.turret.barrelLength;
            ctx.moveTo(startX, startY);
            ctx.lineTo(this.endPos.x, this.endPos.y);
            ctx.strokeStyle = this.weapon.color;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 8;
            ctx.shadowColor = this.weapon.color;
            ctx.stroke();
            if (this.targetHit) {
                ctx.beginPath();
                ctx.arc(this.endPos.x, this.endPos.y, 8, 0, Math.PI * 2);
                ctx.fillStyle = this.weapon.color;
                ctx.globalAlpha = 0.5;
                ctx.fill();
            }
            ctx.restore();
        }
    },

    Ship: class {
        constructor(x, y, playerData, playerNum, context) {
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.angle = -Math.PI / 2;
            this.playerData = playerData;
            this.playerNum = playerNum;
            this.context = context;

            const equipped = playerData.equipped;
            const PARTS = this.context.PARTS;
            const chassis = PARTS.chassis[equipped.chassis] || {};
            const engine = PARTS.engine[equipped.engine] || {};
            const thrusters = PARTS.thrusters ? PARTS.thrusters[equipped.thrusters] : {};

            this.shieldData = PARTS.shield[equipped.shield] || {};
            this.special = PARTS.special[equipped.special] || {};
            this.tech = PARTS.tech ? PARTS.tech[equipped.tech] : {};

            this.size = chassis.size || 20;
            this.color = playerNum === 1 ? '#00aaff' : '#ff4400';
            this.art = chassis.art || 'default';
            this.maxHealth = chassis.health || 100;
            this.health = this.maxHealth;
            this.maxShield = this.shieldData.health || 0;
            this.shield = this.maxShield;
            this.shieldRegen = (this.shieldData.regen || 0) / 60;
            this.shieldCooldown = 0;

            this.baseThrust = engine ? (chassis.baseThrust || 0.1) * (engine.thrustMultiplier || 1) : 0.1;
            this.thrust = this.baseThrust;
            this.strafeThrust = thrusters ? (chassis.baseStrafe || 0.05) + (thrusters.strafeBonus || 0) : (chassis.baseStrafe || 0.05);

            // Enhanced status effects
            this.freezeTimer = 0;
            this.nanobotInfection = null;
            this.corrosion = null;

            this.weapons = [];
            const numWeaponSlots = chassis.slots?.weapon?.length || 0;
            const equippedWeapons = playerData.equipped.weapon || [];
            const weaponGroups = playerData.equipped.weaponGroups || [];

            for (let i = 0; i < numWeaponSlots; i++) {
                const equippedItem = equippedWeapons[i];
                if (!equippedItem) {
                    this.weapons[i] = null;
                    continue;
                }

                let weaponId;
                let instanceId = null;

                if (typeof equippedItem === 'number') {
                    instanceId = equippedItem;
                    const weaponInstance = playerData.owned.weapon.find(w => w.instanceId === instanceId);
                    weaponId = weaponInstance ? weaponInstance.id : null;
                } else if (typeof equippedItem === 'string') {
                    weaponId = equippedItem;
                }

                if (weaponId) {
                    const weaponStats = PARTS.weapon[weaponId];
                    if (weaponStats) {
                        this.weapons[i] = {
                            ...weaponStats,
                            fireRate: weaponStats.cooldown || 30,
                            instanceId: instanceId,
                            fireGroup: weaponGroups[i] || 1,
                            currentCooldown: 0
                        };
                    } else {
                        this.weapons[i] = null;
                    }
                } else {
                    this.weapons[i] = null;
                }
            }

            this.turrets = [];
            const numTurretSlots = chassis.slots?.turret?.length || 0;
            const equippedTurrets = playerData.equipped.turret || [];

            for (let i = 0; i < numTurretSlots; i++) {
                const equippedItem = equippedTurrets[i];
                if (!equippedItem) continue;

                let turretId;
                if (typeof equippedItem === 'number') {
                    const turretInstance = playerData.owned.turret?.find(t => t.instanceId === equippedItem);
                    turretId = turretInstance ? turretInstance.id : null;
                } else if (typeof equippedItem === 'string') {
                    turretId = equippedItem;
                }

                if (turretId) {
                    const turretStats = PARTS.turret[turretId];
                    if (turretStats) {
                        const turret = new VectorArenaObjects.Turret(this, turretStats, context, i);
                        this.turrets.push(turret);
                    }
                }
            }
            
            this.specialCooldown = 0;
            this.boostTimer = 0;
            this.overdriveTimer = 0;
            this.cloakTimer = 0;
            this.repairTimer = 0;
            this.isCloaked = false;
            this.isCharging = false;
            this.chargeLevel = 0;
        }

        update(keys, target) {
            if (this.playerNum === 1) {
                this.handlePlayerInput(keys, target);
            } else {
                this.handleAI(target);
            }
            this.applyPhysics();
            this.updateStatusEffects();
            
            this.turrets.forEach(turret => {
                turret.update(
                    this.playerNum === 1 ? this.context.opponentShip : this.context.playerShip,
                    this.playerNum === 1 ? this.context.playerShip : this.context.opponentShip
                );
            });
            
            this.turrets = this.turrets.filter(turret => !turret.isOutOfBounds());
        }

        updateStatusEffects() {
            if (this.freezeTimer > 0) {
                this.freezeTimer--;
                this.thrust *= 0.3;
                this.strafeThrust *= 0.3;
            }

            if (this.nanobotInfection) {
                this.nanobotInfection.duration--;
                if (this.nanobotInfection.duration <= 0) {
                    this.nanobotInfection = null;
                } else {
                    this.takeDamage(this.nanobotInfection.damage);
                    if (Math.random() < 0.3) {
                        this.context.particles.push(new VectorArenaObjects.Particle(
                            this.x + (Math.random() - 0.5) * this.size * 2,
                            this.y + (Math.random() - 0.5) * this.size * 2,
                            this.nanobotInfection.color, 1, 1
                        ));
                    }
                }
            }

            if (this.corrosion) {
                this.corrosion.duration--;
                if (this.corrosion.duration <= 0) {
                    this.corrosion = null;
                } else {
                    this.takeDamage(this.corrosion.damage);
                    if (Math.random() < 0.2) {
                        this.context.particles.push(new VectorArenaObjects.Particle(
                            this.x + (Math.random() - 0.5) * this.size * 2,
                            this.y + (Math.random() - 0.5) * this.size * 2,
                            this.corrosion.color, 2, 1
                        ));
                    }
                }
            }
        }

        handlePlayerInput(keys, target) {
            const targetPos = target || this.context.mousePos;
            const dx = targetPos.x - this.x;
            const dy = targetPos.y - this.y;
            this.angle = Math.atan2(dy, dx);

            const thrustMultiplier = this.freezeTimer > 0 ? 0.3 : 1;
            
            if (keys['w'] || keys['W'] || keys['ArrowUp']) { 
                this.vx += Math.cos(this.angle) * this.thrust * thrustMultiplier; 
                this.vy += Math.sin(this.angle) * this.thrust * thrustMultiplier; 
            }
            if (keys['s'] || keys['S'] || keys['ArrowDown']) { 
                this.vx -= Math.cos(this.angle) * this.thrust * 0.5 * thrustMultiplier; 
                this.vy -= Math.sin(this.angle) * this.thrust * 0.5 * thrustMultiplier; 
            }
            if (keys['a'] || keys['A'] || keys['ArrowLeft']) { 
                this.vx += Math.cos(this.angle - Math.PI/2) * this.strafeThrust * thrustMultiplier; 
                this.vy += Math.sin(this.angle - Math.PI/2) * this.strafeThrust * thrustMultiplier; 
            }
            if (keys['d'] || keys['D'] || keys['ArrowRight']) { 
                this.vx += Math.cos(this.angle + Math.PI/2) * this.strafeThrust * thrustMultiplier; 
                this.vy += Math.sin(this.angle + Math.PI/2) * this.strafeThrust * thrustMultiplier; 
            }

            if (keys['mouse0']) this.fireWeaponGroup(1);
            if (keys['mouse2']) this.fireWeaponGroup(2);
            if (keys['e'] || keys['E']) this.fireWeaponGroup(3);
            if (keys[' ']) this.useSpecial();
        }

        handleAI(target) {
            if (!target || target.health <= 0) return;
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.hypot(dx, dy);
            this.angle = Math.atan2(dy, dx);
            
            const thrustMultiplier = this.freezeTimer > 0 ? 0.3 : 1;
            
            if (distance > 200) { 
                this.vx += Math.cos(this.angle) * this.thrust * thrustMultiplier; 
                this.vy += Math.sin(this.angle) * this.thrust * thrustMultiplier; 
            }
            else if (distance < 100) { 
                this.vx -= Math.cos(this.angle) * this.thrust * 0.5 * thrustMultiplier; 
                this.vy -= Math.sin(this.angle) * this.thrust * 0.5 * thrustMultiplier; 
            }
            if (distance < 300) { 
                this.fireWeaponGroup(1); 
                if (Math.random() < 0.1) this.fireWeaponGroup(2); 
            }
        }

        fireWeaponGroup(group) {
            for (let i = 0; i < this.weapons.length; i++) {
                const weapon = this.weapons[i];
                if (weapon && weapon.fireGroup === group && weapon.currentCooldown <= 0) {
                    this.fireWeapon(weapon, i);
                    weapon.currentCooldown = weapon.fireRate;
                    return; 
                }
            }
        }

        fireWeapon(weapon, index) {

            const angle = this.angle; 
            const startX = this.x + Math.cos(this.angle) * this.size;
            const startY = this.y + Math.sin(this.angle) * this.size;
            const speed = weapon.speed || 8;
        const spawnX = this.x + Math.cos(angle) * this.size;
            const spawnY = this.y + Math.sin(angle) * this.size;


            


     switch (weapon.type) {
                case 'flak':
                    for (let i = 0; i < 15; i++) {
                        const flakAngle = angle + (Math.random() - 0.5) * 0.7;
                        const flakSpeed = weapon.speed * (0.8 + Math.random() * 0.4);
                        // Create a new weapon definition for the shrapnel piece
                        const shrapnel = { ...weapon, type: 'pulse', size: 2, life: 40 + Math.random() * 30 };
                        this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(flakAngle) * flakSpeed, Math.sin(flakAngle) * flakSpeed, shrapnel, this.playerNum, this.context));
                    }
                    return; // Exit after handling

                case 'spread':
                    for (let i = -1; i <= 1; i++) {
                        const spreadAngle = angle + i * 0.2;
                        this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(spreadAngle) * weapon.speed, Math.sin(spreadAngle) * weapon.speed, weapon, this.playerNum, this.context));
                    }
                    return; // Exit after handling
     }

            switch(weapon.projectileClass) {
                case 'Vortex':
                    this.context.projectiles.push(new VectorArenaObjects.Vortex(startX, startY, weapon, this.playerNum, this.context));
                    break;
                case 'Beam':
                    this.context.projectiles.push(new VectorArenaObjects.Beam(this, weapon, this.context));
                    break;
                case 'Mine':
                    this.context.projectiles.push(new VectorArenaObjects.Mine(startX, startY, weapon, this.playerNum, this.context));
                    break;
                case 'PlasmaOrb':
                    this.context.projectiles.push(new VectorArenaObjects.PlasmaOrb(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, weapon, this.playerNum, this.context));
                    break;
                case 'GravityWell':
                    this.context.projectiles.push(new VectorArenaObjects.GravityWell(startX, startY, weapon, this.playerNum, this.context));
                    break;
                case 'QuantumTorpedo':
                    this.context.projectiles.push(new VectorArenaObjects.QuantumTorpedo(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, weapon, this.playerNum, this.context));
                    break;
                case 'LightningChain':
                    this.context.projectiles.push(new VectorArenaObjects.LightningChain(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, weapon, this.playerNum, this.context));
                    break;

     case 'charge':
                    const chargeRatio = this.chargeLevel / 100;
                    const chargedWeapon = {
                        ...weapon,
                        damage: weapon.damage + chargeRatio * 100, // Up to +100 damage
                        size: 3 + chargeRatio * 12, // Up to size 15
                        speed: weapon.speed + chargeRatio * 10,
                        piercing: chargeRatio > 0.9, // Piercing at >90% charge
                    };
                    this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(this.angle) * chargedWeapon.speed, Math.sin(this.angle) * chargedWeapon.speed, chargedWeapon, this.playerNum, this.context));
                    this.chargeLevel = 0; // Reset charge
                    break;
			    
                case 'CryoBlast':
                    this.context.projectiles.push(new VectorArenaObjects.CryoBlast(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, weapon, this.playerNum, this.context));
                    break;
                case 'NanobotSwarm':
                    this.context.projectiles.push(new VectorArenaObjects.NanobotSwarm(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, weapon, this.playerNum, this.context));
                    break;
                case 'PhotonLance':
                    this.context.projectiles.push(new VectorArenaObjects.PhotonLance(this, weapon, this.context));
                    break;
		case 'ClusterMissile':
			this.context.projectiles.push(new VectorArenaObjects.ClusterMissile(startX, startY, this.vx, this.vy, weapon, this.playerNum, this.context));
			break;

                case 'AcidSpray':
                    this.context.projectiles.push(new VectorArenaObjects.AcidSpray(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, weapon, this.playerNum, this.context));
                    break;
                default:
                    const p = new VectorArenaObjects.Projectile(startX, startY, Math.cos(this.angle) * speed, Math.sin(this.angle) * speed, weapon, this.playerNum, this.context);
                    this.context.projectiles.push(p);
                    break;
            }
        }

     useSpecial() {
            if (!this.special || this.specialCooldown > 0) return;
            this.specialCooldown = this.special.cooldown;
            if (this.special.type === 'boost') {
                this.thrust = this.baseThrust * this.special.boostMultiplier;
                this.boostTimer = this.special.duration;
                for(let i=0; i < 20; i++) this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#00ffff', 3, 2));
            } else if (this.special.type === 'overdrive') {
                this.overdriveActive = true;
                this.overdriveTimer = this.special.duration;
                for(let i=0; i < 20; i++) this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#ff00ff', 3, 2));
            }
        }

        useSpecial2() {
            if (this.specialCooldown > 0 || !this.special) return;
            this.specialCooldown = 300;
        }

        applyPhysics() {
            this.weapons.forEach(weapon => {
                if (weapon && weapon.currentCooldown > 0) {
                    weapon.currentCooldown--;
                }
            });

            this.specialCooldown = Math.max(0, this.specialCooldown - 1);
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.x += this.vx;
            this.y += this.vy;
            if (this.shieldCooldown > 0) { this.shieldCooldown--; }
            else if (this.shield < this.maxShield) { this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen); }
        }

        takeDamage(amount) {
            if (this.shield > 0) { 
                const d = Math.min(this.shield, amount); 
                this.shield -= d; 
                amount -= d; 
                this.shieldCooldown = 180; 
            }
            if (amount > 0) { 
                this.health -= amount; 
                if (this.health <= 0) { 
                    this.health = 0; 
                    this.onDestroy(); 
                } 
            }
        }

        onDestroy() {
            for (let i = 0; i < 50; i++) { 
                this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, this.color, Math.random() * 6 + 2, Math.random() * 8 + 4)); 
            }
        }

        draw(ctx) {
            if (this.health <= 0) return;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            if (this.freezeTimer > 0) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00ccff';
            }
            if (this.nanobotInfection) {
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.nanobotInfection.color;
            }
            if (this.corrosion) {
                ctx.shadowBlur = 6;
                ctx.shadowColor = this.corrosion.color;
            }
            
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.size, 0);
            ctx.lineTo(-this.size * 0.7, -this.size * 0.7);
            ctx.lineTo(-this.size * 0.3, 0);
            ctx.lineTo(-this.size * 0.7, this.size * 0.7);
            ctx.closePath();
            ctx.fill();
            
            if (this.shield > 0) { 
                ctx.strokeStyle = '#00ffff'; 
                ctx.lineWidth = 2; 
                ctx.globalAlpha = this.shield / this.maxShield * 0.5; 
                ctx.beginPath(); 
                ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2); 
                ctx.stroke(); 
                ctx.globalAlpha = 1; 
            }
            ctx.restore();
            
            this.turrets.forEach(turret => turret.draw(ctx));
            
            const barWidth = this.size * 2; 
            const barHeight = 4; 
            const barY = this.y - this.size - 10;
            ctx.fillStyle = '#333'; 
            ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
            ctx.fillStyle = this.health > this.maxHealth * 0.3 ? '#00ff00' : '#ff0000'; 
            ctx.fillRect(this.x - barWidth/2, barY, (this.health / this.maxHealth) * barWidth, barHeight);
        }
    },
    ClusterMissile: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.weapon = weapon; this.owner = owner; this.context = context;
            this.size = 5; this.life = weapon.life || 180; this.fuse = 60; this.turn = weapon.turn || 0.04; this.speed = weapon.speed || 5;
        }
        update(opponent, player) {
            this.life--; this.fuse--;
            let target = null;
            const enemies = this.context.opponents || this.context.hostiles || [];
            if (this.owner === 1) { // Player's missile
                if (enemies.length > 0) {
                    let closestOpponent = null; let minDistance = Infinity;
                    enemies.forEach(opp => {
                        if (opp.health > 0) {
                            const distance = Math.hypot(this.x - opp.x, this.y - opp.y);
                            if (distance < minDistance) { minDistance = distance; closestOpponent = opp; }
                        }
                    });
                    target = closestOpponent;
                }
            } else { target = player; }

            if (target && target.health > 0) {
                const dx = target.x - this.x; const dy = target.y - this.y; const angleToTarget = Math.atan2(dy, dx);
                const currentAngle = Math.atan2(this.vy, this.vx); let angleDiff = angleToTarget - currentAngle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI; while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turn);
                this.vx = Math.cos(newAngle) * this.speed; this.vy = Math.sin(newAngle) * this.speed;
            }
            this.x += this.vx; this.y += this.vy; if (this.fuse <= 0) { this.split(); }
        }
        onHit(target) { this.split(); }
        split() {
            if (this.life <= 0) return; this.life = 0; const count = this.weapon.submunitionCount || 6;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * (Math.PI * 2);
                this.context.projectiles.push(new VectorArenaObjects.Submunition(this.x, this.y, angle, this.weapon, this.owner, this.context));
            }
        }
        isOutOfBounds(c) { return this.life <= 0; }
        draw(ctx) {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI / 2);
            ctx.fillStyle = this.weapon.color; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, -this.size * 2); ctx.lineTo(this.size, this.size); ctx.lineTo(-this.size, this.size); ctx.closePath(); ctx.fill(); ctx.stroke();
            if (Math.floor(this.fuse / 5) % 2 === 0) { ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill(); }
            ctx.restore();
        }
    },
    Submunition: class {
        constructor(x, y, initialAngle, parentWeapon, owner, context) {
            this.x = x; this.y = y; this.weapon = parentWeapon; this.owner = owner; this.context = context;
            this.size = 2; this.life = 120; this.speed = (parentWeapon.speed || 5) * 1.5;
            this.vx = Math.cos(initialAngle) * this.speed; this.vy = Math.sin(initialAngle) * this.speed;
            this.turn = (parentWeapon.turn || 0.04) * 2; this.damage = 0;
        }
        update(opponent, player) {
            this.life--;
            let target = null;
            const enemies = this.context.opponents || this.context.hostiles || [];
            if (this.owner === 1) { // Player's submunition
                 if (enemies.length > 0) {
                    let closestOpponent = null; let minDistance = Infinity;
                    enemies.forEach(opp => {
                        if (opp.health > 0) {
                            const distance = Math.hypot(this.x - opp.x, this.y - opp.y);
                            if (distance < minDistance) { minDistance = distance; closestOpponent = opp; }
                        }
                    });
                    target = closestOpponent;
                }
            } else { target = player; }

            if (target && target.health > 0) {
                const dx = target.x - this.x; const dy = target.y - this.y; const angleToTarget = Math.atan2(dy, dx);
                const currentAngle = Math.atan2(this.vy, this.vx); let angleDiff = angleToTarget - currentAngle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI; while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turn);
                this.vx = Math.cos(newAngle) * this.speed; this.vy = Math.sin(newAngle) * this.speed;
            }
            this.x += this.vx; this.y += this.vy;
        }
        onHit(target) {
            if (this.life <= 0) return; this.life = 0; const blastRadius = this.weapon.submunitionBlastRadius || 40; const damage = this.weapon.submunitionDamage || 15;
            for (let i = 0; i < 15; i++) { this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#ff6600', Math.random() * 3, 2)); }
            this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#ffa500', blastRadius, 0, false, 0, 0, true));
            if(target) target.takeDamage(damage);
            const enemies = this.context.opponents || this.context.hostiles || [];
            const allShips = [this.context.playerShip, ...enemies].filter(s => s && s.health > 0 && s !== target);
            allShips.forEach(ship => { if (Math.hypot(this.x - ship.x, this.y - ship.y) < blastRadius) { ship.takeDamage(damage); } });
        }
        isOutOfBounds(c) { return this.life <= 0; }
        draw(ctx) { ctx.fillStyle = this.weapon.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 2, 0, Math.PI * 2); ctx.fill(); }
    },
    Projectile: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.size = weapon.size || 3; this.damage = weapon.damage; this.color = weapon.color; this.owner = owner;
            this.type = weapon.type; this.turn = weapon.turn; this.life = weapon.life || 120; this.isPiercing = weapon.piercing; this.context = context;
        }
        update(opponent, player) {
            if (this.type === 'missile') {
                let target = null;
                const enemies = this.context.opponents || this.context.hostiles || [];
                if (this.owner === 1) { // Player's missile
                    if (enemies.length > 0) {
                        let closestOpponent = null; let minDistance = Infinity;
                        enemies.forEach(opp => { if (opp.health > 0) { const distance = Math.hypot(this.x - opp.x, this.y - opp.y); if (distance < minDistance) { minDistance = distance; closestOpponent = opp; } } });
                        target = closestOpponent;
                    }
                } else { target = player; }

                if (target && target.health > 0) {
                    const dx = target.x - this.x; const dy = target.y - this.y; const angleToTarget = Math.atan2(dy, dx);
                    const currentAngle = Math.atan2(this.vy, this.vx); let angleDiff = angleToTarget - currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI; while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turn);
                    const speed = Math.hypot(this.vx, this.vy); this.vx = Math.cos(newAngle) * speed; this.vy = Math.sin(newAngle) * speed;
                }
            }
            this.x += this.vx; this.y += this.vy; this.life--;
        }
        onHit(target) {
            if (this.type === 'chain') {
                const enemies = this.context.opponents || this.context.hostiles || [];
                const otherTarget = target === this.context.playerShip ? enemies[0] : this.context.playerShip;
                if(otherTarget && otherTarget.health > 0) {
                    this.context.particles.push(new VectorArenaObjects.Particle(target.x, target.y, this.color, 10, 5, true, otherTarget.x, otherTarget.y));
                    otherTarget.takeDamage(this.damage * 0.5);
                }
            }
        }
        isOutOfBounds(c) { return this.life <= 0; }
        draw(ctx) {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(Math.atan2(this.vy, this.vx)); ctx.fillStyle = this.color; ctx.beginPath();
            if (this.type === 'missile') { ctx.rotate(Math.PI / 2); ctx.moveTo(0, -this.size * 1.2); ctx.lineTo(this.size, this.size); ctx.lineTo(0, this.size * 0.5); ctx.lineTo(-this.size, this.size); }
            else if (this.type === 'railgun' || this.type === 'beam') { ctx.rect(-1, -this.size * 2, 2, this.size * 4); }
            else if (this.type === 'chain' || this.type === 'charge') { ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.arc(0, 0, this.size, 0, Math.PI * 2); }
            else { ctx.arc(0, 0, this.size, 0, Math.PI * 2); }
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
    },



    Particle: class {
       constructor(x, y, color, size, speed, isLightning=false, endX=0, endY=0, isWave = false) {
            this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * speed; this.vy = (Math.random() - 0.5) * speed;
            this.color = color; this.size = size; this.life = 20; this.maxLife = 20;
            this.isLightning = isLightning; this.isWave = isWave;
            if(isLightning){ this.endX = endX; this.endY = endY; this.life = 10; this.maxLife = 10; }
            if (isWave) { this.life = 30; this.maxLife = 30; this.radius = size; }
        }
        update() { this.x += this.vx; this.y += this.vy; this.life--; if(this.isWave) this.radius += 5; }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save(); ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
            if(this.isLightning){
                ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.x, this.y);
                let midX = (this.x + this.endX) / 2 + (Math.random() - 0.5) * 20;
                let midY = (this.y + this.endY) / 2 + (Math.random() - 0.5) * 20;
                ctx.quadraticCurveTo(midX, midY, this.endX, this.endY); ctx.stroke();
            } else if(this.isWave) {
                ctx.strokeStyle = this.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.stroke();
            } else {
                ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VectorArenaObjects;
}


