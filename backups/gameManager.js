class GameManager {
    constructor() {
        this.gameContainer = document.getElementById('game-container');
        this.currentGame = null;
        this.gameOrder = ['Platformer', 'RPGgame'];
        this.gameIndex = 0;
        this.sharedState = {};
    }

    start() {
        this.loadGame(this.gameOrder[this.gameIndex]);
    }

    loadGame(gameName) {
        if (this.currentGame) {
            this.currentGame.stop();
            this.gameContainer.innerHTML = '';
        }

        switch (gameName) {
            case 'Platformer':
                this.currentGame = new PlatformerGame(this);
                break;
            case 'RPGgame':
                this.currentGame = new RPGgame(this);
                break;
        }

        this.currentGame.start();
    }

    nextGame() {
        this.gameIndex = (this.gameIndex + 1) % this.gameOrder.length;
        this.loadGame(this.gameOrder[this.gameIndex]);
    }
}
