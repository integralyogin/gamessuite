// inventorySystem.js
// Inventory management system for bitCraft.js v0.03

const InventorySystem = {
    // Create a new inventory
    createInventory: function(slots = 20) {
        return {
            slots: new Array(slots).fill(null),
            maxSlots: slots
        };
    },

    // Add item to inventory, returns remaining quantity if any
    addItem: function(inventory, item, preferredSlot = -1) {
        if (!item || item.quantity <= 0) return 0;

        let remainingQuantity = item.quantity;

        // Try to stack with existing items first
        for (let i = 0; i < inventory.slots.length; i++) {
            const slot = inventory.slots[i];
            if (slot && ItemSystem.canStack(slot, item)) {
                const leftover = ItemSystem.stackItems(slot, { ...item, quantity: remainingQuantity });
                remainingQuantity = leftover;
                if (remainingQuantity <= 0) break;
            }
        }

        // If there's still quantity left, find empty slots
        if (remainingQuantity > 0) {
            // Try preferred slot first if specified
            if (preferredSlot >= 0 && preferredSlot < inventory.slots.length && !inventory.slots[preferredSlot]) {
                const newItem = ItemSystem.createItem(item.id, remainingQuantity, item);
                inventory.slots[preferredSlot] = newItem;
                remainingQuantity = 0;
            } else {
                // Find first empty slot
                for (let i = 0; i < inventory.slots.length; i++) {
                    if (!inventory.slots[i]) {
                        const newItem = ItemSystem.createItem(item.id, remainingQuantity, item);
                        inventory.slots[i] = newItem;
                        remainingQuantity = 0;
                        break;
                    }
                }
            }
        }

        return remainingQuantity;
    },

    // Remove item from inventory
    removeItem: function(inventory, slotIndex, quantity = 1) {
        if (slotIndex < 0 || slotIndex >= inventory.slots.length) return null;
        
        const slot = inventory.slots[slotIndex];
        if (!slot) return null;

        if (quantity >= slot.quantity) {
            // Remove entire stack
            const removedItem = slot;
            inventory.slots[slotIndex] = null;
            return removedItem;
        } else {
            // Split stack
            const removedItem = ItemSystem.splitStack(slot, quantity);
            return removedItem;
        }
    },

    // Move item between slots
    moveItem: function(inventory, fromSlot, toSlot) {
        if (fromSlot < 0 || fromSlot >= inventory.slots.length) return false;
        if (toSlot < 0 || toSlot >= inventory.slots.length) return false;
        if (fromSlot === toSlot) return false;

        const fromItem = inventory.slots[fromSlot];
        const toItem = inventory.slots[toSlot];

        if (!fromItem) return false;

        if (!toItem) {
            // Move to empty slot
            inventory.slots[toSlot] = fromItem;
            inventory.slots[fromSlot] = null;
            return true;
        } else if (ItemSystem.canStack(fromItem, toItem)) {
            // Stack items
            const leftover = ItemSystem.stackItems(toItem, fromItem);
            if (leftover <= 0) {
                inventory.slots[fromSlot] = null;
            } else {
                fromItem.quantity = leftover;
            }
            return true;
        } else {
            // Swap items
            inventory.slots[fromSlot] = toItem;
            inventory.slots[toSlot] = fromItem;
            return true;
        }
    },

    // Find item in inventory
    findItem: function(inventory, itemId) {
        for (let i = 0; i < inventory.slots.length; i++) {
            const slot = inventory.slots[i];
            if (slot && slot.id === itemId) {
                return { slot: i, item: slot };
            }
        }
        return null;
    },

    // Count total quantity of an item
    countItem: function(inventory, itemId) {
        let total = 0;
        for (const slot of inventory.slots) {
            if (slot && slot.id === itemId) {
                total += slot.quantity;
            }
        }
        return total;
    },

    // Check if inventory has required materials
    hasItems: function(inventory, requirements) {
        for (const req of requirements) {
            if (this.countItem(inventory, req.item) < req.quantity) {
                return false;
            }
        }
        return true;
    },

    // Consume items from inventory
    consumeItems: function(inventory, requirements) {
        // First check if we have enough
        if (!this.hasItems(inventory, requirements)) {
            return false;
        }

        // Then consume the items
        for (const req of requirements) {
            let remaining = req.quantity;
            for (let i = 0; i < inventory.slots.length && remaining > 0; i++) {
                const slot = inventory.slots[i];
                if (slot && slot.id === req.item) {
                    const toRemove = Math.min(remaining, slot.quantity);
                    slot.quantity -= toRemove;
                    remaining -= toRemove;
                    
                    if (slot.quantity <= 0) {
                        inventory.slots[i] = null;
                    }
                }
            }
        }
        return true;
    },

    // Get empty slot count
    getEmptySlots: function(inventory) {
        return inventory.slots.filter(slot => slot === null).length;
    },

    // Get inventory display data
    getDisplayData: function(inventory) {
        return inventory.slots.map((slot, index) => ({
            index: index,
            item: slot,
            displayName: slot ? ItemSystem.getDisplayName(slot) : '',
            tooltip: slot ? ItemSystem.getTooltip(slot) : ''
        }));
    },

    // Transfer items between inventories
    transferItem: function(fromInventory, toInventory, slotIndex, quantity = null) {
        const item = fromInventory.slots[slotIndex];
        if (!item) return false;

        const transferQuantity = quantity || item.quantity;
        const itemToTransfer = { ...item, quantity: transferQuantity };
        
        const remaining = this.addItem(toInventory, itemToTransfer);
        const actualTransferred = transferQuantity - remaining;
        
        if (actualTransferred > 0) {
            this.removeItem(fromInventory, slotIndex, actualTransferred);
            return true;
        }
        
        return false;
    }
};


