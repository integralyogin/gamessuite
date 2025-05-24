// Maze Game
class MazeGame extends Game {
    constructor() {
        super('Simple Maze', 'Use WASD or Arrow Keys to navigate to the exit', '#2d1b69');
    }
    
    init(canvas, ctx, gameData) {
        super.init(canvas, ctx, gameData);
        
        this.player = {
            x: 1,
            y: 1,
            size: 15
        };
        
        this.cellSize = 25;
        this.cols = Math.floor(canvas.width / this.cellSize);
        this.rows = Math.floor(canvas.height / this.cellSize);
        
        // Simple maze layout (1 = wall, 0 = path)
        this.maze = this.generateSimpleMaze();
        this.goalX = this.cols - 2;
        this.goalY = this.rows - 2;
    }
    
    generateSimpleMaze() {
        const maze = [];
        for (let y = 0; y < this.rows; y++) {
            maze[y] = [];
            for (let x = 0; x < this.cols; x++) {
                // Create border walls and some internal walls
                if (x === 0 || y === 0 || x === this.cols - 1 || y === this.rows - 1) {
                    maze[y][x] = 1;
                } else if ((x % 4 === 0 && y % 2 === 0) || (y % 4 === 0 && x % 2 === 0)) {
                    maze[y][x] = 1;
                } else {
                    maze[y][x] = 0;
                }
            }
        }
        
        // Ensure start and goal are clear
        maze[1][1] = 0;
        maze[this.rows - 2][this.cols - 2] = 0;
        
        return maze;
    }
    
    update(keys) {
        let newX = this.player.x;
        let newY = this.player.y;
        
        if (keys['KeyA'] || keys['ArrowLeft']) newX--;
        if (keys['KeyD'] || keys['ArrowRight']) newX++;
        if (keys['KeyW'] || keys['ArrowUp']) newY--;
        if (keys['KeyS'] || keys['ArrowDown']) newY++;
        
        // Check bounds and walls
        if (newX >= 0 && newX < this.cols && newY >= 0 && newY < this.rows) {
            if (this.maze[newY][newX] === 0) {
                this.player.x = newX;
                this.player.y = newY;
            }
        }
        
        // Check goal
        if (this.player.x === this.goalX && this.player.y === this.goalY) {
            return true;
        }
        
        return false;
    }
    
    render(ctx) {
        // Render maze
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.maze[y][x] === 1) {
                    ctx.fillStyle = '#16213e';
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
        
        // Render goal
        ctx.fillStyle = '#bbe1fa';
        ctx.fillRect(this.goalX * this.cellSize + 2, this.goalY * this.cellSize + 2, 
                   this.cellSize - 4, this.cellSize - 4);
        
        // Render player
        ctx.fillStyle = '#3282b8';
        ctx.fillRect(this.player.x * this.cellSize + 5, this.player.y * this.cellSize + 5, 
                   this.player.size, this.player.size);
    }
}
