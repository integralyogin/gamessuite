const MagicSystem = {
    effects: [],
    cooldowns: {},
    spellbook: {},
    craftingBook: {},

    init: function() {
        this.spellbook = {
            lightningBolt: {
                id: 'lightningBolt',
                name: 'Lightning Bolt',
                cooldown: 25,
                manaCost: 12,
                damage: 30,
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
            
            teleport: {
                id: 'teleport',
                name: 'Teleport',
                cooldown: 100,
                manaCost: 35,
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
                manaCost: 60,
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
                effect.vx *= 0.98; // Slight friction
                effect.vy *= 0.98;
            }

            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }
    },

    draw: function(ctx) {
        for (const effect of this.effects) {
            ctx.fillStyle = effect.color;
            ctx.strokeStyle = effect.color;
            ctx.lineWidth = effect.width || 2;
            
            if (effect.type === 'particle') {
                ctx.fillRect(effect.x - effect.size / 2, effect.y - effect.size / 2, effect.size, effect.size);
            } else if (effect.type === 'line') {
                ctx.beginPath();
                ctx.moveTo(effect.startX, effect.startY);
                ctx.lineTo(effect.endX, effect.endY);
                ctx.stroke();
            }
        }
    }
};


