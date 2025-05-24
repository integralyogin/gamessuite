class RPGGame {
    constructor(manager) {
        this.manager = manager;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 400;
        
        // Get coins from previous game (stored in shared state)
        this.coins = this.manager.sharedState.coins || 0;
        
        // Player character stats
        this.player = {
            name: "Hero",
            level: 1,
            hp: 100,
            maxHp: 100,
            attack: 15,
            defense: 5,
            experience: 0,
            expToNext: 100
        };

        // Enemy for combat
        this.enemy = {
            name: "Shadow Beast",
            hp: 80,
            maxHp: 80,
            attack: 12,
            defense: 3,
            expReward: 75,
            coinReward: 25
        };

        // Shop items
        this.shopItems = [
            { 
                name: "Health Potion", 
                price: 20, 
                description: "Restores 50 HP",
                effect: () => {
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
                    this.addMessage("Used Health Potion! Restored 50 HP.");
                }
            },
            { 
                name: "Iron Sword", 
                price: 40, 
                description: "Increases attack by 8",
                purchased: false,
                effect: () => {
                    this.player.attack += 8;
                    this.addMessage("Equipped Iron Sword! Attack increased by 8.");
                }
            },
            { 
                name: "Shield", 
                price: 35, 
                description: "Increases defense by 6",
                purchased: false,
                effect: () => {
                    this.player.defense += 6;
                    this.addMessage("Equipped Shield! Defense increased by 6.");
                }
            },
            { 
                name: "Magic Ring", 
                price: 60, 
                description: "Increases max HP by 30",
                purchased: false,
                effect: () => {
                    this.player.maxHp += 30;
                    this.player.hp += 30;
                    this.addMessage("Equipped Magic Ring! Max HP increased by 30.");
                }
            }
        ];

        // Game state
        this.gameState = 'shop'; // 'shop', 'combat', 'victory', 'gameOver'
        this.selectedShopItem = 0;
        this.selectedCombatAction = 0;
        this.messages = [];
        this.messageTimer = 0;
        this.combatTimer = 0;
        this.animationFrame = 0;
        
        // Inventory for items that can be used
        this.inventory = [];

        this.keys = {};
        this.keyPressed = {};
    }

    start() {
        this.manager.gameContainer.appendChild(this.canvas);
        this.canvas.focus();
        this.canvas.tabIndex = 1;
        this.canvas.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        
        // Welcome message
        this.addMessage(`Welcome, ${this.player.name}! You have ${this.coins} coins to spend.`);
        this.addMessage("Browse the shop and prepare for battle!");
        
        this.gameLoop();
    }

    stop() {
        this.canvas.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown = (e) => {
        if (!this.keys[e.key]) {
            this.keyPressed[e.key] = true;
        }
        this.keys[e.key] = true;
        e.preventDefault();
    }
    
    handleKeyUp = (e) => {
        this.keys[e.key] = false;
        e.preventDefault();
    }

    gameLoop = () => {
        this.update();
        this.draw();
        requestAnimationFrame(this.gameLoop);
    }

    update() {
        this.animationFrame += 0.1;
        this.messageTimer = Math.max(0, this.messageTimer - 1);
        this.combatTimer = Math.max(0, this.combatTimer - 1);

        if (this.gameState === 'shop') {
            this.updateShop();
        } else if (this.gameState === 'combat') {
            this.updateCombat();
        } else if (this.gameState === 'victory') {
            this.updateVictory();
        }

        // Clear keyPressed flags
        Object.keys(this.keyPressed).forEach(key => {
            this.keyPressed[key] = false;
        });
    }

    updateShop() {
        // Navigation
        if (this.keyPressed['ArrowUp'] || this.keyPressed['w'] || this.keyPressed['W']) {
            this.selectedShopItem = Math.max(0, this.selectedShopItem - 1);
        }
        if (this.keyPressed['ArrowDown'] || this.keyPressed['s'] || this.keyPressed['S']) {
            this.selectedShopItem = Math.min(this.shopItems.length, this.selectedShopItem + 1);
        }

        // Purchase/Action
        if (this.keyPressed['Enter'] || this.keyPressed[' ']) {
            if (this.selectedShopItem === this.shopItems.length) {
                // "Ready for Battle" option
                this.gameState = 'combat';
                this.addMessage("The battle begins!");
                this.combatTimer = 60;
            } else {
                this.purchaseItem(this.selectedShopItem);
            }
        }
    }

    updateCombat() {
        if (this.combatTimer > 0) return; // Wait for combat timer

        // Navigation
        if (this.keyPressed['ArrowUp'] || this.keyPressed['w'] || this.keyPressed['W']) {
            this.selectedCombatAction = Math.max(0, this.selectedCombatAction - 1);
        }
        if (this.keyPressed['ArrowDown'] || this.keyPressed['s'] || this.keyPressed['S']) {
            this.selectedCombatAction = Math.min(2, this.selectedCombatAction + 1);
        }

        // Combat action
        if (this.keyPressed['Enter'] || this.keyPressed[' ']) {
            this.performCombatAction();
        }
    }

    updateVictory() {
        if (this.keyPressed['Enter'] || this.keyPressed[' ']) {
            // Store updated coin count and player stats for next game
            this.manager.sharedState.coins = this.coins;
            this.manager.sharedState.playerStats = { ...this.player };
            this.manager.sharedState.inventory = [...this.inventory];
            
            this.manager.nextGame();
        }
    }

    purchaseItem(index) {
        const item = this.shopItems[index];
        
        if (item.purchased && item.name !== "Health Potion") {
            this.addMessage("You already own this item!");
            return;
        }

        if (this.coins < item.price) {
            this.addMessage("Not enough coins!");
            return;
        }

        this.coins -= item.price;
        
        if (item.name === "Health Potion") {
            // Add to inventory instead of immediate use
            this.inventory.push(item);
            this.addMessage("Health Potion added to inventory!");
        } else {
            item.purchased = true;
            item.effect();
        }
    }

    performCombatAction() {
        let playerDamage = 0;
        let enemyDamage = 0;

        switch (this.selectedCombatAction) {
            case 0: // Attack
                playerDamage = Math.max(1, this.player.attack - this.enemy.defense + Math.floor(Math.random() * 6) - 2);
                this.enemy.hp -= playerDamage;
                this.addMessage(`You deal ${playerDamage} damage to ${this.enemy.name}!`);
                break;
                
            case 1: // Use Item
                if (this.inventory.length > 0) {
                    const potion = this.inventory.find(item => item.name === "Health Potion");
                    if (potion) {
                        potion.effect();
                        this.inventory.splice(this.inventory.indexOf(potion), 1);
                    } else {
                        this.addMessage("No usable items!");
                        return;
                    }
                } else {
                    this.addMessage("No items in inventory!");
                    return;
                }
                break;
                
            case 2: // Defend
                this.addMessage("You brace for the enemy's attack!");
                // Reduce incoming damage by half this turn
                break;
        }

        // Check if enemy is defeated
        if (this.enemy.hp <= 0) {
            this.player.experience += this.enemy.expReward;
            this.coins += this.enemy.coinReward;
            this.addMessage(`Victory! Gained ${this.enemy.expReward} EXP and ${this.enemy.coinReward} coins!`);
            
            // Level up check
            if (this.player.experience >= this.player.expToNext) {
                this.levelUp();
            }
            
            this.gameState = 'victory';
            return;
        }

        // Enemy attacks back
        enemyDamage = Math.max(1, this.enemy.attack - this.player.defense + Math.floor(Math.random() * 4) - 1);
        
        // Apply defend bonus
        if (this.selectedCombatAction === 2) {
            enemyDamage = Math.floor(enemyDamage / 2);
        }
        
        this.player.hp -= enemyDamage;
        this.addMessage(`${this.enemy.name} deals ${enemyDamage} damage to you!`);
        
        // Check if player is defeated
        if (this.player.hp <= 0) {
            this.gameState = 'gameOver';
            this.addMessage("You have been defeated! Game Over...");
            setTimeout(() => {
                // Reset and restart the RPG
                this.player.hp = this.player.maxHp;
                this.enemy.hp = this.enemy.maxHp;
                this.gameState = 'shop';
                this.addMessage("You respawn at the shop. Try again!");
            }, 2000);
        }

        this.combatTimer = 30; // Brief pause between actions
    }

    levelUp() {
        this.player.level++;
        this.player.maxHp += 20;
        this.player.hp += 20;
        this.player.attack += 3;
        this.player.defense += 2;
        this.player.experience -= this.player.expToNext;
        this.player.expToNext = Math.floor(this.player.expToNext * 1.2);
        
        this.addMessage(`Level Up! You are now level ${this.player.level}!`);
        this.addMessage("HP, Attack, and Defense increased!");
    }

    addMessage(text) {
        this.messages.unshift(text);
        if (this.messages.length > 6) {
            this.messages.pop();
        }
        this.messageTimer = 180; // 3 seconds
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        if (this.gameState === 'shop') {
            gradient.addColorStop(0, '#2c1810');
            gradient.addColorStop(1, '#4a2c18');
        } else if (this.gameState === 'combat') {
            gradient.addColorStop(0, '#1a0d0d');
            gradient.addColorStop(1, '#330d0d');
        } else {
            gradient.addColorStop(0, '#0d1a0d');
            gradient.addColorStop(1, '#1a330d');
        }
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.gameState === 'shop') {
            this.drawShop();
        } else if (this.gameState === 'combat') {
            this.drawCombat();
        } else if (this.gameState === 'victory') {
            this.drawVictory();
        } else if (this.gameState === 'gameOver') {
            this.drawGameOver();
        }

        this.drawUI();
        this.drawMessages();
    }

    drawShop() {
        // Shop title
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Adventurer\'s Shop', this.canvas.width / 2, 50);

        // Shop items
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'left';
        
        for (let i = 0; i < this.shopItems.length; i++) {
            const item = this.shopItems[i];
            const y = 100 + i * 35;
            
            // Highlight selected item
            if (i === this.selectedShopItem) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.fillRect(50, y - 20, 700, 30);
            }
            
            // Item color based on affordability and ownership
            if (item.purchased && item.name !== "Health Potion") {
                this.ctx.fillStyle = '#888';
            } else if (this.coins >= item.price) {
                this.ctx.fillStyle = '#fff';
            } else {
                this.ctx.fillStyle = '#666';
            }
            
            const status = item.purchased && item.name !== "Health Potion" ? " (OWNED)" : ` - ${item.price} coins`;
            this.ctx.fillText(`${item.name}${status}`, 60, y);
            
            // Description
            this.ctx.fillStyle = '#ccc';
            this.ctx.font = '14px Arial';
            this.ctx.fillText(item.description, 300, y);
            this.ctx.font = '18px Arial';
        }

        // Ready for battle option
        const readyY = 100 + this.shopItems.length * 35 + 20;
        if (this.selectedShopItem === this.shopItems.length) {
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(50, readyY - 20, 700, 30);
        }
        this.ctx.fillStyle = '#f44';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText('⚔️ Ready for Battle!', 60, readyY);
    }

    drawCombat() {
        // Combat title
        this.ctx.fillStyle = '#f44';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('⚔️ BATTLE ⚔️', this.canvas.width / 2, 40);

        // Enemy
        this.ctx.fillStyle = '#666';
        const enemyX = 550;
        const enemyY = 80;
        const enemyBob = Math.sin(this.animationFrame) * 5;
        
        // Enemy body
        this.ctx.fillRect(enemyX, enemyY + enemyBob, 60, 80);
        
        // Enemy eyes
        this.ctx.fillStyle = '#f44';
        this.ctx.fillRect(enemyX + 15, enemyY + 20 + enemyBob, 8, 8);
        this.ctx.fillRect(enemyX + 37, enemyY + 20 + enemyBob, 8, 8);

        // Enemy health bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(enemyX - 10, enemyY - 20, 80, 15);
        this.ctx.fillStyle = '#f44';
        const enemyHealthPercent = this.enemy.hp / this.enemy.maxHp;
        this.ctx.fillRect(enemyX - 8, enemyY - 18, 76 * enemyHealthPercent, 11);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.enemy.name}`, enemyX + 30, enemyY - 25);
        this.ctx.fillText(`${this.enemy.hp}/${this.enemy.maxHp}`, enemyX + 30, enemyY - 5);

        // Player
        this.ctx.fillStyle = '#4169E1';
        const playerX = 150;
        const playerY = 120;
        this.ctx.fillRect(playerX, playerY, 40, 60);
        
        // Player face
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(playerX + 10, playerY + 15, 8, 8);
        this.ctx.fillRect(playerX + 22, playerY + 15, 8, 8);
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(playerX + 12, playerY + 17, 4, 4);
        this.ctx.fillRect(playerX + 24, playerY + 17, 4, 4);

        // Combat options
        this.ctx.textAlign = 'left';
        this.ctx.font = '18px Arial';
        const combatOptions = [
            '⚔️ Attack',
            '🧪 Use Item' + (this.inventory.length > 0 ? ` (${this.inventory.length})` : ' (0)'),
            '🛡️ Defend'
        ];

        for (let i = 0; i < combatOptions.length; i++) {
            const y = 250 + i * 30;
            
            if (i === this.selectedCombatAction) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.fillRect(50, y - 20, 300, 25);
            }
            
            this.ctx.fillStyle = '#fff';
            this.ctx.fillText(combatOptions[i], 60, y);
        }

        // Combat timer indicator
        if (this.combatTimer > 0) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.textAlign = 'center';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('...', this.canvas.width / 2, 200);
        }
    }

    drawVictory() {
        this.ctx.fillStyle = '#4f4';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🏆 VICTORY! 🏆', this.canvas.width / 2, 150);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('You defeated the Shadow Beast!', this.canvas.width / 2, 200);
        this.ctx.fillText(`Final Level: ${this.player.level}`, this.canvas.width / 2, 230);
        this.ctx.fillText(`Total Coins: ${this.coins}`, this.canvas.width / 2, 260);
        
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press ENTER to continue to the next adventure!', this.canvas.width / 2, 320);
    }

    drawGameOver() {
        this.ctx.fillStyle = '#f44';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('💀 GAME OVER 💀', this.canvas.width / 2, 150);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Respawning soon...', this.canvas.width / 2, 200);
    }

    drawUI() {
        // Player stats panel
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(10, 10, 200, 120);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`${this.player.name} - Level ${this.player.level}`, 20, 30);
        
        // HP Bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(20, 40, 120, 15);
        this.ctx.fillStyle = '#4f4';
        const hpPercent = this.player.hp / this.player.maxHp;
        this.ctx.fillRect(22, 42, 116 * hpPercent, 11);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`HP: ${this.player.hp}/${this.player.maxHp}`, 145, 52);
        
        // EXP Bar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(20, 60, 120, 10);
        this.ctx.fillStyle = '#44f';
        const expPercent = this.player.experience / this.player.expToNext;
        this.ctx.fillRect(22, 62, 116 * expPercent, 6);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`EXP: ${this.player.experience}/${this.player.expToNext}`, 145, 70);
        
        // Stats
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`ATK: ${this.player.attack}  DEF: ${this.player.defense}`, 20, 85);
        this.ctx.fillText(`💰 Coins: ${this.coins}`, 20, 105);
        
        // Inventory count
        if (this.inventory.length > 0) {
            this.ctx.fillText(`🎒 Items: ${this.inventory.length}`, 20, 125);
        }
    }

    drawMessages() {
        // Message box
        if (this.messages.length > 0) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(250, this.canvas.height - 120, 540, 110);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'left';
            
            for (let i = 0; i < Math.min(6, this.messages.length); i++) {
                const alpha = i === 0 ? 1 : Math.max(0.3, 1 - (i * 0.15));
                this.ctx.globalAlpha = alpha;
                this.ctx.fillText(this.messages[i], 260, this.canvas.height - 100 + i * 16);
            }
            this.ctx.globalAlpha = 1;
        }

        // Controls
        this.ctx.fillStyle = '#ccc';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Arrow Keys/WASD: Navigate • ENTER/Space: Select', this.canvas.width / 2, this.canvas.height - 5);
    }
}
