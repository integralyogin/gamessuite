// Platformer Game
class PlatformerGame extends Game {
    constructor() {
        super('Platformer Jump', 'Use WASD or Arrow Keys to move and jump');
    }
    
    init(canvas, ctx, gameData) {
        super.init(canvas, ctx, gameData);
        
        this.player = {
            x: 50,
            y: canvas.height - 80,
            width: 30,
            height: 30,
            velX: 0,
            velY: 0,
            grounded: false,
            speed: 5,
            jumpPower: 12
        };
        
        this.platforms = [
            { x: 0, y: canvas.height - 50, width: 150, height: 50 }, // Start platform
            { x: 350, y: canvas.height - 200, width: 100, height: 20 }, // Middle platform
            { x: canvas.width - 150, y: canvas.height - 50, width: 150, height: 50 } // End platform
        ];
        
        this.goal = {
            x: canvas.width - 100,
            y: canvas.height - 100,
            width: 40,
            height: 50
        };
        
        this.gravity = 0.5;
    }
    
    update(keys) {
        // Movement
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.player.velX = -this.player.speed;
        } else if (keys['KeyD'] || keys['ArrowRight']) {
            this.player.velX = this.player.speed;
        } else {
            this.player.velX *= 0.8; // Friction
        }
        
        // Jump
        if ((keys['KeyW'] || keys['ArrowUp'] || keys[' ']) && this.player.grounded) {
            this.player.velY = -this.player.jumpPower;
            this.player.grounded = false;
        }
        
        // Apply gravity
        this.player.velY += this.gravity;
        
        // Update position
        this.player.x += this.player.velX;
        this.player.y += this.player.velY;
        
        // Platform collision
        this.player.grounded = false;
        for (let platform of this.platforms) {
            if (this.player.x < platform.x + platform.width &&
                this.player.x + this.player.width > platform.x &&
                this.player.y < platform.y + platform.height &&
                this.player.y + this.player.height > platform.y) {
                
                if (this.player.velY > 0) { // Falling
                    this.player.y = platform.y - this.player.height;
                    this.player.velY = 0;
                    this.player.grounded = true;
                }
            }
        }
        
        // Boundary collision
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width;
        }
        
        // Fall off screen reset
        if (this.player.y > this.canvas.height) {
            this.player.x = 50;
            this.player.y = this.canvas.height - 80;
            this.player.velX = 0;
            this.player.velY = 0;
        }
        
        // Goal collision
        if (this.player.x < this.goal.x + this.goal.width &&
            this.player.x + this.player.width > this.goal.x &&
            this.player.y < this.goal.y + this.goal.height &&
            this.player.y + this.player.height > this.goal.y) {
            return true; // Game complete
        }
        
        return false;
    }
    
    render(ctx) {
        // Render platforms
        ctx.fillStyle = '#16213e';
        for (let platform of this.platforms) {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
        
        // Render goal
        ctx.fillStyle = '#bbe1fa';
        ctx.fillRect(this.goal.x, this.goal.y, this.goal.width, this.goal.height);
        ctx.fillStyle = '#3282b8';
        ctx.font = '12px Courier New';
        ctx.fillText('GOAL', this.goal.x + 8, this.goal.y + 30);
        
        // Render player
        ctx.fillStyle = '#bbe1fa';
        ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    }
}
