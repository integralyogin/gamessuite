/**
 * vectorArenaObjects.js - v10 (Full Specials & Shield Fix)
 * A shared library containing game objects. This major update implements
 * all special abilities (Boost, Cloak, EMP, Repair, Overdrive) and fixes
 * the shield health and regeneration systems.
 */
const VectorArenaObjects = {

    Vortex: class {
        constructor(x, y, weapon, owner, context) {
            this.x = x; this.y = y;
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
            this.x = x; this.y = y;
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

    Ship: class {
        constructor(x, y, playerData, playerNum, context) {
            this.x = x; this.y = y; this.vx = 0; this.vy = 0;
            this.angle = -Math.PI / 2;
            this.playerData = playerData;
            this.playerNum = playerNum;
            this.context = context;
            const equipped = playerData.equipped;
            const PARTS = this.context.PARTS;
            const chassis = PARTS.chassis[equipped.chassis];
            const engine = PARTS.engine[equipped.engine];
            const thrusters = PARTS.thrusters[equipped.thrusters];
            this.shieldData = PARTS.shield[equipped.shield];
            this.special = PARTS.special[equipped.special];
            this.tech = PARTS.tech[equipped.tech];

            this.size = chassis.size;
            this.color = playerNum === 1 ? '#00aaff' : '#ff4400';
            this.art = chassis.art;
            this.maxHealth = chassis.health;
            this.health = this.maxHealth;
            
            this.maxShield = this.shieldData ? this.shieldData.health : 0;
            this.shield = this.maxShield;
            this.shieldRegen = this.shieldData ? this.shieldData.regen / 60 : 0;
            this.shieldCooldown = 0;

            this.baseThrust = engine ? chassis.baseThrust * engine.thrustMultiplier : 0;
            this.thrust = this.baseThrust;
            this.strafeThrust = thrusters ? chassis.baseStrafe + thrusters.strafeBonus : chassis.baseStrafe;
            
            this.primaryWeaponCooldown = 0;
            this.secondaryWeaponCooldown = 0;
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
        }

        handlePlayerInput(keys, target){
            const targetPos = target || this.context.mousePos;
            const dx = targetPos.x - this.x;
            const dy = targetPos.y - this.y;
            this.angle = Math.atan2(dy, dx);

            const primaryWeapon = this.context.PARTS.weapon[this.playerData.owned.weapon.find(w => w.instanceId === this.playerData.equipped.weapon)?.id];
            if (primaryWeapon && primaryWeapon.type === 'charge') {
                if (keys['mouse0']) {
                    this.isCharging = true;
                    this.chargeLevel = Math.min(100, this.chargeLevel + 1.5);
                } else if (this.isCharging) {
                    this.firePrimary();
                    this.isCharging = false;
                }
            } else {
                 if (keys['mouse0']) this.firePrimary();
            }

            if (keys['mouse2']) this.fireSecondary();
            if (keys[' ']) this.useSpecial();
            if (keys['w']) this.accelerate(1);
            if (keys['s']) this.accelerate(-0.5);
            if (keys['a']) this.strafe(-1);
            if (keys['d']) this.strafe(1);
        }

        handleAI(target) {
            if (!target || target.health <= 0 || target.isCloaked) {
                this.accelerate(0.3);
                return;
            }

            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.hypot(dx, dy);
            this.angle = Math.atan2(dy, dx);
            
            const weapon = this.context.PARTS.weapon[this.playerData.owned.weapon.find(w => w.instanceId === this.playerData.equipped.weapon)?.id];
            
            if (weapon) {
                const idealRange = weapon.range || 350;
                if (distance > idealRange) this.accelerate(0.8);
                else if (distance < idealRange * 0.7) this.accelerate(-0.5);

                if (weapon.type === 'charge') {
                     this.isCharging = true;
                     this.chargeLevel = Math.min(100, this.chargeLevel + 1.5);
                     if(this.chargeLevel >= 100) {
                         this.firePrimary();
                         this.isCharging = false;
                     }
                } else {
                    this.firePrimary();
                }
            } else {
                if (distance > 200) this.accelerate(0.8);
            }
            
            if (this.health < this.maxHealth / 2 && Math.random() < 0.01) this.useSpecial();
        }

        applyPhysics() {
            this.x += this.vx; this.y += this.vy;
            this.vx *= 0.98; this.vy *= 0.98;
            if (this.primaryWeaponCooldown > 0) this.primaryWeaponCooldown--;
            if (this.secondaryWeaponCooldown > 0) this.secondaryWeaponCooldown--;
            if (this.specialCooldown > 0) this.specialCooldown--;

            if (this.boostTimer > 0) { this.boostTimer--; if (this.boostTimer <= 0) this.thrust = this.baseThrust; }
            if (this.overdriveTimer > 0) { this.overdriveTimer--; }
            if (this.cloakTimer > 0) { this.cloakTimer--; if (this.cloakTimer <= 0) this.isCloaked = false; }
            if (this.repairTimer > 0) {
                this.repairTimer--;
                this.health = Math.min(this.maxHealth, this.health + 20 / 60);
                if (Math.random() < 0.2) this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#2ecc71', 2, 1));
            }

            if(this.shieldCooldown > 0) this.shieldCooldown--;
            if(this.shield < this.maxShield && this.shieldCooldown <= 0) {
                this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen);
            }

            const canvas = this.context.canvas;
            if (canvas && canvas.width > 0) {
                if (this.x < -this.size) this.x = canvas.width + this.size;
                if (this.x > canvas.width + this.size) this.x = -this.size;
                if (this.y < -this.size) this.y = canvas.height + this.size;
                if (this.y > canvas.height + this.size) this.y = -this.size;
            }
        }
        
        takeDamage(amount) {
            this.shieldCooldown = 180;
            if (this.shield > 0) {
                const damageToShield = Math.min(this.shield, amount);
                this.shield -= damageToShield;
                amount -= damageToShield;
            }
            if (amount > 0) {
                this.health = Math.max(0, this.health - amount);
            }
        }

        fire(weaponInstanceId, cooldownSlot) {
            if (!weaponInstanceId || this[cooldownSlot] > 0) return;
            const weaponInstance = this.playerData.owned.weapon.find(w => w.instanceId === weaponInstanceId);
            if (!weaponInstance) return;
            const weapon = this.context.PARTS.weapon[weaponInstance.id];
            if (!weapon) return;

            if (weapon.type === 'charge' && !this.isCharging) return;

            const cooldownReduction = this.tech && this.tech.cooldownReduction ? this.tech.cooldownReduction : 0;
            let finalCooldown = Math.max(1, weapon.cooldown - cooldownReduction);
            if (this.overdriveTimer > 0) finalCooldown /= 2;
            this[cooldownSlot] = finalCooldown;

            const spawnX = this.x + Math.cos(this.angle) * this.size;
            const spawnY = this.y + Math.sin(this.angle) * this.size;

            switch (weapon.type) {
                case 'beam':
                    this.context.beams.push(new VectorArenaObjects.Beam(this, weapon, this.context));
                    break;
                case 'mine':
                    const mineX = this.x - Math.cos(this.angle) * (this.size + 10);
                    const mineY = this.y - Math.sin(this.angle) * (this.size + 10);
                    this.context.mines.push(new VectorArenaObjects.Mine(mineX, mineY, weapon, this.playerNum, this.context));
                    break;
                case 'charge':
                    const chargeRatio = this.chargeLevel / 100;
                    const chargedWeapon = {
                        ...weapon,
                        damage: weapon.damage + chargeRatio * 90,
                        size: 3 + chargeRatio * 12,
                        speed: weapon.speed + chargeRatio * 10,
                        piercing: chargeRatio > 0.9,
                    };
                    this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(this.angle) * chargedWeapon.speed, Math.sin(this.angle) * chargedWeapon.speed, chargedWeapon, this.playerNum, this.context));
                    this.chargeLevel = 0;
                    break;
                default:
                    this.createProjectiles(spawnX, spawnY, weapon);
                    break;
            }
            if (weapon.type !== 'beam' && weapon.type !== 'mine') {
                 this.context.particles.push(new VectorArenaObjects.Particle(spawnX, spawnY, '#ffffff', 2, 0.5));
            }
        }
        
        createProjectiles(spawnX, spawnY, weapon){
            const angle = this.angle;
            switch(weapon.type){
                case 'spread':
                    for (let i = -1; i <= 1; i++) {
                        const spreadAngle = angle + i * 0.2;
                        this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(spreadAngle) * weapon.speed, Math.sin(spreadAngle) * weapon.speed, weapon, this.playerNum, this.context));
                    }
                    break;
                case 'flak':
                    for (let i = 0; i < 15; i++) { 
                        const flakAngle = angle + (Math.random() - 0.5) * 0.7;
                        const flakSpeed = weapon.speed * (0.8 + Math.random() * 0.4);
                        const shrapnel = {...weapon, size: 2, life: 40 + Math.random() * 30}; 
                        this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(flakAngle) * flakSpeed, Math.sin(flakAngle) * flakSpeed, shrapnel, this.playerNum, this.context));
                    }
                    break;
                case 'swarm':
                    for (let i = 0; i < 5; i++) {
                        const swarmAngle = angle + (Math.random() - 0.5) * 0.3;
                        const swarmWeapon = {...weapon, type: 'missile'}; 
                        this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, Math.cos(swarmAngle) * weapon.speed, Math.sin(swarmAngle) * weapon.speed, swarmWeapon, this.playerNum, this.context));
                    }
                    break;
                case 'vortex':
                     this.context.vortices.push(new VectorArenaObjects.Vortex(spawnX, spawnY, weapon, this.playerNum, this.context));
                     break;
                default:
                    const vx = Math.cos(angle) * weapon.speed;
                    const vy = Math.sin(angle) * weapon.speed;
                    this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, vx, vy, weapon, this.playerNum, this.context));
                    break;
            }
        }
        
        firePrimary() { this.fire(this.playerData.equipped.weapon, 'primaryWeaponCooldown'); }
        fireSecondary() { this.fire(this.playerData.equipped.weapon_secondary, 'secondaryWeaponCooldown'); }
        
        useSpecial() {
            if (!this.special || this.specialCooldown > 0) return;
            this.specialCooldown = this.special.cooldown;
            
            switch (this.special.type) {
                case 'boost':
                    this.thrust = this.baseThrust * this.special.boostMultiplier;
                    this.boostTimer = this.special.duration;
                    for (let i = 0; i < 20; i++) this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#00ffff', 3, 2));
                    break;
                case 'overdrive':
                    this.overdriveTimer = this.special.duration;
                    for (let i = 0; i < 20; i++) this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#ff00ff', 3, 2));
                    break;
                case 'repair':
                    this.repairTimer = this.special.duration || 300;
                    break;
                case 'cloak':
                    this.isCloaked = true;
                    this.cloakTimer = this.special.duration;
                    break;
                case 'emp':
                    this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#4a90e2', this.size * 2, 0, false, 0, 0, true));
                    break;
            }
        }
        
        accelerate(dir) { const force = this.thrust * dir; this.vx += Math.cos(this.angle) * force; this.vy += Math.sin(this.angle) * force; }
        strafe(dir) { const force = this.strafeThrust * dir; const strafeAngle = this.angle + Math.PI / 2; this.vx += Math.cos(strafeAngle) * force; this.vy += Math.sin(strafeAngle) * force; }
        
        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            ctx.globalAlpha = this.isCloaked ? 0.3 : 1.0;

            if (this.isCharging) {
                const chargeRatio = this.chargeLevel / 100;
                ctx.beginPath();
                ctx.arc(this.size, 0, 2 + this.chargeLevel * 0.15, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(243, 156, 18, ${chargeRatio})`;
                ctx.fill();
            }

            let currentFillStyle = this.color;
            if (this.overdriveTimer > 0) {
                currentFillStyle = (Math.floor(this.overdriveTimer / 5) % 2 === 0) ? this.color : '#ff00ff';
            }
            
            if (this.shield > 0) {
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 1.2, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 150, 255, ${0.2 + (this.shield / this.maxShield) * 0.6})`;
                ctx.fillStyle = `rgba(0, 50, 100, ${0.1 + (this.shield / this.maxShield) * 0.2})`;
                ctx.lineWidth = 1 + (this.shield / this.maxShield) * 2;
                ctx.fill();
                ctx.stroke();
            }

            ctx.rotate(this.angle);
            ctx.fillStyle = currentFillStyle;
            ctx.beginPath();
            if (this.art === 'juggernaut') {
                ctx.rect(-this.size * 0.8, -this.size * 0.6, this.size * 1.6, this.size * 1.2);
            } else {
                ctx.moveTo(this.size, 0);
                ctx.lineTo(-this.size / 2, this.size / 2);
                ctx.lineTo(-this.size / 2, -this.size / 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    },
    
    Projectile: class {
        constructor(x, y, vx, vy, weapon, owner, context) {
            this.x = x; this.y = y; this.vx = vx; this.vy = vy;
            this.size = weapon.size;
            this.color = weapon.color || '#ff00ff';
            this.damage = weapon.damage;
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

        isOutOfBounds(c) { return c && c.width > 0 && (this.x < -10 || this.x > c.width + 10 || this.y < -10 || this.y > c.height + 10); }
        
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
        update() { this.x += this.vx; this.y += this.vy; this.life--; if(this.isWave) this.radius += 5;}
        isOutOfBounds() { return false; }
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

