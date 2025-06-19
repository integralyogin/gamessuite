// itemSystem.js
// Item management system for bitCraft.js v0.03

const ItemSystem = {
    // Create a new item instance
    createItem: function(itemId, quantity = 1, properties = {}) {
        const itemConfig = GameConfig.getItem(itemId);
        if (!itemConfig) {
            console.warn(`Item ${itemId} not found in configuration`);
            return null;
        }

        return {
            id: itemId,
            quantity: Math.min(quantity, itemConfig.stackSize),
            ...itemConfig,
            ...properties,
            instanceId: Math.random().toString(36).substr(2, 9)
        };
    },

    // Check if two items can be stacked together
    canStack: function(item1, item2) {
        if (!item1 || !item2) return false;
        if (item1.id !== item2.id) return false;
        if (item1.type === 'tool' || item1.type === 'weapon') return false; // Tools don't stack
        return true;
    },

    // Stack items together, returns remaining quantity if any
    stackItems: function(targetItem, sourceItem) {
        if (!this.canStack(targetItem, sourceItem)) return sourceItem.quantity;

        const spaceAvailable = targetItem.stackSize - targetItem.quantity;
        const amountToAdd = Math.min(spaceAvailable, sourceItem.quantity);
        
        targetItem.quantity += amountToAdd;
        return sourceItem.quantity - amountToAdd;
    },

    // Split an item stack
    splitStack: function(item, quantity) {
        if (quantity >= item.quantity) return null;
        
        const newItem = { ...item };
        newItem.quantity = quantity;
        newItem.instanceId = Math.random().toString(36).substr(2, 9);
        
        item.quantity -= quantity;
        return newItem;
    },

    // Use/consume an item
    useItem: function(item, user) {
        if (!item || item.quantity <= 0) return false;

        switch (item.type) {
            case 'consumable':
                return this.useConsumable(item, user);
            case 'tool':
                return this.useTool(item, user);
            case 'weapon':
                return this.equipWeapon(item, user);
            default:
                return false;
        }
    },

    useConsumable: function(item, user) {
        if (item.healAmount && user.health < user.maxHealth) {
            user.health = Math.min(user.maxHealth, user.health + item.healAmount);
            item.quantity--;
            return true;
        }
        
        if (item.manaAmount && user.mana < user.maxMana) {
            user.mana = Math.min(user.maxMana, user.mana + item.manaAmount);
            item.quantity--;
            return true;
        }
        
        return false;
    },

    useTool: function(item, user) {
        // Tools are equipped/unequipped rather than consumed
        if (user.equippedTool && user.equippedTool.instanceId === item.instanceId) {
            // Unequip
            user.equippedTool = null;
            return true;
        } else {
            // Equip
            user.equippedTool = item;
            return true;
        }
    },

    equipWeapon: function(item, user) {
        if (user.equippedWeapon && user.equippedWeapon.instanceId === item.instanceId) {
            // Unequip
            user.equippedWeapon = null;
            // Remove bonuses
            if (item.manaBonus) {
                user.maxMana -= item.manaBonus;
                user.mana = Math.min(user.mana, user.maxMana);
            }
            return true;
        } else {
            // Unequip current weapon first
            if (user.equippedWeapon && user.equippedWeapon.manaBonus) {
                user.maxMana -= user.equippedWeapon.manaBonus;
                user.mana = Math.min(user.mana, user.maxMana);
            }
            
            // Equip new weapon
            user.equippedWeapon = item;
            if (item.manaBonus) {
                user.maxMana += item.manaBonus;
            }
            return true;
        }
    },

    // Damage a tool
    damageTool: function(tool, damage = 1) {
        if (!tool || !tool.durability) return false;
        
        tool.durability -= damage;
        if (tool.durability <= 0) {
            tool.durability = 0;
            return true; // Tool is broken
        }
        return false;
    },

    // Get item display name with quantity
    getDisplayName: function(item) {
        if (!item) return '';
        
        let name = item.name;
        if (item.quantity > 1) {
            name += ` (${item.quantity})`;
        }
        
        if (item.durability !== undefined && item.maxDurability) {
            const durabilityPercent = Math.round((item.durability / item.maxDurability) * 100);
            name += ` [${durabilityPercent}%]`;
        }
        
        return name;
    },

    // Get item tooltip text
    getTooltip: function(item) {
        if (!item) return '';
        
        let tooltip = `${item.name}\n${item.description || ''}`;
        
        if (item.type === 'tool' && item.gatherBonus) {
            tooltip += `\nGather Bonus: +${item.gatherBonus}`;
        }
        
        if (item.type === 'weapon') {
            if (item.manaBonus) tooltip += `\nMana Bonus: +${item.manaBonus}`;
            if (item.spellPowerBonus) tooltip += `\nSpell Power: x${item.spellPowerBonus}`;
        }
        
        if (item.type === 'consumable') {
            if (item.healAmount) tooltip += `\nHeals: ${item.healAmount} HP`;
            if (item.manaAmount) tooltip += `\nRestores: ${item.manaAmount} MP`;
        }
        
        if (item.durability !== undefined) {
            tooltip += `\nDurability: ${item.durability}/${item.maxDurability}`;
        }
        
        return tooltip;
    }
};


