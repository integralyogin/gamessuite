// Game Manager - Main controller
class GameManager {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentGameIndex = 0;
        this.gameData = {}; // Persistent data between games
        this.keys = {};
        
        // Configure games here - easy to modify order/add/remove
        this.games = [
            new PlatformerGame(),
            new MazeGame(),
            new ReactionGame()
        ];
        
        this.setupEventListeners();
        this.updateUI();
        this.startCurrentGame();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    updateUI() {
        document.getElementById('currentGame').textContent = this.currentGameIndex + 1;
        document.getElementById('totalGames').textContent = this.games.length;
        document.getElementById('gameName').textContent = this.games[this.currentGameIndex].name;
        document.getElementById('instructions').textContent = this.games[this.currentGameIndex].instructions;
    }
    
    startCurrentGame() {
        if (this.currentGameIndex >= this.games.length) {
            this.showVictory();
            return;
        }
        
        this.games[this.currentGameIndex].init(this.canvas, this.ctx, this.gameData);
        this.gameLoop();
    }
    
    gameLoop() {
        const currentGame = this.games[this.currentGameIndex];
        
        // Clear canvas
        this.ctx.fillStyle = currentGame.backgroundColor || '#0f4c75';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update and render current game
        const gameComplete = currentGame.update(this.keys);
        currentGame.render(this.ctx);
        
        if (gameComplete) {
            this.nextGame();
        } else {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    nextGame() {
        this.showTransition(() => {
            this.currentGameIndex++;
            this.updateUI();
            this.startCurrentGame();
        });
    }
    
    showTransition(callback) {
        const transition = document.getElementById('transition');
        transition.style.display = 'flex';
        
        setTimeout(() => {
            transition.style.display = 'none';
            callback();
        }, 2000);
    }
    
    showVictory() {
        const transition = document.getElementById('transition');
        document.getElementById('transitionText').textContent = 'All Games Complete!';
        transition.querySelector('div div:last-child').textContent = 'Thanks for playing!';
        transition.style.display = 'flex';
    }
}
