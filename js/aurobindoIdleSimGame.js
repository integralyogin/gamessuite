// js/AurobindoIdleSimGame.js

const AurobindoIdleSimGame = {
    id: 'AurobindoIdleSimGame',
    _container: null,
    _successCallback: null,
    // _failureCallback: null, // Not typically used in a pure idle game unless a critical error
    _sharedData: null,

    _gameLoopInterval: null,
    _currentStageIndex: 0,
    _progress: 0, // Progress towards current stage completion (0 to 100)
    _aspirationBoost: 0, // Temporary boost from player action
    _aspirationBoostDuration: 0, // How long the boost lasts

    _stages: [
        { name: "The Inconscient Veil", target: 100, baseRate: 0.2, description: "Emerging from Nescience..." },
        { name: "The Physical Mind", target: 150, baseRate: 0.25, description: "Awareness bound by matter and senses." },
        { name: "The Vital Impulses", target: 200, baseRate: 0.3, description: "Navigating desires and life-energies." },
        { name: "The Mental Realm", target: 250, baseRate: 0.35, description: "Developing reason and intellect." },
        { name: "The Psychic Opening", target: 300, baseRate: 0.4, description: "The soul's flame begins to guide." },
        { name: "The Spiritual Mind", target: 400, baseRate: 0.45, description: "Ascending to Higher Mind, Illumined Mind, Intuition, Overmind." },
        { name: "The Supramental Consciousness", target: 500, baseRate: 0.5, description: "The Gnostic Being: Truth-Consciousness manifested. Transformation." }
    ],

    _ui: {
        title: null,
        currentStageName: null,
        currentStageDescription: null,
        progressBar: null,
        progressText: null,
        aspirationButton: null,
        aspirationStatus: null,
        quoteDisplay: null
    },

    _quotes: [
        "All life is Yoga.",
        "The Truth is in us, we are the Truth from the beginning, it is only a matter of the veil of Avidya being removed.",
        "The Supramental is a truth and its advent is in the very nature of things an inevitable necessity.",
        "By aspiration is meant the call of the soul to the Divine.",
        "Receptivity is the capacity of admitting and retaining the Divine Workings.",
        "The psychic being is the soul developing in the evolution.",
        "Our actual enemy is not any force exterior to ourselves, but our own crying weaknesses, our cowardice, our selfishness, our hypocrisy, our purblind sentimentalism."
    ],
    _quoteInterval: null,

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log(`GameManager: Initializing ${this.id} with sharedData:`, sharedData);
        this._container = container;
        this._successCallback = successCallback;
        // this._failureCallback = failureCallback; // Store if needed
        this._sharedData = { ...sharedData }; // Make a local copy

        this._currentStageIndex = 0;
        this._progress = 0;
        this._aspirationBoost = 0;
        this._aspirationBoostDuration = 0;

        this._setupUI();
        this._startGameLoop();
        this._startQuoteLoop();

        console.log(`${this.id}: Initialized.`);
    },

    _setupUI: function() {
        this._container.innerHTML = `
            <div id="aurobindo-sim-container" style="font-family: 'Times New Roman', serif; color: #333; padding: 20px; text-align: center; background-color: #f4f0e8; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.1);">
                <h2 id="aurobindo-title" style="color: #5a402e; margin-bottom: 10px;">The Ascent to Godhood</h2>
                <p id="aurobindo-quote" style="font-style: italic; margin-bottom: 20px; min-height: 40px; color: #7a604e;"></p>
                
                <div style="margin-bottom: 15px;">
                    <strong id="aurobindo-stage-name" style="font-size: 1.4em; color: #6a503e;"></strong>
                    <p id="aurobindo-stage-description" style="font-size: 0.9em; color: #8a705e; min-height: 20px;"></p>
                </div>

                <div id="aurobindo-progress-bar-container" style="width: 100%; background-color: #e0d8cc; border-radius: 5px; margin-bottom: 5px; padding: 3px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);">
                    <div id="aurobindo-progress-bar" style="width: 0%; height: 25px; background-color: #8c6f58; border-radius: 3px; transition: width 0.5s ease-in-out;"></div>
                </div>
                <p id="aurobindo-progress-text" style="font-size: 0.9em; color: #5a402e; margin-bottom: 25px;"></p>

                <button id="aurobindo-aspiration-button" style="padding: 12px 25px; font-size: 1.1em; background-color: #7a9a7a; color: white; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;">Focus Aspiration</button>
                <p id="aurobindo-aspiration-status" style="font-size: 0.9em; color: #6a8a6a; min-height: 20px; margin-top: 5px;"></p>

                <p style="font-size: 0.8em; color: #aaa; margin-top: 30px;">This is an idle simulation. Progress occurs automatically.</p>
            </div>
        `;

        this._ui.title = document.getElementById('aurobindo-title');
        this._ui.quoteDisplay = document.getElementById('aurobindo-quote');
        this._ui.currentStageName = document.getElementById('aurobindo-stage-name');
        this._ui.currentStageDescription = document.getElementById('aurobindo-stage-description');
        this._ui.progressBar = document.getElementById('aurobindo-progress-bar');
        this._ui.progressText = document.getElementById('aurobindo-progress-text');
        this._ui.aspirationButton = document.getElementById('aurobindo-aspiration-button');
        this._ui.aspirationStatus = document.getElementById('aurobindo-aspiration-status');

        this._ui.aspirationButton.onclick = () => this._boostAspiration();
        
        this._updateUI();
    },

    _startGameLoop: function() {
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        this._gameLoopInterval = setInterval(() => this._updateGame(), 100); // Update 10 times per second for smoother progress
    },
    
    _startQuoteLoop: function() {
        if (this._quoteInterval) clearInterval(this._quoteInterval);
        this._displayRandomQuote(); // Initial quote
        this._quoteInterval = setInterval(() => this._displayRandomQuote(), 15000); // New quote every 15 seconds
    },

    _displayRandomQuote: function() {
        if (this._ui.quoteDisplay && this._quotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * this._quotes.length);
            this._ui.quoteDisplay.textContent = `"${this._quotes[randomIndex]}"`;
        }
    },

    _updateGame: function() {
        if (this._currentStageIndex >= this._stages.length) {
            this._completeGame();
            return;
        }

        const currentStage = this._stages[this._currentStageIndex];
        let progressIncrement = currentStage.baseRate;

        if (this._aspirationBoostDuration > 0) {
            progressIncrement += this._aspirationBoost;
            this._aspirationBoostDuration -= 0.1; // Reduce duration (since loop is 100ms)
            if (this._aspirationBoostDuration <= 0) {
                this._aspirationBoost = 0;
                this._aspirationBoostDuration = 0;
                 if(this._ui.aspirationStatus) this._ui.aspirationStatus.textContent = "";
            } else {
                 if(this._ui.aspirationStatus) this._ui.aspirationStatus.textContent = `Aspiration heightened! (+${this._aspirationBoost.toFixed(1)} pts/s for ${Math.ceil(this._aspirationBoostDuration)}s)`;
            }
        }


        this._progress += progressIncrement;

        if (this._progress >= currentStage.target) {
            this._progress = 0;
            this._currentStageIndex++;
            if (this._currentStageIndex >= this._stages.length) {
                this._completeGame();
                return;
            }
            // Optional: provide a small permanent boost or reward for stage completion
            // For now, just move to next stage.
        }
        this._updateUI();
    },

    _updateUI: function() {
        if (!this._ui.currentStageName) return; // UI not ready

        if (this._currentStageIndex >= this._stages.length) {
            // This case should be handled by _completeGame, but as a fallback:
            this._ui.currentStageName.textContent = "Transformation Complete";
            this._ui.currentStageDescription.textContent = "The journey continues beyond forms.";
            this._ui.progressBar.style.width = '100%';
            this._ui.progressText.textContent = '100%';
            this._ui.aspirationButton.disabled = true;
            return;
        }

        const currentStage = this._stages[this._currentStageIndex];
        this._ui.currentStageName.textContent = currentStage.name;
        this._ui.currentStageDescription.textContent = currentStage.description;

        const percentage = Math.min(100, (this._progress / currentStage.target) * 100);
        this._ui.progressBar.style.width = `${percentage}%`;
        this._ui.progressText.textContent = `${Math.floor(percentage)}% (${Math.floor(this._progress)} / ${currentStage.target} Sadhana)`;
    },

    _boostAspiration: function() {
        if (this._aspirationBoostDuration > 0) { // Prevent spamming for stacking boost unfairly
            if(this._ui.aspirationStatus) this._ui.aspirationStatus.textContent = "Aspiration is already focused. Be patient.";
            return;
        }
        this._aspirationBoost = (this._stages[this._currentStageIndex]?.baseRate || 0.2) * 2; // Boost is 2x base rate of current stage
        this._aspirationBoostDuration = 10; // Boost lasts for 10 seconds
        if(this._ui.aspirationStatus) this._ui.aspirationStatus.textContent = `Aspiration heightened! (+${this._aspirationBoost.toFixed(1)} pts/s for 10s)`;
        console.log(`${this.id}: Aspiration boosted by ${this._aspirationBoost} for 10 seconds.`);
    },

    _completeGame: function() {
        console.log(`${this.id}: Game completed. Reached Supramental Consciousness.`);
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        if (this._quoteInterval) clearInterval(this._quoteInterval);

        this._container.innerHTML = `
            <div style="padding: 30px; text-align: center; color: #5a402e; background-color: #f4f0e8;">
                <h2 style="color: #5a402e;">Transformation Attained!</h2>
                <p>You have realized the Supramental Consciousness.</p>
                <p>"Man is a transitional being. He is not final. The step from man to superman is the next approaching achievement in the earth's evolution. It is inevitable." - Sri Aurobindo</p>
                <p>Shared Data (Example): ${JSON.stringify(this._sharedData)}</p>
            </div>
        `;
        // Pass data to GameManager, e.g., indicating completion
        const gameData = {
            finalStage: this._stages[this._stages.length - 1].name,
            message: "Achieved Supramental Transformation.",
            // You could add any relevant stats from this game to sharedData if needed
            // For instance, if this game awarded some "spiritual insight" points:
            // spiritualInsightPoints: (this._sharedData.spiritualInsightPoints || 0) + 100
        };
        
        // Example of modifying shared data:
        this._sharedData.lastSpiritualMilestone = gameData.finalStage;
        this._sharedData.totalSpiritualPoints = (this._sharedData.totalSpiritualPoints || 0) + 1000;


        if (this._successCallback) {
            this._successCallback(this._sharedData); // Pass back the modified sharedData
        }
    },

    destroy: function() {
        console.log(`${this.id}: Destroying...`);
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        if (this._quoteInterval) clearInterval(this._quoteInterval);
        if (this._ui.aspirationButton && typeof this._ui.aspirationButton.onclick === 'function') {
             this._ui.aspirationButton.onclick = null; // Remove event listener
        }
        this._container.innerHTML = ''; // Clear the UI
        this._container = null;
        this._successCallback = null;
        // this._failureCallback = null;
        this._sharedData = null;
        // Reset other internal state if necessary for re-initialization
        this._currentStageIndex = 0;
        this._progress = 0;
        this._aspirationBoost = 0;
        this._aspirationBoostDuration = 0;

        console.log(`${this.id}: Destroyed.`);
    }
};
