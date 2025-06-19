// combatSystem.js
// Combat mechanics for bitCraft.js v0.04

const CombatSystem = {
    activeCombats: [], // Currently ongoing combats
    damageNumbers: [], // Floating damage numbers

    // Initialize combat system
    init: function() {
        console.log("Combat System v0.04 initialized");
    },

    // Start combat between two entities
    startCombat: function(attacker, target) {
        if (!attacker || !target || target.health <= 0) return false;
        
        console.log(`Starting combat: ${attacker.id} vs ${target.id}`);
        
        // Check if already in combat
        const existingCombat = this.activeCombats.find(c => 
            (c.attacker === attacker && c.target === target) ||
            (c.attacker === target && c.target === attacker)
        );
        
        if (existingCombat) {
            console.log(`Combat already exists between ${attacker.id} and ${target.id}`);
            return false;
        }
        
        const combat = {
            id: Math.random().toString(36).substr(2, 9),
            attacker: attacker,
            target: target,
            attackCooldown: 0,
            startTime: Date.now()
        };
        
        this.activeCombats.push(combat);
        attacker.inCombat = true;
        target.inCombat = true;
        attacker.combatTarget = target;
        
        console.log(`Combat started: ${attacker.id} vs ${target.id}`);
        return true;
    },

    // End combat between entities
    endCombat: function(attacker, target) {
        const combatIndex = this.activeCombats.findIndex(c => 
            (c.attacker === attacker && c.target === target) ||
            (c.attacker === target && c.target === attacker)
        );
        
        if (combatIndex >= 0) {
            this.activeCombats.splice(combatIndex, 1);
            attacker.inCombat = false;
            target.inCombat = false;
            attacker.combatTarget = null;
            target.combatTarget = null;
            console.log(`Combat ended: ${attacker.id} vs ${target.id}`);
        }
    },

    // Calculate damage based on attacker stats and target defenses
    calculateDamage: function(attacker, target, damageType = 'physical') {
        let baseDamage = attacker.damage || 10;
        
        // Apply weapon bonuses
        if (attacker.equippedWeapon) {
            baseDamage += attacker.equippedWeapon.damage || 0;
            if (attacker.equippedWeapon.damageBonus) {
                baseDamage *= attacker.equippedWeapon.damageBonus;
            }
        }
        
        // Apply spell power for magical damage
        if (damageType === 'magical' && attacker.equippedWeapon && attacker.equippedWeapon.spellPowerBonus) {
            baseDamage *= attacker.equippedWeapon.spellPowerBonus;
        }
        
        // Apply target armor/resistance
        let finalDamage = baseDamage;
        if (target.armor && damageType === 'physical') {
            finalDamage = Math.max(1, baseDamage - target.armor);
        } else if (target.magicResistance && damageType === 'magical') {
            finalDamage = baseDamage * (1 - target.magicResistance);
        }
        
        // Add some randomness (±20%)
        const variance = 0.2;
        const randomFactor = 1 + (Math.random() - 0.5) * variance * 2;
        finalDamage = Math.round(finalDamage * randomFactor);
        
        return Math.max(1, finalDamage);
    },

    // Deal damage to a target
    dealDamage: function(attacker, target, damageAmount, damageType = 'physical') {
        if (!target || target.health <= 0) return 0;
        
        const actualDamage = Math.min(damageAmount, target.health);
        target.health -= actualDamage;
        
        // Create floating damage number
        this.createDamageNumber(target.x, target.y, actualDamage, damageType);
        
        // Visual effect
        this.createHitEffect(target.x, target.y, damageType);
        
        // Check if target died
        if (target.health <= 0) {
            this.handleDeath(target, attacker);
        }
        
        console.log(`${attacker.id} dealt ${actualDamage} ${damageType} damage to ${target.id} (${target.health}/${target.maxHealth} HP remaining)`);
        return actualDamage;
    },

    // Handle entity death
    handleDeath: function(deadEntity, killer) {
        deadEntity.health = 0;
        deadEntity.isDead = true;
        
        // End all combats involving this entity
        for (let i = this.activeCombats.length - 1; i >= 0; i--) {
            const combat = this.activeCombats[i];
            if (combat.attacker === deadEntity || combat.target === deadEntity) {
                this.endCombat(combat.attacker, combat.target);
            }
        }
        
        // Death effect
        this.createDeathEffect(deadEntity.x, deadEntity.y);
        
        console.log(`${deadEntity.id} was killed by ${killer.id}`);
    },

    // Create floating damage number
    createDamageNumber: function(x, y, damage, damageType) {
        const color = damageType === 'magical' ? '#00ffff' : 
                     damageType === 'healing' ? '#00ff00' : '#ff4444';
        
        this.damageNumbers.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 10,
            damage: damage,
            color: color,
            life: 60,
            maxLife: 60,
            vy: -2
        });
    },

    // Create hit effect
    createHitEffect: function(x, y, damageType) {
        if (typeof MagicSystem === 'undefined') return;
        
        const color = damageType === 'magical' ? 'rgba(0, 255, 255, 0.8)' : 'rgba(255, 68, 68, 0.8)';
        
        for (let i = 0; i < 8; i++) {
            MagicSystem.effects.push({
                type: 'particle',
                x: x,
                y: y,
                size: Math.random() * 3 + 2,
                life: 20,
                color: color,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6
            });
        }
    },

    // Create death effect
    createDeathEffect: function(x, y) {
        if (typeof MagicSystem === 'undefined') return;
        
        for (let i = 0; i < 15; i++) {
            MagicSystem.effects.push({
                type: 'particle',
                x: x,
                y: y,
                size: Math.random() * 4 + 2,
                life: 40,
                color: 'rgba(255, 0, 0, 0.9)',
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8
            });
        }
    },

    // Attack command - make attacker attack target
    attackTarget: function(attacker, target) {
        if (!attacker || !target || target.health <= 0) {
            console.log(`Attack failed: attacker=${attacker?.id}, target=${target?.id}, target health=${target?.health}`);
            return false;
        }
        
        console.log(`CombatSystem.attackTarget: ${attacker.id} (${attacker.type}) → ${target.id} (${target.type})`);
        
        // Set combat target
        attacker.combatTarget = target;
        attacker.task = 'attacking';
        
        // Start combat if not already in combat
        this.startCombat(attacker, target);
        
        return true;
    },

    // Check if entity can attack (not on cooldown)
    canAttack: function(entity) {
        return !entity.attackCooldown || entity.attackCooldown <= 0;
    },

    // Perform an attack
    performAttack: function(attacker, target) {
        if (!this.canAttack(attacker) || !target || target.health <= 0) return false;
        
        const attackSpeed = attacker.attackSpeed || 60; // frames between attacks
        attacker.attackCooldown = attackSpeed;
        
        const damage = this.calculateDamage(attacker, target);
        this.dealDamage(attacker, target, damage);
        
        // Attack animation/effect
        this.createAttackEffect(attacker, target);
        
        return true;
    },

    // Create attack effect
    createAttackEffect: function(attacker, target) {
        if (typeof MagicSystem === 'undefined') return;
        
        // Create a line effect from attacker to target
        const dx = target.x - attacker.x;
        const dy = target.y - attacker.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.floor(distance / 5);
        
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            MagicSystem.effects.push({
                type: 'particle',
                x: attacker.x + dx * t,
                y: attacker.y + dy * t,
                size: 2,
                life: 15,
                color: 'rgba(255, 255, 0, 0.7)',
                vx: 0,
                vy: 0
            });
        }
    },

    // Update combat system
    update: function() {
        // Update active combats
        for (let i = this.activeCombats.length - 1; i >= 0; i--) {
            const combat = this.activeCombats[i];
            
            // Check if entities are still valid
            if (!combat.attacker || !combat.target || 
                combat.attacker.health <= 0 || combat.target.health <= 0) {
                this.endCombat(combat.attacker, combat.target);
                continue;
            }
            
            // Update attack cooldown for attacker
            if (combat.attacker.attackCooldown > 0) {
                combat.attacker.attackCooldown--;
            }
            
            // Update attack cooldown for target (for mutual combat)
            if (combat.target.attackCooldown > 0) {
                combat.target.attackCooldown--;
            }
            
            // Check if attacker is in range and can attack
            const dx = combat.target.x - combat.attacker.x;
            const dy = combat.target.y - combat.attacker.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const attackRange = combat.attacker.attackRange || 30;
            
            if (distance <= attackRange && this.canAttack(combat.attacker)) {
                this.performAttack(combat.attacker, combat.target);
            }
            
            // MUTUAL COMBAT: Allow target to attack back if in range
            const targetAttackRange = combat.target.attackRange || 30;
            if (distance <= targetAttackRange && this.canAttack(combat.target)) {
                this.performAttack(combat.target, combat.attacker);
            }
        }
        
        // Update damage numbers
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dmgNum = this.damageNumbers[i];
            dmgNum.life--;
            dmgNum.y += dmgNum.vy;
            dmgNum.vy *= 0.95; // Slow down over time
            
            if (dmgNum.life <= 0) {
                this.damageNumbers.splice(i, 1);
            }
        }
        
        // Update entity attack cooldowns
        // This is handled in the main game loop for all entities
    },

    // Draw combat effects
    draw: function(ctx) {
        // Draw damage numbers
        ctx.save();
        ctx.font = '12px Courier New';
        ctx.textAlign = 'center';
        
        for (const dmgNum of this.damageNumbers) {
            const alpha = dmgNum.life / dmgNum.maxLife;
            ctx.fillStyle = dmgNum.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            ctx.fillText(`-${dmgNum.damage}`, dmgNum.x, dmgNum.y);
        }
        
        ctx.restore();
    },

    // Get combat status for an entity
    getCombatStatus: function(entity) {
        const combat = this.activeCombats.find(c => 
            c.attacker === entity || c.target === entity
        );
        
        if (!combat) return null;
        
        return {
            inCombat: true,
            opponent: combat.attacker === entity ? combat.target : combat.attacker,
            isAttacker: combat.attacker === entity
        };
    }
};


