/**
 * vectorArenaObjects.js - v10.3 (Turret Support)
 * This file defines the core game objects for Vector Arena.
 * v10.3 Changes:
 * - Added Turret class for auto-aiming weapons
 * - Modified Ship class to support turret weapons
 * - Turrets automatically target nearest enemy within range
 * - Turrets integrate with existing fire group system
 */
const VectorArenaObjects = {
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

    // NEW: Turret class for auto-aiming weapons
    Turret: class {
        constructor(ship, weapon, context, slotIndex) {
            this.ship = ship;
            this.weapon = weapon;
            this.context = context;
            this.slotIndex = slotIndex;
            
            // Turret positioning relative to ship
            this.offsetX = (slotIndex - 1) * 15; // Spread turrets across ship
            this.offsetY = 0;
            
            // Turret properties
            this.angle = ship.angle;
            this.targetAngle = ship.angle;
            this.turnRate = weapon.turnRate || 0.08;
            this.detectionRange = weapon.detectionRange || weapon.range || 250;
            this.fireRate = weapon.fireRate || 45;
            this.cooldown = 0;
            this.target = null;
            //this.life = weapon.duration || 300; // How long turret lasts
            this.life = 3000; // How long turret lasts
            
            // Visual properties
            this.size = 8;
            this.barrelLength = 15;
        }

        update(opponent, player) {
            this.life--;
            this.cooldown = Math.max(0, this.cooldown - 1);
            
            // Update turret position relative to ship
            const cos = Math.cos(this.ship.angle);
            const sin = Math.sin(this.ship.angle);
            this.x = this.ship.x + (this.offsetX * cos - this.offsetY * sin);
            this.y = this.ship.y + (this.offsetX * sin + this.offsetY * cos);
            
            // Find target
            this.findTarget(opponent, player);
            
            // Rotate toward target
            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                this.targetAngle = Math.atan2(dy, dx);
                
                // Smoothly rotate toward target
                let angleDiff = this.targetAngle - this.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                this.angle += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate);
                
                // Fire if aimed at target and cooldown ready
                const aimTolerance = 0.2; // Radians
                if (Math.abs(angleDiff) < aimTolerance && this.cooldown <= 0) {
                    this.fire();
                }
            }
        }

        findTarget(opponent, player) {
            const potentialTargets = [];
            
            // Add enemy ship as potential target
            const enemy = this.ship.playerNum === 1 ? opponent : player;
            if (enemy && enemy.health > 0) {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist <= this.detectionRange) {
                    potentialTargets.push({ target: enemy, distance: dist });
                }
            }
            
            // Find closest target
            if (potentialTargets.length > 0) {
                potentialTargets.sort((a, b) => a.distance - b.distance);
                this.target = potentialTargets[0].target;
            } else {
                this.target = null;
            }
        }

        fire() {
            this.cooldown = this.fireRate;
            
            // Create projectile based on weapon type
            const startX = this.x + Math.cos(this.angle) * this.barrelLength;
            const startY = this.y + Math.sin(this.angle) * this.barrelLength;
            
            if (this.weapon.projectileClass === 'Projectile' || !this.weapon.projectileClass) {
                // Standard projectile
                const speed = this.weapon.speed || 8;
                const projectile = new VectorArenaObjects.Projectile(
                    startX, startY,
                    Math.cos(this.angle) * speed,
                    Math.sin(this.angle) * speed,
                    this.weapon,
                    this.ship.playerNum,
                    this.context
                );
                this.context.projectiles.push(projectile);
            } else if (this.weapon.projectileClass === 'Beam') {
                // Beam weapon - create temporary beam from turret
                const beam = new VectorArenaObjects.TurretBeam(this, this.weapon, this.context);
                this.context.projectiles.push(beam);
            }
            
            // Add muzzle flash particle
            this.context.particles.push(
                new VectorArenaObjects.Particle(startX, startY, this.weapon.color || '#ffff00', 6, 2)
            );
        }

        isOutOfBounds() {
            return this.life <= 0;
        }

        draw(ctx) {
            ctx.save();
            
            // Draw turret base
            ctx.fillStyle = this.ship.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw turret barrel
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.weapon.color || '#888888';
            ctx.fillRect(0, -2, this.barrelLength, 4);
            
            // Draw targeting indicator if has target
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

    // Beam weapon fired from turret
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

            // --- MODIFICATION START: Equip weapons and assign to fire groups ---
            this.weapons = [];
            const numWeaponSlots = chassis.slots?.weapon?.length || 0;
            const equippedWeapons = playerData.equipped.weapon || [];
            const weaponGroups = playerData.equipped.weaponGroups || []; // Will be added in Hangar later

            for (let i = 0; i < numWeaponSlots; i++) {
                const instanceId = equippedWeapons[i];
                if (instanceId) {
                    const weaponInstance = playerData.owned.weapon.find(w => w.instanceId === instanceId);
                    if (weaponInstance) {
                        const weaponStats = PARTS.weapon[weaponInstance.id];
                        if (weaponStats) {
                            this.weapons[i] = {
                                ...weaponStats,
                                instanceId: weaponInstance.instanceId,
                                fireGroup: weaponGroups[i] || 1 // Default to group 1 if not set
                            };
                        } else {
                            this.weapons[i] = null;
                        }
                    } else {
                        this.weapons[i] = null;
                    }
                } else {
                    this.weapons[i] = null;
                }
            }

            // --- NEW: Equip turrets ---
            this.turrets = [];
            const numTurretSlots = chassis.slots?.turret?.length || 0;
            const equippedTurrets = playerData.equipped.turret || [];

            for (let i = 0; i < numTurretSlots; i++) {
                const instanceId = equippedTurrets[i];
                if (instanceId) {
                    const turretInstance = playerData.owned.turret.find(t => t.instanceId === instanceId);
                    if (turretInstance) {
                        const turretStats = PARTS.turret[turretInstance.id];
                        if (turretStats) {
                            // Create turret object
                            const turret = new VectorArenaObjects.Turret(this, turretStats, context, i);
                            this.turrets.push(turret);
                        }
                    }
                }
            }
            // --- MODIFICATION END ---

            this.fireGroupCooldown = [0, 0, 0]; // Cooldowns for Group 1, 2, 3
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
            
            // Update turrets
            this.turrets.forEach(turret => {
                turret.update(
                    this.playerNum === 1 ? this.context.opponentShip : this.context.playerShip,
                    this.playerNum === 1 ? this.context.playerShip : this.context.opponentShip
                );
            });
            
            // Remove expired turrets
            this.turrets = this.turrets.filter(turret => !turret.isOutOfBounds());
        }

        handlePlayerInput(keys, target) {
            const targetPos = target || this.context.mousePos;
            const dx = targetPos.x - this.x;
            const dy = targetPos.y - this.y;
            this.angle = Math.atan2(dy, dx);

            // Movement
            if (keys['w'] || keys['W'] || keys['ArrowUp']) {
                this.vx += Math.cos(this.angle) * this.thrust;
                this.vy += Math.sin(this.angle) * this.thrust;
            }
            if (keys['s'] || keys['S'] || keys['ArrowDown']) {
                this.vx -= Math.cos(this.angle) * this.thrust * 0.5;
                this.vy -= Math.sin(this.angle) * this.thrust * 0.5;
            }
            if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
                this.vx += Math.cos(this.angle - Math.PI/2) * this.strafeThrust;
                this.vy += Math.sin(this.angle - Math.PI/2) * this.strafeThrust;
            }
            if (keys['d'] || keys['D'] || keys['ArrowRight']) {
                this.vx += Math.cos(this.angle + Math.PI/2) * this.strafeThrust;
                this.vy += Math.sin(this.angle + Math.PI/2) * this.strafeThrust;
            }

            // Weapon firing
            if (keys['mouseLeft']) this.fireWeaponGroup(1);
            if (keys['mouseRight']) this.fireWeaponGroup(2);
            if (keys['e'] || keys['E']) this.fireWeaponGroup(3);

            // Special abilities
            if (keys[' ']) this.useSpecial();
        }

        handleAI(target) {
            if (!target || target.health <= 0) return;

            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.hypot(dx, dy);
            this.angle = Math.atan2(dy, dx);

            // Simple AI movement
            if (distance > 200) {
                this.vx += Math.cos(this.angle) * this.thrust;
                this.vy += Math.sin(this.angle) * this.thrust;
            } else if (distance < 100) {
                this.vx -= Math.cos(this.angle) * this.thrust * 0.5;
                this.vy -= Math.sin(this.angle) * this.thrust * 0.5;
            }

            // AI weapon firing
            if (distance < 300) {
                this.fireWeaponGroup(1);
                if (Math.random() < 0.1) this.fireWeaponGroup(2);
            }
        }

        fireWeaponGroup(group) {
            if (this.fireGroupCooldown[group - 1] > 0) return;

            let fired = false;
            this.weapons.forEach((weapon, index) => {
                if (weapon && weapon.fireGroup === group) {
                    this.fireWeapon(weapon, index);
                    fired = true;
                }
            });

            if (fired) {
                this.fireGroupCooldown[group - 1] = 30; // Set cooldown
            }
        }

        fireWeapon(weapon, index) {
            const startX = this.x + Math.cos(this.angle) * this.size;
            const startY = this.y + Math.sin(this.angle) * this.size;

            if (weapon.projectileClass === 'Vortex') {
                this.context.projectiles.push(new VectorArenaObjects.Vortex(startX, startY, weapon, this.playerNum, this.context));
            } else if (weapon.projectileClass === 'Beam') {
                this.context.projectiles.push(new VectorArenaObjects.Beam(this, weapon, this.context));
            } else if (weapon.projectileClass === 'Mine') {
                this.context.projectiles.push(new VectorArenaObjects.Mine(startX, startY, weapon, this.playerNum, this.context));
            } else {
                // Standard projectile
                const speed = weapon.speed || 8;
                const projectile = new VectorArenaObjects.Projectile(
                    startX, startY,
                    Math.cos(this.angle) * speed,
                    Math.sin(this.angle) * speed,
                    weapon,
                    this.playerNum,
                    this.context
                );
                this.context.projectiles.push(projectile);
            }
        }

        useSpecial() {
            if (this.specialCooldown > 0 || !this.special) return;
            
            // Special ability implementation would go here
            this.specialCooldown = 300;
        }

        applyPhysics() {
            // Update cooldowns
            for (let i = 0; i < this.fireGroupCooldown.length; i++) {
                this.fireGroupCooldown[i] = Math.max(0, this.fireGroupCooldown[i] - 1);
            }
            this.specialCooldown = Math.max(0, this.specialCooldown - 1);

            // Apply drag
            this.vx *= 0.98;
            this.vy *= 0.98;

            // Update position
            this.x += this.vx;
            this.y += this.vy;

            // Shield regeneration
            if (this.shieldCooldown > 0) {
                this.shieldCooldown--;
            } else if (this.shield < this.maxShield) {
                this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen);
            }
        }

        takeDamage(amount) {
            if (this.shield > 0) {
                const shieldDamage = Math.min(this.shield, amount);
                this.shield -= shieldDamage;
                amount -= shieldDamage;
                this.shieldCooldown = 180; // 3 seconds at 60fps
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
            // Death effects
            for (let i = 0; i < 50; i++) {
                this.context.particles.push(new VectorArenaObjects.Particle(
                    this.x, this.y, this.color, Math.random() * 6 + 2, Math.random() * 8 + 4
                ));
            }
        }

        draw(ctx) {
            if (this.health <= 0) return;

            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // Draw ship
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.size, 0);
            ctx.lineTo(-this.size * 0.7, -this.size * 0.7);
            ctx.lineTo(-this.size * 0.3, 0);
            ctx.lineTo(-this.size * 0.7, this.size * 0.7);
            ctx.closePath();
            ctx.fill();

            // Draw shield
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

            // Draw turrets
            this.turrets.forEach(turret => turret.draw(ctx));

            // Draw health bar
            const barWidth = this.size * 2;
            const barHeight = 4;
            const barY = this.y - this.size - 10;
            
            ctx.fillStyle = '#333';
            ctx.fillRect(this.x - barWidth/2, barY, barWidth, barHeight);
            
            ctx.fillStyle = this.health > this.maxHealth * 0.3 ? '#00ff00' : '#ff0000';
            ctx.fillRect(this.x - barWidth/2, barY, (this.health / this.maxHealth) * barWidth, barHeight);
        }
    },

    Projectile: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.size = weapon.size || 3;
            this.damage = weapon.damage;
            this.color = weapon.color;
            this.owner = owner;
            this.type = weapon.type;
            this.turn = weapon.turn;
            this.life = weapon.life || 120;
            this.isPiercing = weapon.piercing;
            this.context = context;
        }
        
        update(opponent, player) {
            if (this.type === 'missile') {
                const target = this.owner === 1 ? opponent : player;
                if (target && target.health > 0) {
                    const dx = target.x - this.x;
                    const dy = target.y - this.y;
                    const angleToTarget = Math.atan2(dy, dx);
                    const currentAngle = Math.atan2(this.vy, this.vx);
                    let angleDiff = angleToTarget - currentAngle;
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    const newAngle = currentAngle + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turn);
                    const speed = Math.hypot(this.vx, this.vy);
                    this.vx = Math.cos(newAngle) * speed;
                    this.vy = Math.sin(newAngle) * speed;
                }
            }
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
        }
        
        onHit(target) {
            if (this.type === 'chain') {
                const otherTarget = target === this.context.playerShip ? this.context.opponentShip : this.context.playerShip;
                if(otherTarget && otherTarget.health > 0) {
                    this.context.particles.push(new VectorArenaObjects.Particle(target.x, target.y, this.color, 10, 5, true, otherTarget.x, otherTarget.y));
                    otherTarget.takeDamage(this.damage * 0.5); // Chain hit does 50% damage
                }
            }
        }

        isOutOfBounds(c) { 
            return this.life <= 0 || (c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10)); 
        }
        
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Math.atan2(this.vy, this.vx));
            ctx.fillStyle = this.color;
            ctx.beginPath();
            if (this.type === 'missile') {
                ctx.rotate(Math.PI / 2);
                ctx.moveTo(0, -this.size * 1.2);
                ctx.lineTo(this.size, this.size);
                ctx.lineTo(0, this.size * 0.5);
                ctx.lineTo(-this.size, this.size);
            } else if (this.type === 'railgun' || this.type === 'beam') {
                ctx.rect(-1, -this.size * 2, 2, this.size * 4);
            } else if (this.type === 'chain' || this.type === 'charge') {
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            } else {
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    },
    
    Particle: class {
       constructor(x, y, color, size, speed, isLightning=false, endX=0, endY=0, isWave = false) {
            this.x = x; this.y = y;
            this.vx = (Math.random() - 0.5) * speed;
            this.vy = (Math.random() - 0.5) * speed;
            this.color = color;
            this.size = size;
            this.life = 20;
            this.maxLife = 20;
            this.isLightning = isLightning;
            this.isWave = isWave;

            if(isLightning){
                this.endX = endX;
                this.endY = endY;
                this.life = 10;
                this.maxLife = 10;
            }
            if (isWave) {
                this.life = 30;
                this.maxLife = 30;
                this.radius = size;
            }
        }
        update() { 
            this.x += this.vx; 
            this.y += this.vy; 
            this.life--; 
            if(this.isWave) this.radius += 5;
        }
        isOutOfBounds() { return this.life <= 0; }
        draw(ctx) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
            if(this.isLightning){
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                let midX = (this.x + this.endX) / 2 + (Math.random() - 0.5) * 20;
                let midY = (this.y + this.endY) / 2 + (Math.random() - 0.5) * 20;
                ctx.quadraticCurveTo(midX, midY, this.endX, this.endY);
                ctx.stroke();
            } else if(this.isWave) {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }
};


