// Base Game Class
class Game {
    constructor(name, instructions, backgroundColor = '#0f4c75') {
        this.name = name;
        this.instructions = instructions;
        this.backgroundColor = backgroundColor;
    }
    
    init(canvas, ctx, gameData) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.gameData = gameData;
    }
    
    update(keys) {
        // Override in subclasses
        return false;
    }
    
    render(ctx) {
        // Override in subclasses
    }
}
