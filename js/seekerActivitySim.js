// js/SeekerActivitySim.js

const SeekerActivitySim = {
    id: 'SeekerActivitySim',
    _container: null,
    _successCallback: null,
    _sharedData: null,
    _gameLoopInterval: null,
    _eventTimeout: null, // For occasional small events/thoughts

    _seeker: {
        currentPlaneIndex: 0,
        sadhanaProgress: 0,
        energies: {
            physical: 80, // 0-100
            mental: 70,   // 0-100
            soulful: 60,  // 0-100
            spiritual: 50 // 0-100
        },
        currentActivity: {
            id: 'idle',
            icon: '🧘', // Default/idle state
            text: 'Seeker is observing.',
            effects: { physical: -0.05, mental: -0.02, soulful: 0.01, spiritual: 0.01 } // Slight drain/gain
        },
        isFatigued: false // Flag if physical energy is too low
    },

    // Simplified planes for this version
    _planes: [
        { name: "The Physical Realm", target: 100, quote: "The body is the temple." },
        { name: "The Vital Realm", target: 150, quote: "Energy flows and shapes life." },
        { name: "The Mental Realm", target: 200, quote: "Thought explores the infinite." },
        { name: "The Psychic Realm", target: 250, quote: "The soul's light guides within." },
        { name: "The Spiritual Realm", target: 300, quote: "Vast peace and boundless light." },
        { name: "The Supramental Realm", target: 400, quote: "Truth-Consciousness embodies." }
    ],

    _activities: {
        'rest': { id: 'rest', icon: '😴', text: 'Seeker is resting.', effects: { physical: 0.5, mental: 0.05, soulful: 0, spiritual: 0 } },
        'eat': { id: 'eat', icon: '🍎', text: 'Seeker is eating mindfully.', effects: { physical: 0.3, mental: 0.1, soulful: 0.05, spiritual: 0 } },
        'study': { id: 'study', icon: '📚', text: 'Seeker is studying wisdom.', effects: { physical: -0.2, mental: 0.4, soulful: 0.05, spiritual: 0.05 } },
        'contemplate': { id: 'contemplate', icon: '🤔', text: 'Seeker is contemplating deeply.', effects: { physical: -0.1, mental: 0.3, soulful: 0.1, spiritual: 0.15 } },
        'meditate': { id: 'meditate', icon: '🙏', text: 'Seeker is in deep meditation.', effects: { physical: -0.15, mental: 0.1, soulful: 0.5, spiritual: 0.3 } },
        'serve': { id: 'serve', icon: '😊', text: 'Seeker is offering service.', effects: { physical: -0.1, mental: 0.05, soulful: 0.4, spiritual: 0.1 } },
        'idle': { id: 'idle', icon: '🧘', text: 'Seeker is observing.', effects: { physical: -0.05, mental: -0.02, soulful: 0.01, spiritual: 0.01 } }
    },

    _ui: {
        quoteDisplay: null, seekerActivityIcon: null, seekerActivityText: null, planeName: null,
        sadhanaProgressDisplay: null, sadhanaProgressBar: null,
        physicalEnergyDisplay: null, mentalEnergyDisplay: null, soulfulEnergyDisplay: null, spiritualEnergyDisplay: null,
        physicalBar: null, mentalBar: null, soulfulBar: null, spiritualBar: null,
        actionButtonsContainer: null, messageLog: null
    },
    _messages: [],

    init: function(container, successCallback, failureCallback, sharedData) {
        this._container = container;
        this._successCallback = successCallback;
        this._sharedData = { ...sharedData };
        this._resetSeekerState();
        this._setupUI();
        this._startGameLoop();
        this._scheduleEvent();
        this._addMessage("The Seeker begins their journey.");
        console.log(`${this.id}: Initialized.`);
    },

    _resetSeekerState: function() {
        this._seeker = {
            currentPlaneIndex: 0, sadhanaProgress: 0,
            energies: { physical: 80, mental: 70, soulful: 60, spiritual: 50 },
            currentActivity: { ...this._activities.idle }, // Start with idle
            isFatigued: false
        };
        this._messages = [];
    },

    _setupUI: function() {
        this._container.innerHTML = `
            <div id="seeker-activity-sim" style="font-family: Arial, sans-serif; padding: 15px; background-color: #f0f4f8; border-radius: 8px; color: #333;">
                <p id="sas-quote" style="text-align: center; font-style: italic; margin-bottom: 15px; color: #557; min-height: 1.5em;"></p>
                
                <div id="sas-seeker-display" style="text-align: center; margin-bottom: 20px; padding: 10px; background-color: #e3eaf2; border-radius: 6px;">
                    <span id="sas-seeker-icon" style="font-size: 3em; display: block;"></span>
                    <p id="sas-seeker-text" style="margin-top: 5px; font-size: 1.1em; color: #446;"></p>
                </div>

                <p style="text-align:center; margin-bottom:10px;">Current Plane: <strong id="sas-plane-name"></strong></p>

                <div id="sas-energies" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; font-size:0.9em;">
                    <div>Physical: <span id="sas-physical-val"></span><div class="sas-bar-bg"><div id="sas-physical-bar" class="sas-bar"></div></div></div>
                    <div>Mental: <span id="sas-mental-val"></span><div class="sas-bar-bg"><div id="sas-mental-bar" class="sas-bar"></div></div></div>
                    <div>Soulful: <span id="sas-soulful-val"></span><div class="sas-bar-bg"><div id="sas-soulful-bar" class="sas-bar"></div></div></div>
                    <div>Spiritual: <span id="sas-spiritual-val"></span><div class="sas-bar-bg"><div id="sas-spiritual-bar" class="sas-bar"></div></div></div>
                </div>
                <style>
                    .sas-bar-bg { background-color: #d1d9e6; border-radius: 3px; height: 12px; margin-top:2px; }
                    .sas-bar { background-color: #6a8ec8; height: 100%; border-radius: 3px; transition: width 0.3s ease; }
                </style>

                <div>
                    Sadhana Progress (<span id="sas-sadhana-progress-val"></span>% to next Plane):
                    <div style="width: 100%; background-color: #d1d9e6; border-radius: 5px; margin-bottom: 15px; padding: 2px;">
                        <div id="sas-sadhana-bar" class="sas-bar" style="background-color: #4a6eA8; height: 18px; text-align:center; color:white; font-size:0.8em; line-height:18px;"></div>
                    </div>
                </div>

                <p style="text-align:center; margin-bottom:5px;">Guide Seeker's Focus:</p>
                <div id="sas-actions" style="text-align: center; margin-bottom: 15px; display:flex; flex-wrap:wrap; justify-content:center; gap:5px;"></div>
                
                <div id="sas-message-log-container" style="max-height: 5em; overflow-y: auto; border: 1px solid #d1d9e6; padding: 8px; font-size: 0.85em; background: #fff; border-radius:3px;">
                   <ul id="sas-message-log" style="list-style-type:none; padding-left:0; margin:0;"></ul>
                </div>
            </div>
        `;

        this._ui.quoteDisplay = document.getElementById('sas-quote');
        this._ui.seekerActivityIcon = document.getElementById('sas-seeker-icon');
        this._ui.seekerActivityText = document.getElementById('sas-seeker-text');
        this._ui.planeName = document.getElementById('sas-plane-name');

        this._ui.sadhanaProgressDisplay = document.getElementById('sas-sadhana-progress-val');
        this._ui.sadhanaProgressBar = document.getElementById('sas-sadhana-bar');

        this._ui.physicalEnergyDisplay = document.getElementById('sas-physical-val');
        this._ui.mentalEnergyDisplay = document.getElementById('sas-mental-val');
        this._ui.soulfulEnergyDisplay = document.getElementById('sas-soulful-val');
        this._ui.spiritualEnergyDisplay = document.getElementById('sas-spiritual-val');
        this._ui.physicalBar = document.getElementById('sas-physical-bar');
        this._ui.mentalBar = document.getElementById('sas-mental-bar');
        this._ui.soulfulBar = document.getElementById('sas-soulful-bar');
        this._ui.spiritualBar = document.getElementById('sas-spiritual-bar');
        
        this._ui.actionsContainer = document.getElementById('sas-actions');
        this._ui.messageLog = document.getElementById('sas-message-log');

        for (const actId in this._activities) {
            if (actId === 'idle' && Object.keys(this._activities).length > 1) continue; // Don't make idle a button if other activities exist
            const activity = this._activities[actId];
            const btn = document.createElement('button');
            btn.dataset.action = activity.id;
            btn.textContent = `${activity.icon} ${activity.id.charAt(0).toUpperCase() + activity.id.slice(1)}`;
            btn.style.padding = "8px 10px"; btn.style.fontSize="0.9em"; btn.style.border="1px solid #9cb0d1"; btn.style.background="#e3eaf2"; btn.style.borderRadius="4px"; btn.style.cursor="pointer";
            btn.onclick = () => this._setActivity(activity.id);
            this._ui.actionsContainer.appendChild(btn);
        }
        this._updateUI();
    },

    _startGameLoop: function() {
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        this._gameLoopInterval = setInterval(() => this._updateGame(), 500); // Slower tick, 2 times a second
    },
    
    _scheduleEvent: function() {
        if(this._eventTimeout) clearTimeout(this._eventTimeout);
        const delay = 20000 + Math.random() * 20000; // 20-40 seconds
        this._eventTimeout = setTimeout(() => this._triggerMinorEvent(), delay);
    },

    _triggerMinorEvent: function() {
        const events = [
            { msg: "A wave of peacefulness washes over the Seeker.", effect: () => this._seeker.energies.spiritual = Math.min(100, this._seeker.energies.spiritual + 5) },
            { msg: "A distracting thought troubles the Seeker's mind.", effect: () => this._seeker.energies.mental = Math.max(0, this._seeker.energies.mental - 5) },
            { msg: "The Seeker feels a pang of old longing.", effect: () => this._seeker.energies.soulful = Math.max(0, this._seeker.energies.soulful - 3) },
            { msg: "A surge of unexpected energy invigorates the Seeker.", effect: () => this._seeker.energies.physical = Math.min(100, this._seeker.energies.physical + 10) },
            { msg: "The Seeker recalls an inspiring teaching.", effect: () => {this._seeker.energies.mental += 3; this._seeker.energies.spiritual +=2;} }
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        randomEvent.effect();
        this._addMessage(randomEvent.msg);
        this._updateUI();
        this._scheduleEvent();
    },

    _setActivity: function(activityId) {
        if (this._activities[activityId]) {
            if (this._seeker.isFatigued && activityId !== 'rest' && activityId !== 'eat') {
                this._addMessage("Seeker is too fatigued for that activity. Must rest or eat first.");
                return;
            }
            this._seeker.currentActivity = { ...this._activities[activityId] };
            this._addMessage(this._seeker.currentActivity.text);
            this._updateUI(); // Immediate feedback for activity change
        }
    },

    _updateGame: function() {
        const activityEffects = this._seeker.currentActivity.effects;

        // Apply activity effects to energies
        for (const energyType in activityEffects) {
            this._seeker.energies[energyType] += activityEffects[energyType];
            this._seeker.energies[energyType] = Math.max(0, Math.min(100, this._seeker.energies[energyType]));
        }

        // Check for fatigue
        if (this._seeker.energies.physical < 10 && !this._seeker.isFatigued) {
            this._seeker.isFatigued = true;
            this._addMessage("Seeker has become fatigued and needs rest or nourishment!");
            if (this._seeker.currentActivity.id !== 'rest' && this._seeker.currentActivity.id !== 'eat') {
                 this._setActivity('idle'); // Switch to idle if not already resting/eating
            }
        } else if (this._seeker.energies.physical > 30 && this._seeker.isFatigued) {
            this._seeker.isFatigued = false;
            this._addMessage("Seeker feels recovered from fatigue.");
        }
        
        // Calculate Sadhana progress rate
        let sadhanaRate = 0.1; // Base minimum
        if (!this._seeker.isFatigued) {
            sadhanaRate += (this._seeker.energies.physical / 200); // Max +0.5
            sadhanaRate += (this._seeker.energies.mental / 150);   // Max +0.66
            sadhanaRate += (this._seeker.energies.soulful / 100);  // Max +1.0
            sadhanaRate += (this._seeker.energies.spiritual / 80); // Max +1.25
            // If any energy is very low (e.g. < 20), penalize rate significantly
            for (const type in this._seeker.energies) {
                if (this._seeker.energies[type] < 20) sadhanaRate *= 0.3; // Heavy penalty
            }
        } else {
            sadhanaRate = 0.01; // Minimal progress if fatigued
        }
        sadhanaRate = Math.max(0.01, sadhanaRate / 5); // Overall scaling, ensuring some minimal progress

        this._seeker.sadhanaProgress += sadhanaRate;
        
        // Check for Plane Advancement
        const currentPlane = this._planes[this._seeker.currentPlaneIndex];
        if (this._seeker.sadhanaProgress >= currentPlane.target) {
            this._seeker.sadhanaProgress = 0;
            this._seeker.currentPlaneIndex++;
            if (this._seeker.currentPlaneIndex >= this._planes.length) {
                this._completeGame();
                return;
            }
            const newPlane = this._planes[this._seeker.currentPlaneIndex];
            this._addMessage(`Ascended to ${newPlane.name}! ${newPlane.quote}`);
            // Give a small boost to all energies on advancing
            for (const energyType in this._seeker.energies) {
                this._seeker.energies[energyType] = Math.min(100, this._seeker.energies[energyType] + 10);
            }
        }
        this._updateUI();
    },
    
    _addMessage: function(message) {
        this._messages.unshift(message);
        if (this._messages.length > 7) this._messages.pop();
        if (this._ui.messageLog) {
            this._ui.messageLog.innerHTML = this._messages.map(m => `<li>- ${m}</li>`).join('');
        }
    },

    _updateUI: function() {
        if (!this._ui.seekerActivityIcon) return; // UI not ready

        const plane = this._planes[this._seeker.currentPlaneIndex];
        if (!plane) return;

        this._ui.quoteDisplay.textContent = `"${plane.quote}"`;
        this._ui.seekerActivityIcon.textContent = this._seeker.currentActivity.icon;
        this._ui.seekerActivityText.textContent = this._seeker.currentActivity.text;
        this._ui.planeName.textContent = plane.name;

        this._ui.physicalEnergyDisplay.textContent = `${Math.floor(this._seeker.energies.physical)}%`;
        this._ui.mentalEnergyDisplay.textContent = `${Math.floor(this._seeker.energies.mental)}%`;
        this._ui.soulfulEnergyDisplay.textContent = `${Math.floor(this._seeker.energies.soulful)}%`;
        this._ui.spiritualEnergyDisplay.textContent = `${Math.floor(this._seeker.energies.spiritual)}%`;
        this._ui.physicalBar.style.width = `${this._seeker.energies.physical}%`;
        this._ui.mentalBar.style.width = `${this._seeker.energies.mental}%`;
        this._ui.soulfulBar.style.width = `${this._seeker.energies.soulful}%`;
        this._ui.spiritualBar.style.width = `${this._seeker.energies.spiritual}%`;
        
        const sadhanaPerc = Math.min(100, (this._seeker.sadhanaProgress / plane.target) * 100);
        this._ui.sadhanaProgressBar.style.width = `${sadhanaPerc}%`;
        this._ui.sadhanaProgressBar.textContent = `${Math.floor(sadhanaPerc)}%`;
        this._ui.sadhanaProgressDisplay.textContent = Math.floor(sadhanaPerc);

        if (this._ui.messageLog) {
             this._ui.messageLog.innerHTML = this._messages.map(m => `<li>- ${m}</li>`).join('');
        }
    },

    _completeGame: function() {
        console.log(`${this.id}: Game completed.`);
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        if (this._eventTimeout) clearTimeout(this._eventTimeout);

        this._container.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #334; background-color: #e3eaf2;">
                <h2 style="color: #446;">The Seeker has Realized!</h2>
                <div style="font-size: 4em; margin: 20px 0;">☀️</div>
                <p>Having balanced all aspects of being, the Seeker embodies the Supramental Light.</p>
                <p>Final Score (avg energy): ${Math.floor(Object.values(this._seeker.energies).reduce((a,b)=>a+b,0) / 4)}</p>
            </div>`;
        
        this._sharedData.seekerSimScore = Math.floor(Object.values(this._seeker.energies).reduce((a,b)=>a+b,0) / 4);
        this._sharedData.lastJourneyOutcome = "Seeker Realized Supramental Light.";

        if (this._successCallback) {
            this._successCallback(this._sharedData);
        }
    },

    destroy: function() {
        console.log(`${this.id}: Destroying...`);
        if (this._gameLoopInterval) clearInterval(this._gameLoopInterval);
        if (this._eventTimeout) clearTimeout(this._eventTimeout);
        if (this._ui.actionsContainer) {
            this._ui.actionsContainer.querySelectorAll('button').forEach(btn => btn.onclick = null);
        }
        this._container.innerHTML = '';
        console.log(`${this.id}: Destroyed.`);
    }
};
