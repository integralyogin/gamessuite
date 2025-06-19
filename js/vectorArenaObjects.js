/**
 * vectorArenaObjects.js
 * A shared library containing the classes for game objects like Ship, Projectile, and Particle.
 * This ensures consistent behavior across different game modes (Test Flight, Combat, etc.).
 */
const VectorArenaObjects = {

    Ship: class {
        constructor(x, y, playerData, playerNum, context) {
            this.x = x; this.y = y; this.vx = 0; this.vy = 0;
            this.angle = -Math.PI / 2;
            this.playerData = playerData;
            this.playerNum = playerNum;
            this.context = context; // The calling game module (e.g., VectorTestFlightGame)
            
            const equipped = playerData.equipped;
            const PARTS = this.context.PARTS; // Use the parts list from the calling module

            const chassis = PARTS.chassis[equipped.chassis];
            const engine = PARTS.engine[equipped.engine];
            const thrusters = PARTS.thrusters[equipped.thrusters];
            this.shield = PARTS.shield[equipped.shield];
            this.special = PARTS.special[equipped.special];
            this.tech = PARTS.tech[equipped.tech];
            
            this.size = chassis.size;
            this.color = playerNum === 1 ? '#00aaff' : '#ff4400';
            this.art = chassis.art;
            this.maxHealth = chassis.health;
            this.health = this.maxHealth;
            this.baseThrust = engine ? chassis.baseThrust * engine.thrustMultiplier : 0;
            this.thrust = this.baseThrust;
            this.strafeThrust = thrusters ? chassis.baseStrafe + thrusters.strafeBonus : chassis.baseStrafe;
            
            this.primaryWeaponCooldown = 0;
            this.secondaryWeaponCooldown = 0;
            this.specialCooldown = 0;
            this.boostTimer = 0;
        }

        update(keys, target) {
            if (this.playerNum === 1) { // Player Control
                const targetPos = target || this.context.mousePos;
                const dx = targetPos.x - this.x;
                const dy = targetPos.y - this.y;
                this.angle = Math.atan2(dy, dx);
                if (keys['mouse0']) this.firePrimary();
                if (keys['mouse2']) this.fireSecondary(); 
                if (keys[' ']) this.useSpecial();
                if (keys['w']) this.accelerate(1);
                if (keys['s']) this.accelerate(-0.5);
                if (keys['a']) this.strafe(-1);
                if (keys['d']) this.strafe(1);
            } else { // AI Control
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const distance = Math.hypot(dx, dy);
                this.angle = Math.atan2(dy, dx);
                if (distance > 200) this.accelerate(0.8);
                if (distance < 400) this.firePrimary();
            }

            this.x += this.vx; this.y += this.vy;
            this.vx *= 0.98; this.vy *= 0.98;
            
            if (this.primaryWeaponCooldown > 0) this.primaryWeaponCooldown--;
            if (this.secondaryWeaponCooldown > 0) this.secondaryWeaponCooldown--;
            if (this.specialCooldown > 0) this.specialCooldown--;
            if (this.boostTimer > 0) {
                this.boostTimer--;
                if(this.boostTimer <= 0) this.thrust = this.baseThrust; 
            }
            
            const canvas = this.context.canvas;
            if (canvas && canvas.width > 0) {
                if (this.x < -this.size) this.x = canvas.width + this.size; 
                if (this.x > canvas.width + this.size) this.x = -this.size;
                if (this.y < -this.size) this.y = canvas.height + this.size;
                if (this.y > canvas.height + this.size) this.y = -this.size;
            }
        }
        
        takeDamage(amount) { this.health = Math.max(0, this.health - amount); }
        
        fire(weaponInstanceId, cooldownSlot) {
            if (!weaponInstanceId || this[cooldownSlot] > 0) return;
            
            const weaponInstance = this.playerData.owned.weapon.find(w => w.instanceId === weaponInstanceId);
            if (!weaponInstance) return;
            const weapon = this.context.PARTS.weapon[weaponInstance.id];
            if (!weapon) return;
            
            const cooldownReduction = this.tech && this.tech.cooldownReduction ? this.tech.cooldownReduction : 0;
            this[cooldownSlot] = Math.max(1, weapon.cooldown - cooldownReduction);
            
            const spawnX = this.x + Math.cos(this.angle) * this.size;
            const spawnY = this.y + Math.sin(this.angle) * this.size;
            
            if(weapon.type === 'spread') {
                 for (let i = -1; i <= 1; i++) {
                    const spreadAngle = this.angle + i * 0.2;
                    const vx = Math.cos(spreadAngle) * weapon.speed;
                    const vy = Math.sin(spreadAngle) * weapon.speed;
                    this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, vx, vy, weapon, this.playerNum, this.context));
                }
            } else { 
                const vx = Math.cos(this.angle) * weapon.speed;
                const vy = Math.sin(this.angle) * weapon.speed;
                this.context.projectiles.push(new VectorArenaObjects.Projectile(spawnX, spawnY, vx, vy, weapon, this.playerNum, this.context));
            }
            this.context.particles.push(new VectorArenaObjects.Particle(spawnX, spawnY, '#ffffff', 2, 0.5));
        }

        firePrimary() { this.fire(this.playerData.equipped.weapon, 'primaryWeaponCooldown'); }
        fireSecondary() { this.fire(this.playerData.equipped.weapon_secondary, 'secondaryWeaponCooldown'); }

        useSpecial() {
            if (!this.special || this.specialCooldown > 0) return;
            this.specialCooldown = this.special.cooldown;
            
            this.thrust = this.baseThrust * this.special.boostMultiplier;
            this.boostTimer = this.special.duration;

            for(let i=0; i < 20; i++){
                 this.context.particles.push(new VectorArenaObjects.Particle(this.x, this.y, '#00ffff', 3, 2));
            }
        }
        
        accelerate(dir) { const force = this.thrust * dir; this.vx += Math.cos(this.angle) * force; this.vy += Math.sin(this.angle) * force; }
        strafe(dir) { const force = this.strafeThrust * dir; const strafeAngle = this.angle + Math.PI / 2; this.vx += Math.cos(strafeAngle) * force; this.vy += Math.sin(strafeAngle) * force; }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            if (this.shield) {
                ctx.beginPath();
                ctx.arc(0, 0, this.size * 1.2, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(0, 150, 255, 0.5)";
                ctx.fillStyle = "rgba(0, 50, 100, 0.2)";
                ctx.lineWidth = 1;
                ctx.fill();
                ctx.stroke();
            }

            ctx.rotate(this.angle);
            ctx.fillStyle = this.color;
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
            this.color = weapon.color;
            this.damage = weapon.damage;
            this.owner = owner; 
            this.type = weapon.type;
            this.turn = weapon.turn;
            this.life = 120;
            this.isPiercing = weapon.type === 'railgun';
            this.context = context;
        }
        update(opponent, player) {
            if (this.type === 'missile') {
                // In test flight, target is mouse; in combat, target is the other ship
                const target = this.owner === 1 ? opponent : player;
                if (target) {
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
            }
            else {
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    },
    
    Particle: class {
        constructor(x, y, color, size, speed) {
            this.x = x; this.y = y;
            this.vx = (Math.random() - 0.5) * speed;
            this.vy = (Math.random() - 0.5) * speed;
            this.color = color;
            this.size = size;
            this.life = 20;
        }
        update() { this.x += this.vx; this.y += this.vy; this.life--; }
        isOutOfBounds() { return false; }
        draw(ctx) {
            ctx.globalAlpha = Math.max(0, this.life / 20);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
};

