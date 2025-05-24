// Reaction Time Game
class ReactionGame extends Game {
    constructor() {
        super('Reaction Test', 'Wait for GREEN, then press SPACE as fast as you can!', '#1a0d1a');
    }
    
    init(canvas, ctx, gameData) {
        super.init(canvas, ctx, gameData);
        
        this.state = 'waiting'; // waiting, ready, react, complete
        this.startTime = Date.now();
        this.reactionTime = 0;
        this.waitTime = 2000 + Math.random() * 3000; // 2-5 seconds
        this.message = 'Wait for it...';
        this.color = '#ff4757';
    }
    
    update(keys) {
        const now = Date.now();
        
        switch (this.state) {
            case 'waiting':
                if (now - this.startTime > this.waitTime) {
                    this.state = 'ready';
                    this.startTime = now;
                    this.message = 'GO!';
                    this.color = '#2ed573';
                }
                
                if (keys[' ']) {
                    this.message = 'Too early! Wait for GREEN';
                    this.startTime = now;
                    this.waitTime = 1000 + Math.random() * 2000;
                    this.color = '#ff4757';
                }
                break;
                
            case 'ready':
                if (keys[' ']) {
                    this.reactionTime = now - this.startTime;
                    this.state = 'complete';
                    this.message = `${this.reactionTime}ms - Great!`;
                    this.color = '#3742fa';
                    this.completeTime = now;
                }
                break;
                
            case 'complete':
                if (now - this.completeTime > 2000) {
                    return true;
                }
                break;
        }
        
        return false;
    }
    
    render(ctx) {
        // Fill background with current color
        ctx.fillStyle = this.color;
        ctx.fillRect(100, 100, this.canvas.width - 200, this.canvas.height - 200);
        
        // Render message
        ctx.fillStyle = 'white';
        ctx.font = '32px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.message, this.canvas.width / 2, this.canvas.height / 2);
        
        if (this.state === 'complete') {
            ctx.font = '16px Courier New';
            ctx.fillText('Moving to next game...', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
        
        ctx.textAlign = 'left';
    }
}
