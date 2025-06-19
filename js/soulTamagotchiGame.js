// js/SoulTamagotchiGame.js

const SoulTamagotchiGame = {
    id: 'SoulTamagotchiGame',
    _container: null,
    _successCallback: null,
    _sharedData: null,
    _gameLoopInterval: null,
    _eventTimeout: null,

    _soul: {
        currentPlaneIndex: 0,
        sadhanaProgress: 0, // Progress within the current plane
        aspiration: 70,     // 0-100
        clarity: 60,        // 0-100
        serenity: 65,       // 0-100
        currentCondition: {
            name: "Neutral",
            type: "neutral", // 'neutral', 'positive', 'negative'
            description: "The soul is relatively stable.",
            duration: Infinity, // ticks, Infinity for persistent until changed
            effects: {} // e.g., { sadhanaRateModifier: 0, aspirationDrain: 0.1 }
        },
        visual: "✨" // Simple emoji to start
    },

    _planes: [
        {
            name: "The Physical Shell", target: 100, baseSadhanaRate: 0.1, visual: " पत्थर (Stone)",
            description: "Bound by physical senses and inertia. Needs awakening.",
            possibleConditions: [
                { name: "Deep Slumber", type: "negative", description: "Lost in inertia, slow progress.", duration: 200, effects: { sadhanaRateModifier: -0.05, aspirationChange: -0.2 } },
                { name: "Initial Stirring", type: "positive", description: "A faint call is heard.", duration: 150, effects: { sadhanaRateModifier: 0.02, aspirationChange: 0.1 } }
            ]
        },
        {
            name: "The Vital Currents", target: 150, baseSadhanaRate: 0.12, visual: "🌪️ (Tornado)",
            description: "Tossed by desires and emotional energies. Needs purification.",
            possibleConditions: [
                { name: "Vital Agitation", type: "negative", description: "Restless with desires, clarity suffers.", duration: 250, effects: { sadhanaRateModifier: -0.04, clarityChange: -0.3, serenityChange: -0.2 } },
                { name: "Emotional Outpouring", type: "positive", description: "A wave of devotion surges.", duration: 100, effects: { aspirationChange: 0.5, serenityChange: 0.1 } }
            ]
        },
        {
            name: "The Mental Maze", target: 200, baseSadhanaRate: 0.15, visual: "🧠 (Brain)",
            description: "Navigating thoughts and beliefs. Needs widening and illumination.",
            possibleConditions: [
                { name: "Veiled by Doubt", type: "negative", description: "Uncertainty clouds judgment.", duration: 300, effects: { sadhanaRateModifier: -0.06, clarityChange: -0.4 } },
                { name: "Insight Dawns", type: "positive", description: "A moment of clear understanding.", duration: 120, effects: { clarityChange: 0.5, sadhanaRateModifier: 0.03 } }
            ]
        },
        {
            name: "The Psychic Flame", target: 250, baseSadhanaRate: 0.2, visual: "💖 (Sparkling Heart)",
            description: "The soul's true presence emerges. Needs to come forward.",
            possibleConditions: [
                { name: "Ego's Shadow", type: "negative", description: "The old self resists psychic governance.", duration: 200, effects: { sadhanaRateModifier: -0.05, aspirationChange: -0.2 } },
                { name: "Psychic Guidance", type: "positive", description: "Inner voice leads clearly.", duration: 180, effects: { sadhanaRateModifier: 0.05, serenityChange: 0.3, clarityChange: 0.2 } }
            ]
        },
        {
            name: "The Spiritual Heights", target: 300, baseSadhanaRate: 0.25, visual: "🌌 (Milky Way)",
            description: "Experiencing peace, power, light from above. Needs integration.",
            possibleConditions: [
                { name: "Spiritual Dryness", type: "negative", description: "A sense of remoteness from the Divine.", duration: 250, effects: { aspirationChange: -0.3, sadhanaRateModifier: -0.04 } },
                { name: "Descending Peace", type: "positive", description: "A profound calm settles.", duration: 200, effects: { serenityChange: 0.5, sadhanaRateModifier: 0.06 } }
            ]
        },
        {
            name: "The Supramental Sun", target: 400, baseSadhanaRate: 0.3, visual: "☀️ (Sun)",
            description: "The Truth-Consciousness embodying. Divine life.",
            possibleConditions: [ // Less negative, more about integration challenges
                { name: "Transformation Crisis", type: "neutral", description: "Intense process of change.", duration: 150, effects: { sadhanaRateModifier: 0.02, serenityChange: -0.1 } }, // Can be unsettling but progressive
                { name: "Gnostic Radiance", type: "positive", description: "Living in divine truth and harmony.", duration: 300, effects: { sadhanaRateModifier: 0.1, aspirationChange: 0.2, clarityChange: 0.2, serenityChange: 0.2 } }
            ]
        }
    ],

    _ui: {
        title: null, quoteDisplay: null, soulVisual: null, planeName: null, planeDescription: null,
        sadhanaProgressDisplay: null, sadhanaProgressBar: null,
        aspirationDisplay: null, clarityDisplay: null, serenityDisplay: null,
        conditionName: null, conditionDescription: null,
        actionButtons: [], messageLog: null
    },

    _quotes: [ /* Same quotes as before, or new ones */
        "All life is Yoga.", "The Truth is in us...", "The Supramental is a truth...", /* ... more */
    ],
    _quoteInterval: null,
    _messages: [],

    init: function(container, successCallback, failureCallback, sharedData) {
        console.log(`GameManager: Initializing ${this.id}`);
        this._container = container;
        this._successCallback = successCallback;
        this._sharedData = { ...sharedData };

        this._resetSoulState();
        this._setupUI();
        this._startGameLoop();
        this._startQuoteLoop();
        this._scheduleNextEvent();

        console.log(`${this.id}: Initialized.`);
    },

    _resetSoulState: function() {
        this._soul = {
            currentPlaneIndex: 0, sadhanaProgress: 0, aspiration: 70, clarity: 60, serenity: 65,
            currentCondition: { name: "Initial Stillness", type: "neutral", description: "The journey begins.", duration: Infinity, effects: {} },
            visual: this._planes[0].visual
        };
        this._messages = ["The soul embarks on its ascent."];
    },

    _setupUI: function() {
        this._container.innerHTML = `
            <div id="soul-tamagotchi-game" style="font-family: 'Segoe UI', sans-serif; color: #444; padding: 15px; background-color: #e8eaf6; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 id="st-title" style="color: #3f51b5; text-align: center; margin-bottom: 5px;">The Soul's Ascent</h2>
                <p id="st-quote" style="font-style: italic; text-align: center; margin-bottom: 15px; min-height: 3em; color: #5c6bc0; font-size: 0.9em;"></p>
                
                <div style="display: flex; justify-content: space-around; align-items: flex-start; margin-bottom:15px;">
                    <div id="st-soul-area" style="text-align: center; flex-basis: 30%;">
                        <div id="st-soul-visual" style="font-size: 4em; margin-bottom: 10px; min-height:1.5em;">${this._soul.visual}</div>
                        <div id="st-plane-name" style="font-weight: bold; color: #3f51b5;"></div>
                        <div id="st-plane-description" style="font-size: 0.85em; color: #7986cb; min-height: 2em;"></div>
                    </div>

                    <div id="st-soul-stats" style="flex-basis: 65%;">
                        <div style="margin-bottom: 8px;">
                            Aspiration: <span id="st-aspiration" style="font-weight:bold;"></span>
                            <div style="background: #c5cae9; border-radius:3px;height:10px;"><div id="st-asp-bar" style="background:#7986cb;width:0%;height:10px;border-radius:3px;"></div></div>
                        </div>
                        <div style="margin-bottom: 8px;">
                            Clarity: <span id="st-clarity" style="font-weight:bold;"></span>
                            <div style="background: #c5cae9; border-radius:3px;height:10px;"><div id="st-clr-bar" style="background:#7986cb;width:0%;height:10px;border-radius:3px;"></div></div>
                        </div>
                        <div style="margin-bottom: 8px;">
                            Serenity: <span id="st-serenity" style="font-weight:bold;"></span>
                            <div style="background: #c5cae9; border-radius:3px;height:10px;"><div id="st-ser-bar" style="background:#7986cb;width:0%;height:10px;border-radius:3px;"></div></div>
                        </div>
                        <div style="margin-top: 10px;">
                            Condition: <strong id="st-condition-name" style="color: #c62828;"></strong>
                            <p id="st-condition-description" style="font-size: 0.9em; min-height: 1.5em;"></p>
                        </div>
                    </div>
                </div>
                
                <div>
                    Sadhana Progress: <span id="st-sadhana-progress"></span>
                    <div style="width: 100%; background-color: #c5cae9; border-radius: 5px; margin-bottom: 15px; padding: 2px;">
                        <div id="st-sadhana-bar" style="width: 0%; height: 20px; background-color: #3f51b5; border-radius: 3px; transition: width 0.5s ease-in-out; text-align:center; color:white; font-size:0.8em; line-height:20px;"></div>
                    </div>
                </div>

                <div id="st-actions" style="text-align: center; margin-bottom: 15px;">
                    <button data-action="inspire">Inspire Being (Aspiration+)</button>
                    <button data-action="meditate">Meditate (Serenity+)</button>
                    <button data-action="study">Study Wisdom (Clarity+)</button>
                    <button data-action="surrender">Offer & Surrender (Helps All)</button>
                </div>
                <div id="st-message-log-container" style="max-height: 6em; overflow-y: auto; border: 1px solid #c5cae9; padding: 5px; font-size: 0.8em; background: #fff; border-radius:3px;">
                   <ul id="st-message-log" style="list-style-type:none; padding-left:0; margin:0;"></ul>
                </div>
            </div>
        `;

        // Cache UI elements
        this._ui.title = document.getElementById('st-title');
        this._ui.quoteDisplay = document.getElementById('st-quote');
        this._ui.soulVisual = document.getElementById('st-soul-visual');
        this._ui.planeName = document.getElementById('st-plane-name');
        this._ui.planeDescription = document.getElementById('st-plane-description');
        
        this._ui.sadhanaProgressDisplay = document.getElementById('st-sadhana-progress');
        this._ui.sadhanaProgressBar = document.getElementById('st-sadhana-bar');

        this._ui.aspirationDisplay = document.getElementById('st-aspiration');
        this._ui.clarityDisplay = document.getElementById('st-clarity');
        this._ui.serenityDisplay = document.getElementById('st-serenity');
        this._ui.aspBar = document.getElementById('st-asp-bar');
        this._ui.clrBar = document.getElementById('st-clr-bar');
        this._ui.serBar = document.getElementById('st-ser-bar');

        this._ui.conditionName = document.getElementById('st-condition-name');
        this._ui.conditionDescription = document.getElementById('st-condition-description');
        this._ui.messageLog = document.getElementById('st-message-log');

        document.querySelectorAll('#st-actions button').forEach(btn => {
            this._ui.actionButtons.push(btn);
            btn.style.padding = "8px 12px";
            btn.style.margin = "3px";
            btn.style.border = "1px solid #7986cb";
            btn.style.background = "#e8eaf6";
            btn.style.color = "#3f51b5";
            btn.style.borderRadius = "4px";
            btn.style.cursor = "pointer";
            btn.onclick = (e) => this._handleAction(e.currentTarget.dataset.action);
        });
        this._updateUI();
    },

    _startGameLoop: function() {
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        this._gameLoopInterval = setInterval(() => this._updateGame(), 200); // Slower tick for Tamagotchi feel
    },
    _startQuoteLoop: function() { /* As before */ 
        if (this._quoteInterval) clearInterval(this._quoteInterval);
        this._displayRandomQuote(); 
        this._quoteInterval = setInterval(() => this._displayRandomQuote(), 20000);
    },
    _displayRandomQuote: function() { /* As before */
         if (this._ui.quoteDisplay && this._quotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * this._quotes.length);
            this._ui.quoteDisplay.textContent = `"${this._quotes[randomIndex]}"`;
        }
    },

    _scheduleNextEvent: function() {
        if (this._eventTimeout) clearTimeout(this._eventTimeout);
        const delay = 15000 + Math.random() * 15000; // 15-30 seconds
        this._eventTimeout = setTimeout(() => this._triggerRandomCondition(), delay);
    },

    _triggerRandomCondition: function() {
        const currentPlaneData = this._planes[this._soul.currentPlaneIndex];
        if (currentPlaneData.possibleConditions && currentPlaneData.possibleConditions.length > 0) {
            const newCondIndex = Math.floor(Math.random() * currentPlaneData.possibleConditions.length);
            const newCond = { ...currentPlaneData.possibleConditions[newCondIndex] }; // Create a copy
            // Adjust duration if not Infinity, make it ticks
            if (newCond.duration !== Infinity) newCond.duration *= (1000 / 200); // Convert seconds to ticks (if 200ms tick)

            this._soul.currentCondition = newCond;
            this._addMessage(`Condition changed: ${this._soul.currentCondition.name}. ${this._soul.currentCondition.description}`);
        }
        this._scheduleNextEvent(); // Schedule the next one
    },

    _updateGame: function() {
        if (this._soul.currentPlaneIndex >= this._planes.length) {
            // Should be caught by sadhana progress check, but safeguard
            this._completeGame();
            return;
        }
        const plane = this._planes[this._soul.currentPlaneIndex];
        const condition = this._soul.currentCondition;

        // 1. Apply passive drains/changes & condition effects
        this._soul.aspiration = Math.max(0, this._soul.aspiration - 0.1 - (condition.effects?.aspirationDrain || 0) + (condition.effects?.aspirationChange || 0) );
        this._soul.clarity = Math.max(0, this._soul.clarity - 0.05 + (condition.effects?.clarityChange || 0) );
        this._soul.serenity = Math.max(0, this._soul.serenity - 0.05 + (condition.effects?.serenityChange || 0) );
        
        // Cap states at 100
        this._soul.aspiration = Math.min(100, this._soul.aspiration);
        this._soul.clarity = Math.min(100, this._soul.clarity);
        this._soul.serenity = Math.min(100, this._soul.serenity);

        // 2. Condition duration
        if (condition.duration !== Infinity) {
            condition.duration--;
            if (condition.duration <= 0) {
                this._soul.currentCondition = { name: "Neutral", type: "neutral", description: "The previous condition has passed.", duration: Infinity, effects: {} };
                this._addMessage("The soul returns to a neutral state.");
            }
        }
        
        // 3. Calculate Sadhana Rate
        let sadhanaRate = plane.baseSadhanaRate;
        sadhanaRate *= (this._soul.aspiration / 75 + 0.5); // Aspiration is important
        sadhanaRate *= (this._soul.clarity / 100 + 0.5);   // Clarity helps
        sadhanaRate *= (this._soul.serenity / 100 + 0.5);  // Serenity helps
        sadhanaRate += (condition.effects?.sadhanaRateModifier || 0);
        sadhanaRate = Math.max(0.01, sadhanaRate); // Minimum progress unless heavily penalized

        // 4. Increment Sadhana Progress
        if (condition.type !== 'negative' || (condition.effects?.sadhanaRateModifier !== undefined && condition.effects.sadhanaRateModifier >= 0) || !condition.effects?.sadhanaRateModifier ) { // Allow progress if not negative or if negative but allows some progress.
             this._soul.sadhanaProgress += sadhanaRate;
        } else if (condition.type === 'negative' && condition.effects?.sadhanaRateModifier < 0) {
             this._soul.sadhanaProgress += sadhanaRate; // This will apply the negative modifier
             this._soul.sadhanaProgress = Math.max(0, this._soul.sadhanaProgress); // Don't go below 0
        }


        // 5. Check for Plane Advancement
        if (this._soul.sadhanaProgress >= plane.target) {
            this._soul.sadhanaProgress = 0;
            this._soul.currentPlaneIndex++;
            if (this._soul.currentPlaneIndex >= this._planes.length) {
                this._completeGame();
                return;
            }
            const newPlane = this._planes[this._soul.currentPlaneIndex];
            this._soul.visual = newPlane.visual;
            this._soul.currentCondition = { name: "New Horizons", type: "positive", description: `Reached ${newPlane.name}! A fresh perspective.`, duration: 100, effects: {aspirationChange: 10}};
            this._addMessage(`Ascended to ${newPlane.name}! ${newPlane.description}`);
        }
        this._updateUI();
    },

    _handleAction: function(actionType) {
        let msg = "";
        switch (actionType) {
            case 'inspire':
                this._soul.aspiration = Math.min(100, this._soul.aspiration + 15 + (this._soul.clarity > 70 ? 5 : 0) );
                msg = "Aspiration surges! (+15)";
                if (this._soul.currentCondition.name === "Spiritual Dryness") {
                    this._soul.currentCondition.duration = Math.max(0, this._soul.currentCondition.duration - 50); // Reduce duration
                    msg += " Spiritual dryness lessens.";
                }
                break;
            case 'meditate':
                this._soul.serenity = Math.min(100, this._soul.serenity + 20);
                this._soul.clarity = Math.min(100, this._soul.clarity + 5);
                msg = "Serenity deepens (+20), Clarity slightly improves (+5).";
                if (this._soul.currentCondition.name === "Vital Agitation" || this._soul.currentCondition.name === "Mental Maze") {
                     this._soul.currentCondition.duration = Math.max(0, this._soul.currentCondition.duration - 75);
                     msg += ` ${this._soul.currentCondition.name} is calmed.`;
                }
                break;
            case 'study':
                this._soul.clarity = Math.min(100, this._soul.clarity + 15 + (this._soul.aspiration > 70 ? 5 : 0) );
                msg = "Wisdom illuminates, Clarity increases (+15).";
                 if (this._soul.currentCondition.name === "Veiled by Doubt") {
                     this._soul.currentCondition.duration = Math.max(0, this._soul.currentCondition.duration - 100);
                     msg += " The veil of doubt thins.";
                 }
                break;
            case 'surrender':
                this._soul.aspiration = Math.min(100, this._soul.aspiration + 10);
                this._soul.serenity = Math.min(100, this._soul.serenity + 10);
                msg = "Offering brings peace and renewed aspiration (+10 each).";
                if (this._soul.currentCondition.name === "Ego's Shadow") {
                    this._soul.currentCondition.duration = 0; // Effectively clears it
                    msg += " Ego's shadow recedes.";
                }
                if (this._soul.currentCondition.type === "negative") { // General help for negative states
                    this._soul.currentCondition.duration = Math.max(0, this._soul.currentCondition.duration - 30);
                }
                break;
        }
        this._addMessage(msg);
        this._updateUI();
    },
    
    _addMessage: function(message) {
        this._messages.unshift(message); // Add to the beginning
        if (this._messages.length > 10) {
            this._messages.pop(); // Keep log size manageable
        }
        if (this._ui.messageLog) {
            this._ui.messageLog.innerHTML = this._messages.map(m => `<li>${m}</li>`).join('');
        }
    },

    _updateUI: function() {
        if (!this._ui.soulVisual) return; // UI not fully initialized

        const plane = this._planes[this._soul.currentPlaneIndex];
        if (!plane) { // Game completed or error
             if(this._soul.currentPlaneIndex >= this._planes.length) {
                // This is handled by _completeGame now
             } else {
                console.error("Current plane data is missing!");
             }
            return;
        }

        this._ui.soulVisual.textContent = this._soul.visual;
        this._ui.planeName.textContent = plane.name;
        this._ui.planeDescription.textContent = plane.description;

        this._ui.aspirationDisplay.textContent = `${Math.floor(this._soul.aspiration)}/100`;
        this._ui.clarityDisplay.textContent = `${Math.floor(this._soul.clarity)}/100`;
        this._ui.serenityDisplay.textContent = `${Math.floor(this._soul.serenity)}/100`;
        this._ui.aspBar.style.width = `${this._soul.aspiration}%`;
        this._ui.clrBar.style.width = `${this._soul.clarity}%`;
        this._ui.serBar.style.width = `${this._soul.serenity}%`;
        
        const sadhanaPerc = Math.min(100, (this._soul.sadhanaProgress / plane.target) * 100);
        this._ui.sadhanaProgressBar.style.width = `${sadhanaPerc}%`;
        this._ui.sadhanaProgressBar.textContent = `${Math.floor(sadhanaPerc)}%`;
        this._ui.sadhanaProgressDisplay.textContent = `to ${this._planes[this._soul.currentPlaneIndex+1]?.name || 'Completion'}`;


        this._ui.conditionName.textContent = this._soul.currentCondition.name;
        this._ui.conditionDescription.textContent = this._soul.currentCondition.description;
        if (this._soul.currentCondition.type === 'negative') {
            this._ui.conditionName.style.color = '#d32f2f'; // Red for negative
        } else if (this._soul.currentCondition.type === 'positive') {
            this._ui.conditionName.style.color = '#388e3c'; // Green for positive
        } else {
            this._ui.conditionName.style.color = '#546e7a'; // Neutral color
        }
        
        // Update message log
        if (this._ui.messageLog) {
             this._ui.messageLog.innerHTML = this._messages.map(m => `<li>- ${m}</li>`).join('');
        }
    },

    _completeGame: function() {
        console.log(`${this.id}: Game completed. Reached Supramental Sun.`);
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        if (this._quoteInterval) clearInterval(this._quoteInterval);
        if (this._eventTimeout) clearTimeout(this._eventTimeout);

        const finalMessage = `
            <div style="padding: 20px; text-align: center; color: #3f51b5; background-color: #e8eaf6;">
                <h2 style="color: #303f9f;">The Soul is Luminous!</h2>
                <div style="font-size: 5em; margin: 20px 0;">☀️</div>
                <p>Having traversed all planes, the soul now embodies the Supramental Truth-Consciousness.</p>
                <p>"The Supramental Transfiguration is a necessity of the spiritual evolution."</p>
                <p>Points Achieved (example): ${Math.floor(this._soul.aspiration + this._soul.clarity + this._soul.serenity) * 10}</p>
            </div>`;
        this._container.innerHTML = finalMessage;
        
        this._sharedData.soulTamagotchiScore = Math.floor(this._soul.aspiration + this._soul.clarity + this._soul.serenity) * 10;
        this._sharedData.lastSpiritualJourney = "Completed the Soul's Ascent Tamagotchi.";

        if (this._successCallback) {
            this._successCallback(this._sharedData);
        }
    },

    destroy: function() {
        console.log(`${this.id}: Destroying...`);
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        if (this._quoteInterval) clearInterval(this._quoteInterval);
        if (this._eventTimeout) clearTimeout(this._eventTimeout);
        
        this._ui.actionButtons.forEach(btn => btn.onclick = null);
        this._container.innerHTML = '';
        // Reset all private underscored variables if planning for re-init
        this._container = null;
        this._successCallback = null;
        // ... etc.
        console.log(`${this.id}: Destroyed.`);
    }
};
