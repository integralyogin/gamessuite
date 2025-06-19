const MagicSystem = {
    effects: [],
    cooldowns: {},
    spellbook: {},
    craftingBook: {},

    init: function() {
        console.log("Enhanced Magic System v0.04 initialized");
        this.spellbook = {
            lightningBolt: {
                id: 'lightningBolt',
                name: 'Lightning Bolt',
                cooldown: 25,
                manaCost: 15, // Reduced from 20 for 50 max mana
                damage: 25,
                cast: function(options) {
                    let damage = this.damage;
                    
                    // Apply weapon bonuses
                    if (options.caster && options.caster.equippedWeapon && options.caster.equippedWeapon.spellPowerBonus) {
                        damage *= options.caster.equippedWeapon.spellPowerBonus;
                    }
                    
                    if (options.targetObject && options.targetObject.health !== undefined) {
                        options.targetObject.health -= damage;
                    }
                    
                    // Enhanced lightning effect with multiple branches
                    let start = options.caster || { x: options.target.x, y: options.target.y - 150 };
                    const segments = 8;
                    
                    for (let i = 0; i < segments; i++) {
                        let nextPoint = {
                            x: start.x + (Math.random() - 0.5) * 30 * (i + 1),
                            y: start.y + (i + 1) * ((options.target.y - start.y) / segments)
                        };
                        
                        if (i === segments - 1) nextPoint = options.target;
                        
                        // Main bolt
                        MagicSystem.effects.push({
                            type: 'line',
                            startX: start.x, startY: start.y,
                            endX: nextPoint.x, endY: nextPoint.y,
                            life: 12,
                            color: `rgba(255, 255, 150, 0.9)`,
                            width: 3
                        });
                        
                        // Side branches
                        if (Math.random() > 0.6) {
                            const branchEnd = {
                                x: nextPoint.x + (Math.random() - 0.5) * 40,
                                y: nextPoint.y + (Math.random() - 0.5) * 20
                            };
                            MagicSystem.effects.push({
                                type: 'line',
                                startX: nextPoint.x, startY: nextPoint.y,
                                endX: branchEnd.x, endY: branchEnd.y,
                                life: 8,
                                color: `rgba(200, 200, 255, 0.6)`,
                                width: 1
                            });
                        }
                        
                        start = nextPoint;
                    }
                    
                    // Impact particles
                    for (let i = 0; i < 15; i++) {
                        MagicSystem.effects.push({
                            type: 'particle',
                            x: options.target.x,
                            y: options.target.y,
                            size: Math.random() * 3 + 1,
                            life: 20,
                            color: `rgba(255, 255, 100, ${Math.random() * 0.5 + 0.5})`,
                            vx: (Math.random() - 0.5) * 4,
                            vy: (Math.random() - 0.5) * 4
                        });
                    }
                }
            },
            
            // Enhanced combat spells
            fireball: {
                id: 'fireball',
                name: 'Fireball',
                cooldown: 40,
                manaCost: 20, // Reduced from 25 for 50 max mana
                damage: 35,
                range: 120,
                cast: function(params) {
                    const { caster, target, targetObject } = params;
                    
                    if (caster.mana < this.manaCost) return false;
                    caster.mana -= this.manaCost;
                    
                    // Create fireball projectile
                    const dx = target.x - caster.x;
                    const dy = target.y - caster.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const speed = 8;
                    
                    MagicSystem.effects.push({
                        type: 'projectile',
                        x: caster.x,
                        y: caster.y,
                        targetX: target.x,
                        targetY: target.y,
                        vx: (dx / distance) * speed,
                        vy: (dy / distance) * speed,
                        size: 6,
                        life: Math.ceil(distance / speed),
                        color: 'rgba(255, 100, 0, 0.9)',
                        damage: this.damage,
                        damageType: 'magical',
                        caster: caster,
                        onHit: function(hitTarget) {
                            if (typeof CombatSystem !== 'undefined' && hitTarget) {
                                CombatSystem.dealDamage(caster, hitTarget, this.damage, 'magical');
                                
                                // Explosion effect
                                for (let i = 0; i < 12; i++) {
                                    MagicSystem.effects.push({
                                        type: 'particle',
                                        x: this.x,
                                        y: this.y,
                                        size: Math.random() * 4 + 2,
                                        life: 25,
                                        color: `rgba(255, ${Math.random() * 100 + 100}, 0, 0.8)`,
                                        vx: (Math.random() - 0.5) * 8,
                                        vy: (Math.random() - 0.5) * 8
                                    });
                                }
                            }
                        }
                    });
                    
                    MagicSystem.cooldowns[this.id] = this.cooldown;
                    return true;
                }
            },
            
            heal: {
                id: 'heal',
                name: 'Heal',
                cooldown: 60,
                manaCost: 15, // Reduced from 20 for 50 max mana
                healAmount: 40,
                cast: function(params) {
                    const { caster, target, targetObject } = params;
                    
                    if (caster.mana < this.manaCost) return false;
                    caster.mana -= this.manaCost;
                    
                    const healTarget = targetObject && targetObject.health !== undefined ? targetObject : caster;
                    const actualHeal = Math.min(this.healAmount, healTarget.maxHealth - healTarget.health);
                    healTarget.health += actualHeal;
                    
                    // Create healing effect
                    if (typeof CombatSystem !== 'undefined') {
                        CombatSystem.createDamageNumber(healTarget.x, healTarget.y, actualHeal, 'healing');
                    }
                    
                    for (let i = 0; i < 10; i++) {
                        MagicSystem.effects.push({
                            type: 'particle',
                            x: healTarget.x,
                            y: healTarget.y,
                            size: Math.random() * 3 + 1,
                            life: 30,
                            color: 'rgba(0, 255, 0, 0.8)',
                            vx: (Math.random() - 0.5) * 4,
                            vy: (Math.random() - 0.5) * 4 - 2
                        });
                    }
                    
                    MagicSystem.cooldowns[this.id] = this.cooldown;
                    console.log(`Healed ${healTarget.id} for ${actualHeal} HP`);
                    return true;
                }
            },
            
            shield: {
                id: 'shield',
                name: 'Magic Shield',
                cooldown: 120,
                manaCost: 25, // Reduced from 30 for 50 max mana
                duration: 3000, // 5 seconds at 60fps
                cast: function(params) {
                    const { caster, target, targetObject } = params;
                    
                    if (caster.mana < this.manaCost) return false;
                    caster.mana -= this.manaCost;
                    
                    const shieldTarget = targetObject && targetObject.health !== undefined ? targetObject : caster;
                    
                    // Apply shield effect
                    shieldTarget.magicShield = {
                        duration: this.duration,
                        absorption: 50,
                        maxAbsorption: 50
                    };
                    
                    // Visual effect
                    for (let i = 0; i < 15; i++) {
                        MagicSystem.effects.push({
                            type: 'particle',
                            x: shieldTarget.x + (Math.random() - 0.5) * 20,
                            y: shieldTarget.y + (Math.random() - 0.5) * 20,
                            size: 2,
                            life: 40,
                            color: 'rgba(0, 150, 255, 0.7)',
                            vx: 0,
                            vy: 0
                        });
                    }
                    
                    MagicSystem.cooldowns[this.id] = this.cooldown;
                    console.log(`Applied magic shield to ${shieldTarget.id}`);
                    return true;
                }
            },
            
            teleport: {
                id: 'teleport',
                name: 'Teleport',
                cooldown: 100,
                manaCost: 30, // Reduced from 35 for 50 max mana
                cast: function(options) {
                    if (!options.caster) return;
                    
                    // Departure effect
                    for (let i = 0; i < 25; i++) {
                        MagicSystem.effects.push({
                            type: 'particle',
                            x: options.caster.x,
                            y: options.caster.y,
                            size: Math.random() * 4 + 1,
                            life: 30,
                            color: `rgba(170, 0, 255, ${Math.random() * 0.7 + 0.3})`,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5
                        });
                    }
                    
                    // Teleport
                    options.caster.x = options.target.x;
                    options.caster.y = options.target.y;
                    options.caster.target = null;
                    
                    // Arrival effect
                    for (let i = 0; i < 25; i++) {
                        MagicSystem.effects.push({
                            type: 'particle',
                            x: options.target.x,
                            y: options.target.y,
                            size: Math.random() * 4 + 1,
                            life: 30,
                            color: `rgba(255, 170, 255, ${Math.random() * 0.7 + 0.3})`,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5
                        });
                    }
                }
            },
            
            lightningTurretShot: {
                id: 'lightningTurretShot',
                damage: 12,
                cast: function(options) {
                    if (options.targetObject && options.targetObject.health !== undefined) {
                        options.targetObject.health -= this.damage;
                    }
                    
                    MagicSystem.effects.push({
                        type: 'line',
                        startX: options.caster.x,
                        startY: options.caster.y,
                        endX: options.targetObject.x,
                        endY: options.targetObject.y,
                        life: 8,
                        color: `rgba(180, 220, 255, 0.8)`,
                        width: 2
                    });
                }
            },
            
            ballLightning: {
                id: 'ballLightning',
                name: 'Ball Lightning',
                cooldown: 500,
                manaCost: 50, // Reduced from 60 to match max mana
                cast: function(options) {
                    const pixels = [];
                    for(let i = 0; i < 25; i++) {
                        pixels.push({
                            x: (Math.random() - 0.5) * 18,
                            y: (Math.random() - 0.5) * 18,
                            size: Math.random() * 4 + 1,
                            color: `rgba(255, 255, ${100 + Math.random() * 155}, ${Math.random() * 0.5 + 0.4})`,
                            vx: (Math.random() - 0.5) * 0.6,
                            vy: (Math.random() - 0.5) * 0.6,
                        });
                    }
                    
                    return {
                        summon: {
                            type: 'ball_lightning',
                            x: options.target.x,
                            y: options.target.y,
                            size: 14,
                            life: 400,
                            maxLife: 400,
                            speed: 1.2,
                            orbitalSpeed: 0.6,
                            repulsionRadius: 90,
                            target: null,
                            attackCooldown: 0,
                            attackSpeed: 50,
                            pixels: pixels,
                            pixelPattern: 'ballLightning'
                        }
                    };
                }
            }
        };

        this.craftingBook = {
            lightningTurret: {
                id: 'lightningTurret',
                name: 'Lightning Turret',
                woodCost: 4,
                stoneCost: 4,
                manaCost: 50,
                prerequisite: 'lightningBolt',
                stats: GameConfig.createEntity('lightningTurret', {
                    attackCooldown: 0
                })
            }
        };
    },
    
    getSpell(spellId) {
        return this.spellbook[spellId];
    },

    getStructureBlueprint(structureId) {
        return this.craftingBook[structureId];
    },

    castSpell: function(spellId, options) {
        const spell = this.getSpell(spellId);
        if (!spell) {
            console.warn(`Spell ${spellId} not found.`);
            return;
        }
        if (!options.caster) {
            console.log("No caster selected.");
            return;
        }
        
        if (this.cooldowns[spellId] > 0) {
            console.log(`${spell.name} is on cooldown.`);
            return;
        }

        let manaCost = spell.manaCost;
        
        // Apply weapon bonuses to mana cost
        if (options.caster.equippedWeapon && options.caster.equippedWeapon.spellPowerBonus) {
            manaCost = Math.floor(manaCost / options.caster.equippedWeapon.spellPowerBonus);
        }

        if (options.caster.mana < manaCost) {
            console.log("Not enough mana!");
            return;
        }

        options.caster.mana -= manaCost;
        this.cooldowns[spell.id] = spell.cooldown;
        return spell.cast(options);
    },

    update: function() {
        // Update cooldowns
        for (const spellId in this.cooldowns) {
            if (this.cooldowns[spellId] > 0) {
                this.cooldowns[spellId]--;
            }
        }
        
        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life--;
            
            if (effect.type === 'particle') {
                effect.x += effect.vx;
                effect.y += effect.vy;
                effect.vx *= 0.98; // Air resistance
                effect.vy *= 0.98;
            } else if (effect.type === 'projectile') {
                effect.x += effect.vx;
                effect.y += effect.vy;
                
                // Check for collision with entities if this is a damage projectile
                if (effect.damage && effect.caster && typeof bitCraftGame !== 'undefined') {
                    const entities = [...bitCraftGame.playerUnits, ...bitCraftGame.gameObjects];
                    for (const entity of entities) {
                        if (entity === effect.caster) continue; // Don't hit caster
                        if (!entity.health || entity.health <= 0) continue; // Skip dead entities
                        
                        const dx = entity.x - effect.x;
                        const dy = entity.y - effect.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < (entity.size || 10)) {
                            // Hit!
                            if (effect.onHit) {
                                effect.onHit.call(effect, entity);
                            }
                            effect.life = 0; // Remove projectile
                            break;
                        }
                    }
                }
            }
            
            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    },

    draw: function(ctx) {
        for (const effect of this.effects) {
            ctx.save();
            
            if (effect.type === 'particle') {
                ctx.fillStyle = effect.color;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (effect.type === 'projectile') {
                ctx.fillStyle = effect.color;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Add trail effect for projectiles
                ctx.strokeStyle = effect.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(effect.x - effect.vx, effect.y - effect.vy);
                ctx.lineTo(effect.x, effect.y);
                ctx.stroke();
            } else if (effect.type === 'line') {
                // Draw lightning bolts and line effects
                ctx.strokeStyle = effect.color;
                ctx.lineWidth = effect.width || 2;
                ctx.beginPath();
                ctx.moveTo(effect.startX, effect.startY);
                ctx.lineTo(effect.endX, effect.endY);
                ctx.stroke();
            }
            
            ctx.restore();
        }
    }
};


