class PlatformerGame {
    constructor(manager) {
        this.manager = manager;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 400;
        
        // Player properties
        this.player = {
            x: 50,
            y: 300,
            width: 25,
            height: 40,
            velocityX: 0,
            velocityY: 0,
            isJumping: false,
            onGround: false,
            speed: 4,
            jumpPower: 14,
            health: 3,
            invulnerable: false,
            invulnerabilityTime: 0
        };

        // Multiple platforms for more interesting level design
        this.platforms = [
            { x: 200, y: 320, width: 100, height: 15 },
            { x: 400, y: 280, width: 80, height: 15 },
            { x: 550, y: 240, width: 100, height: 15 },
            { x: 300, y: 180, width: 60, height: 15 }
        ];

        // Moving platforms
        this.movingPlatforms = [
            { 
                x: 150, y: 200, width: 80, height: 15,
                startX: 150, endX: 250, speed: 1, direction: 1
            }
        ];

        // Enemies
        this.enemies = [
            { x: 220, y: 295, width: 20, height: 25, startX: 200, endX: 280, speed: 1, direction: 1 },
            { x: 420, y: 255, width: 20, height: 25, startX: 400, endX: 460, speed: 0.8, direction: 1 }
        ];

        // Collectibles
        this.coins = [
            { x: 230, y: 290, width: 15, height: 15, collected: false },
            { x: 430, y: 250, width: 15, height: 15, collected: false },
            { x: 580, y: 210, width: 15, height: 15, collected: false },
            { x: 320, y: 150, width: 15, height: 15, collected: false }
        ];

        // Goal
        this.goal = {
            x: 720,
            y: 320,
            width: 40,
            height: 80,
            animation: 0
        };

        // Game state
        this.keys = {};
        this.score = 0;
        this.gameWon = false;
        this.cameraX = 0;
        this.particles = [];

        // Ground level
        this.groundY = 350;
    }

    start() {
        this.manager.gameContainer.appendChild(this.canvas);
        this.canvas.focus();
        this.canvas.tabIndex = 1;
        this.canvas.addEventListener('keydown', this.handleKeyDown);
        this.canvas.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        this.gameLoop();
    }

    stop() {
        this.canvas.removeEventListener('keydown', this.handleKeyDown);
        this.canvas.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown = (e) => {
        this.keys[e.key] = true;
        e.preventDefault();
    }
    
    handleKeyUp = (e) => {
        this.keys[e.key] = false;
        e.preventDefault();
    }

    gameLoop = () => {
        if (!this.gameWon) {
            this.update();
            this.draw();
            requestAnimationFrame(this.gameLoop);
        }
    }

    update() {
        this.updatePlayer();
        this.updateEnemies();
        this.updateMovingPlatforms();
        this.updateParticles();
        this.checkCollisions();
        this.updateCamera();
        this.goal.animation += 0.1;

        // Update invulnerability
        if (this.player.invulnerable) {
            this.player.invulnerabilityTime--;
            if (this.player.invulnerabilityTime <= 0) {
                this.player.invulnerable = false;
            }
        }
    }

    updatePlayer() {
        // Horizontal movement with acceleration
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
            this.player.velocityX = Math.min(this.player.velocityX + 0.5, this.player.speed);
        } else if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.player.velocityX = Math.max(this.player.velocityX - 0.5, -this.player.speed);
        } else {
            // Apply friction
            this.player.velocityX *= 0.8;
        }

        // Jumping with variable height
        if ((this.keys['ArrowUp'] || this.keys['w'] || this.keys['W'] || this.keys[' ']) && this.player.onGround && !this.player.isJumping) {
            this.player.velocityY = -this.player.jumpPower;
            this.player.isJumping = true;
            this.player.onGround = false;
            this.createJumpParticles();
        }

        // Apply horizontal movement
        this.player.x += this.player.velocityX;

        // Apply gravity
        this.player.velocityY += 0.6;
        this.player.y += this.player.velocityY;

        // Keep player in bounds
        this.player.x = Math.max(0, Math.min(this.player.x, 800 - this.player.width));

        // Reset onGround flag
        this.player.onGround = false;

        // Ground collision
        if (this.player.y + this.player.height >= this.groundY) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.isJumping = false;
            this.player.onGround = true;
        }

        // Death condition
        if (this.player.y > 450) {
            this.resetPlayer();
        }
    }

    updateEnemies() {
        this.enemies.forEach(enemy => {
            // Move enemy back and forth
            enemy.x += enemy.speed * enemy.direction;
            
            if (enemy.x <= enemy.startX || enemy.x + enemy.width >= enemy.endX) {
                enemy.direction *= -1;
            }
        });
    }

    updateMovingPlatforms() {
        this.movingPlatforms.forEach(platform => {
            platform.x += platform.speed * platform.direction;
            
            if (platform.x <= platform.startX || platform.x >= platform.endX) {
                platform.direction *= -1;
            }
        });
    }

    updateParticles() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2;
            particle.life--;
            return particle.life > 0;
        });
    }

    checkCollisions() {
        // Platform collisions
        [...this.platforms, ...this.movingPlatforms].forEach(platform => {
            if (this.isColliding(this.player, platform)) {
                // Landing on top of platform
                if (this.player.velocityY > 0 && 
                    this.player.y < platform.y - this.player.height + 10) {
                    this.player.y = platform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isJumping = false;
                    this.player.onGround = true;
                }
            }
        });

        // Enemy collisions
        if (!this.player.invulnerable) {
            this.enemies.forEach(enemy => {
                if (this.isColliding(this.player, enemy)) {
                    this.player.health--;
                    this.player.invulnerable = true;
                    this.player.invulnerabilityTime = 120; // 2 seconds at 60fps
                    this.createDamageParticles();
                    
                    if (this.player.health <= 0) {
                        this.resetPlayer();
                    }
                }
            });
        }

        // Coin collisions
        this.coins.forEach(coin => {
            if (!coin.collected && this.isColliding(this.player, coin)) {
                coin.collected = true;
                this.score += 10;
                this.createCoinParticles(coin.x + coin.width/2, coin.y + coin.height/2);
            }
        });

        // Goal collision
        if (this.isColliding(this.player, this.goal)) {
            this.gameWon = true;
            setTimeout(() => {
                this.manager.nextGame();
            }, 1000);
        }
    }

    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    updateCamera() {
        // Simple camera following
        const targetCameraX = this.player.x - 400;
        this.cameraX += (targetCameraX - this.cameraX) * 0.1;
        this.cameraX = Math.max(0, Math.min(this.cameraX, 0)); // Keep camera in bounds for this level
    }

    resetPlayer() {
        this.player.x = 50;
        this.player.y = 300;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
        this.player.health = 3;
        this.player.invulnerable = false;
        this.score = Math.max(0, this.score - 20);
    }

    createJumpParticles() {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.player.x + this.player.width/2,
                y: this.player.y + this.player.height,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 2,
                life: 20,
                color: '#888'
            });
        }
    }

    createDamageParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.player.x + this.player.width/2,
                y: this.player.y + this.player.height/2,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                life: 30,
                color: '#f44'
            });
        }
    }

    createCoinParticles(x, y) {
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3,
                life: 25,
                color: '#ff0'
            });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for camera
        this.ctx.save();
        this.ctx.translate(-this.cameraX, 0);
        
        // Draw background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#98FB98');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(this.cameraX, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(0, this.groundY, 800, 50);
        
        // Draw platforms
        this.ctx.fillStyle = '#666';
        this.platforms.forEach(platform => {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            // Add some detail
            this.ctx.fillStyle = '#888';
            this.ctx.fillRect(platform.x, platform.y, platform.width, 3);
            this.ctx.fillStyle = '#666';
        });

        // Draw moving platforms
        this.ctx.fillStyle = '#886';
        this.movingPlatforms.forEach(platform => {
            this.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            // Add some detail
            this.ctx.fillStyle = '#aa8';
            this.ctx.fillRect(platform.x, platform.y, platform.width, 3);
            this.ctx.fillStyle = '#886';
        });
        
        // Draw enemies
        this.ctx.fillStyle = '#f44';
        this.enemies.forEach(enemy => {
            this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            // Simple eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(enemy.x + 3, enemy.y + 5, 4, 4);
            this.ctx.fillRect(enemy.x + 13, enemy.y + 5, 4, 4);
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(enemy.x + 4, enemy.y + 6, 2, 2);
            this.ctx.fillRect(enemy.x + 14, enemy.y + 6, 2, 2);
            this.ctx.fillStyle = '#f44';
        });

        // Draw coins
        this.coins.forEach(coin => {
            if (!coin.collected) {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.beginPath();
                this.ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Coin shine effect
                this.ctx.fillStyle = '#ffff80';
                this.ctx.beginPath();
                this.ctx.arc(coin.x + coin.width/2 - 2, coin.y + coin.height/2 - 2, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Draw goal with animation
        const goalPulse = Math.sin(this.goal.animation) * 0.1 + 1;
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(
            this.goal.x - (goalPulse - 1) * this.goal.width / 2, 
            this.goal.y - (goalPulse - 1) * this.goal.height / 2, 
            this.goal.width * goalPulse, 
            this.goal.height * goalPulse
        );
        
        // Goal sparkle effect
        this.ctx.fillStyle = '#8f8';
        for (let i = 0; i < 3; i++) {
            const sparkleX = this.goal.x + Math.sin(this.goal.animation + i) * 20 + this.goal.width/2;
            const sparkleY = this.goal.y + Math.cos(this.goal.animation + i) * 30 + this.goal.height/2;
            this.ctx.fillRect(sparkleX - 2, sparkleY - 2, 4, 4);
        }
        
        // Draw player with invulnerability flashing
        if (!this.player.invulnerable || Math.floor(this.player.invulnerabilityTime / 5) % 2) {
            this.ctx.fillStyle = '#4169E1';
            this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
            
            // Simple player details
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(this.player.x + 5, this.player.y + 8, 6, 6); // Head
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(this.player.x + 6, this.player.y + 10, 2, 2); // Eye
            this.ctx.fillRect(this.player.x + 9, this.player.y + 10, 2, 2); // Eye
        }

        // Draw particles
        this.particles.forEach(particle => {
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.life / 30;
            this.ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
            this.ctx.globalAlpha = 1;
        });
        
        this.ctx.restore();
        
        // Draw UI (not affected by camera)
        this.drawUI();
    }

    drawUI() {
        // Health hearts
        this.ctx.fillStyle = '#f44';
        for (let i = 0; i < this.player.health; i++) {
            this.ctx.fillRect(20 + i * 25, 20, 20, 18);
            // Heart shape (simplified)
            this.ctx.fillRect(15 + i * 25, 25, 10, 8);
            this.ctx.fillRect(25 + i * 25, 25, 10, 8);
        }

        // Score
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 20, 70);

        // Instructions
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Arrow Keys/WASD to move, Space/Up to jump', 20, this.canvas.height - 40);
        this.ctx.fillText('Collect coins and reach the green goal!', 20, this.canvas.height - 20);

        // Win message
        if (this.gameWon) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Level Complete!', this.canvas.width/2, this.canvas.height/2);
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width/2, this.canvas.height/2 + 40);
            this.ctx.textAlign = 'start';
        }
    }
}
