// js/magicMakerGame.js
const MagicMakerGame = {
    id: 'MagicMakerGame',
    container: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,

    config: {
        schoolsOfMagic: ['Arcane', 'Elemental', 'Divine', 'Nature', 'Shadow', 'Restoration', 'Destruction', 'Alteration', 'Illusion', 'Conjuration'],
        baseMPCostPerComplexity: 1, // MP cost will increase based on number and power of effects
        maxEffectsPerSpell: 5,
    },

    // --- AVAILABLE SPELL COMPONENTS ---
    available: {
        targetTypes: [
            { id: 'SELF', name: 'Self', description: "Affects the caster." },
            { id: 'SINGLE_ALLY', name: 'Single Ally', description: "Targets one friendly unit." },
            { id: 'SINGLE_ENEMY', name: 'Single Enemy', description: "Targets one hostile unit." },
            { id: 'ALL_ALLIES', name: 'All Allies', description: "Affects all friendly units." },
            { id: 'ALL_ENEMIES', name: 'All Enemies', description: "Affects all hostile units." },
            // { id: 'AREA_ALLY', name: 'Area (Allies)', description: "Affects allies in a targeted area." },
            // { id: 'AREA_ENEMY', name: 'Area (Enemies)', description: "Affects enemies in a targeted area." },
            // { id: 'AREA_ALL', name: 'Area (All)', description: "Affects everyone in a targeted area." },
        ],
        effectBases: [
            {
                id: 'HEAL', name: 'Heal',
                description: "Restores health points.",
                properties: [
                    { id: 'baseAmount', name: 'Base Heal', type: 'number', default: 10, min: 1, max: 500, costMultiplier: 0.3 },
                    { id: 'scalingStat', name: 'Scales With', type: 'select', options: ['NONE', 'INTELLIGENCE', 'FAITH', 'LEVEL'], default: 'NONE', costMultiplier: 0.1 },
                    { id: 'scaleFactor', name: 'Scale Factor (%)', type: 'number', default: 0, min: 0, max: 100, costMultiplier: 0.05, dependsOn: { property: 'scalingStat', notValue: 'NONE' } }
                ]
            },
            {
                id: 'DAMAGE', name: 'Damage',
                description: "Inflicts damage.",
                properties: [
                    { id: 'baseAmount', name: 'Base Damage', type: 'number', default: 10, min: 1, max: 500, costMultiplier: 0.35 },
                    { id: 'damageType', name: 'Damage Type', type: 'select', options: ['PHYSICAL', 'FIRE', 'ICE', 'LIGHTNING', 'POISON', 'ARCANE', 'HOLY', 'SHADOW'], default: 'PHYSICAL', costMultiplier: 0.05 },
                    { id: 'scalingStat', name: 'Scales With', type: 'select', options: ['NONE', 'STRENGTH', 'INTELLIGENCE', 'LEVEL'], default: 'NONE', costMultiplier: 0.1 },
                    { id: 'scaleFactor', name: 'Scale Factor (%)', type: 'number', default: 0, min: 0, max: 100, costMultiplier: 0.05, dependsOn: { property: 'scalingStat', notValue: 'NONE' } }
                ]
            },
            {
                id: 'BUFF_STAT', name: 'Buff Stat',
                description: "Temporarily enhances a target's statistic.",
                properties: [
                    { id: 'stat', name: 'Statistic', type: 'select', options: ['ATTACK', 'DEFENSE', 'SPEED', 'INTELLIGENCE', 'STRENGTH', 'ACCURACY', 'DODGE'], default: 'ATTACK', costMultiplier: 0.2 },
                    { id: 'modifierType', name: 'Modifier Type', type: 'select', options: ['FLAT', 'PERCENTAGE'], default: 'FLAT', costMultiplier: 0.05 },
                    { id: 'amount', name: 'Amount', type: 'number', default: 5, min: 1, max: 100, costMultiplier: 0.2 },
                    { id: 'duration', name: 'Duration (rounds)', type: 'number', default: 3, min: 1, max: 10, costMultiplier: 0.1 }
                ]
            },
            {
                id: 'DEBUFF_STAT', name: 'Debuff Stat',
                description: "Temporarily reduces a target's statistic.",
                properties: [
                    { id: 'stat', name: 'Statistic', type: 'select', options: ['ATTACK', 'DEFENSE', 'SPEED', 'INTELLIGENCE', 'STRENGTH', 'ACCURACY', 'DODGE'], default: 'ATTACK', costMultiplier: 0.25 },
                    { id: 'modifierType', name: 'Modifier Type', type: 'select', options: ['FLAT', 'PERCENTAGE'], default: 'FLAT', costMultiplier: 0.05 },
                    { id: 'amount', name: 'Amount', type: 'number', default: 5, min: 1, max: 100, costMultiplier: 0.25 },
                    { id: 'duration', name: 'Duration (rounds)', type: 'number', default: 3, min: 1, max: 10, costMultiplier: 0.15 }
                ]
            },
            // Future ideas: SUMMON, APPLY_STATUS_EFFECT (stun, silence), SHIELD, TELEPORT, etc.
        ]
    },

    localState: {
        currentSpell: null, // Object representing the spell being designed
        editingEffectIndex: -1, // -1 for new, or index for editing existing effect on currentSpell
        createdSpells: [],    // Array of fully designed spell objects
        ui: { // For managing which part of the UI is active
            showEffectModal: false,
        }
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        console.log("MagicMakerGame: Initializing. SharedData received:", JSON.parse(JSON.stringify(this.sharedData)));

        this.localState.createdSpells = (sharedData && sharedData.playerSpells) ? JSON.parse(JSON.stringify(sharedData.playerSpells)) : [];
        this.startNewSpell(); // Initialize with an empty spell
        this.render();
    },

    startNewSpell: function() {
        this.localState.currentSpell = {
            id: `spell_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Temporary ID, can be finalized on save
            name: 'New Spell',
            description: '',
            school: this.config.schoolsOfMagic[0],
            targetType: this.available.targetTypes[0].id,
            effects: [],
            mpCost: 0, // Will be calculated
            complexity: 0 // For cost calculation
        };
        this.calculateMpCost(); // Initial cost calculation
        console.log("MagicMakerGame: Started new spell template:", this.localState.currentSpell);
    },

    render: function() {
        if (!this.container) {
            console.error("MagicMakerGame: Container not set!");
            return;
        }
        this.container.innerHTML = ''; // Clear previous content

        const wrapper = document.createElement('div');
        wrapper.className = 'magic-maker-wrapper';

        wrapper.innerHTML = `
            <div class="spell-main-details">
                <h2>Spell Design Workbench</h2>
                <div>
                    <label for="spell-name">Spell Name:</label>
                    <input type="text" id="spell-name" value="${this.localState.currentSpell.name}">
                </div>
                <div>
                    <label for="spell-school">School of Magic:</label>
                    <select id="spell-school">
                        ${this.config.schoolsOfMagic.map(school => `<option value="${school}" ${this.localState.currentSpell.school === school ? 'selected' : ''}>${school}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="spell-target">Target Type:</label>
                    <select id="spell-target">
                        ${this.available.targetTypes.map(tt => `<option value="${tt.id}" ${this.localState.currentSpell.targetType === tt.id ? 'selected' : ''} title="${tt.description}">${tt.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="spell-description">Description:</label>
                    <textarea id="spell-description" rows="3">${this.localState.currentSpell.description}</textarea>
                </div>
                <p>Calculated MP Cost: <strong id="spell-mp-cost-display">${this.localState.currentSpell.mpCost}</strong></p>
            </div>

            <div class="spell-effects-section">
                <h3>Spell Effects (${this.localState.currentSpell.effects.length}/${this.config.maxEffectsPerSpell})</h3>
                <div id="current-spell-effects-list">
                    ${this.renderCurrentSpellEffects()}
                </div>
                ${this.localState.currentSpell.effects.length < this.config.maxEffectsPerSpell ?
                    `<button id="btn-show-add-effect-modal">Add New Effect</button>` :
                    `<p>Maximum effects reached.</p>`
                }
            </div>

            <div class="spell-actions">
                <button id="btn-save-spell-to-library">Save Spell to Library</button>
                <button id="btn-start-new-spell">Start New Blank Spell</button>
                <button id="btn-finish-making-spells">Done (Return)</button>
            </div>

            <div class="spell-library-section">
                <h3>Spell Library (${this.localState.createdSpells.length})</h3>
                <div id="created-spells-list">
                    ${this.renderSpellLibrary()}
                </div>
            </div>
        `;

        this.container.appendChild(wrapper);

        if (this.localState.ui.showEffectModal) {
            this.renderEffectModal();
        }

        this.attachEventListeners();
    },

    renderCurrentSpellEffects: function() {
        if (!this.localState.currentSpell || this.localState.currentSpell.effects.length === 0) {
            return '<p>No effects added yet.</p>';
        }
        return this.localState.currentSpell.effects.map((effect, index) => {
            const effectBase = this.available.effectBases.find(eb => eb.id === effect.effectBaseId);
            let propertiesString = '<ul>';
            for (const propKey in effect.properties) {
                const propDef = effectBase.properties.find(p => p.id === propKey);
                propertiesString += `<li><strong>${propDef ? propDef.name : propKey}</strong>: ${effect.properties[propKey]}</li>`;
            }
            propertiesString += '</ul>';

            return `
                <div class="spell-effect-item" data-index="${index}">
                    <h4>${effectBase ? effectBase.name : 'Unknown Effect'}</h4>
                    ${propertiesString}
                    <button class="btn-edit-effect">Edit</button>
                    <button class="btn-remove-effect">Remove</button>
                </div>
            `;
        }).join('');
    },

    renderSpellLibrary: function() {
        if (this.localState.createdSpells.length === 0) {
            return '<p>Your spell library is empty.</p>';
        }
        return this.localState.createdSpells.map(spell => `
            <div class="library-spell-item" data-spell-id="${spell.id}">
                <strong>${spell.name}</strong> (MP: ${spell.mpCost}, Target: ${this.available.targetTypes.find(t=>t.id === spell.targetType)?.name || 'N/A'})
                <p>${spell.description || 'No description.'}</p>
                <p><em>Effects: ${spell.effects.map(e => this.available.effectBases.find(eb => eb.id === e.effectBaseId)?.name || e.effectBaseId).join(', ')}</em></p>
                <button class="btn-edit-library-spell">Edit</button>
                <button class="btn-delete-library-spell">Delete</button>
            </div>
        `).join('');
    },

    renderEffectModal: function() {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'effect-modal-overlay';
        let formHtml = `<h3>${this.localState.editingEffectIndex === -1 ? 'Add New' : 'Edit'} Spell Effect</h3>`;

        const currentEffectData = this.localState.editingEffectIndex === -1 ?
            null : this.localState.currentSpell.effects[this.localState.editingEffectIndex];
        const selectedBaseId = currentEffectData ? currentEffectData.effectBaseId : (this.available.effectBases[0]?.id || '');

        formHtml += `
            <div>
                <label for="effect-base-type">Effect Type:</label>
                <select id="effect-base-type">
                    ${this.available.effectBases.map(eb => `<option value="${eb.id}" ${selectedBaseId === eb.id ? 'selected' : ''}>${eb.name} - ${eb.description}</option>`).join('')}
                </select>
            </div>
            <div id="effect-properties-form">
                ${this.renderEffectPropertiesForm(selectedBaseId, currentEffectData ? currentEffectData.properties : null)}
            </div>
            <button id="btn-save-current-effect">Save Effect</button>
            <button id="btn-cancel-effect-modal">Cancel</button>
        `;

        modalDiv.innerHTML = `<div class="effect-modal-content">${formHtml}</div>`;
        this.container.appendChild(modalDiv);

        // Attach listener for base type change within the modal
        modalDiv.querySelector('#effect-base-type').addEventListener('change', (event) => {
            const newBaseId = event.target.value;
            // When base type changes, re-render the properties form for that type
            document.getElementById('effect-properties-form').innerHTML = this.renderEffectPropertiesForm(newBaseId, null);
        });
    },

    renderEffectPropertiesForm: function(effectBaseId, currentValues) {
        const effectBase = this.available.effectBases.find(eb => eb.id === effectBaseId);
        if (!effectBase) return '<p>Select an effect type.</p>';

        let propertiesHtml = '';
        effectBase.properties.forEach(prop => {
            const currentValue = currentValues ? currentValues[prop.id] : prop.default;
            let inputHtml = '';
            const isDependent = prop.dependsOn;
            let hidden = false;

            if (isDependent) {
                // Basic dependency check: Assumes dependency is on another property of the *same effect*
                // For complex cross-effect dependencies, a more robust system is needed.
                const dependentOnPropId = prop.dependsOn.property;
                const dependentOnPropValue = currentValues ? currentValues[dependentOnPropId] : (effectBase.properties.find(p => p.id === dependentOnPropId)?.default);

                if (prop.dependsOn.value && dependentOnPropValue !== prop.dependsOn.value) hidden = true;
                if (prop.dependsOn.notValue && dependentOnPropValue === prop.dependsOn.notValue) hidden = true;
            }

            if (hidden) {
                inputHtml = `<input type="hidden" id="prop-${prop.id}" value="${currentValue}">`; // Still include hidden for data persistence
            } else {
                propertiesHtml += `<div><label for="prop-${prop.id}">${prop.name}:</label>`;
                switch (prop.type) {
                    case 'number':
                        inputHtml = `<input type="number" id="prop-${prop.id}" value="${currentValue}" ${prop.min !== undefined ? `min="${prop.min}"` : ''} ${prop.max !== undefined ? `max="${prop.max}"` : ''}>`;
                        break;
                    case 'select':
                        inputHtml = `<select id="prop-${prop.id}">`;
                        prop.options.forEach(opt => {
                            inputHtml += `<option value="${opt}" ${currentValue === opt ? 'selected' : ''}>${opt}</option>`;
                        });
                        inputHtml += `</select>`;
                        break;
                    case 'text':
                        inputHtml = `<input type="text" id="prop-${prop.id}" value="${currentValue}">`;
                        break;
                    default:
                        inputHtml = `<span>Unsupported property type: ${prop.type}</span>`;
                }
                propertiesHtml += inputHtml + '</div>';
            }
        });
        return propertiesHtml;
    },

    attachEventListeners: function() {
        document.getElementById('spell-name').addEventListener('input', (e) => { this.localState.currentSpell.name = e.target.value; });
        document.getElementById('spell-school').addEventListener('change', (e) => { this.localState.currentSpell.school = e.target.value; });
        document.getElementById('spell-target').addEventListener('change', (e) => { this.localState.currentSpell.targetType = e.target.value; });
        document.getElementById('spell-description').addEventListener('input', (e) => { this.localState.currentSpell.description = e.target.value; });

        const addEffectBtn = document.getElementById('btn-show-add-effect-modal');
        if (addEffectBtn) addEffectBtn.addEventListener('click', () => this.openEffectModal(-1));

        document.getElementById('btn-save-spell-to-library').addEventListener('click', () => this.saveCurrentSpellToLibrary());
        document.getElementById('btn-start-new-spell').addEventListener('click', () => { this.startNewSpell(); this.render(); });
        document.getElementById('btn-finish-making-spells').addEventListener('click', () => this.finishCreation());

        // Event delegation for dynamically added elements
        this.container.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-edit-effect')) {
                const index = parseInt(event.target.closest('.spell-effect-item').dataset.index);
                this.openEffectModal(index);
            }
            if (event.target.classList.contains('btn-remove-effect')) {
                const index = parseInt(event.target.closest('.spell-effect-item').dataset.index);
                this.removeEffectFromCurrentSpell(index);
            }
            if (event.target.id === 'btn-save-current-effect' && this.localState.ui.showEffectModal) {
                this.saveCurrentEffectToSpell();
            }
            if (event.target.id === 'btn-cancel-effect-modal' && this.localState.ui.showEffectModal) {
                this.closeEffectModal();
            }
            if (event.target.classList.contains('btn-edit-library-spell')) {
                const spellId = event.target.closest('.library-spell-item').dataset.spellId;
                this.loadSpellFromLibraryForEditing(spellId);
            }
            if (event.target.classList.contains('btn-delete-library-spell')) {
                const spellId = event.target.closest('.library-spell-item').dataset.spellId;
                this.deleteSpellFromLibrary(spellId);
            }
        });
    },

    openEffectModal: function(index) { // index = -1 for new, otherwise it's the effect index
        this.localState.editingEffectIndex = index;
        this.localState.ui.showEffectModal = true;
        this.render(); // Re-render to show modal
    },

    closeEffectModal: function() {
        this.localState.ui.showEffectModal = false;
        this.localState.editingEffectIndex = -1;
        this.render(); // Re-render to hide modal
    },

    saveCurrentEffectToSpell: function() {
        const effectBaseId = document.getElementById('effect-base-type').value;
        const effectBase = this.available.effectBases.find(eb => eb.id === effectBaseId);
        if (!effectBase) {
            alert("Invalid effect type selected.");
            return;
        }

        const newEffect = {
            effectBaseId: effectBaseId,
            properties: {}
        };

        let effectComplexity = 0.5; // Base complexity for adding an effect

        effectBase.properties.forEach(prop => {
            const inputElement = document.getElementById(`prop-${prop.id}`);
            if (inputElement) {
                let value = inputElement.value;
                if (prop.type === 'number') value = parseFloat(value) || prop.default;
                newEffect.properties[prop.id] = value;

                // Add to complexity for cost calculation
                if (prop.costMultiplier) {
                    if (typeof value === 'number' && value !== prop.default) {
                        effectComplexity += Math.abs(value - prop.default) * prop.costMultiplier * 0.1; // Factor in how much it deviates
                    } else if (typeof value === 'string' && value !== prop.default) {
                        effectComplexity += prop.costMultiplier;
                    }
                }
            }
        });

        newEffect.complexity = effectComplexity; // Store complexity of this specific effect

        if (this.localState.editingEffectIndex === -1) { // Adding new effect
            if (this.localState.currentSpell.effects.length < this.config.maxEffectsPerSpell) {
                this.localState.currentSpell.effects.push(newEffect);
            } else {
                alert("Cannot add more effects to this spell.");
                this.closeEffectModal();
                return;
            }
        } else { // Editing existing effect
            this.localState.currentSpell.effects[this.localState.editingEffectIndex] = newEffect;
        }
        this.calculateMpCost();
        this.closeEffectModal(); // This will call render
    },

    removeEffectFromCurrentSpell: function(index) {
        if (index >= 0 && index < this.localState.currentSpell.effects.length) {
            this.localState.currentSpell.effects.splice(index, 1);
            this.calculateMpCost();
            this.render();
        }
    },

    calculateMpCost: function() {
        let totalComplexity = 0.5; // Base complexity for just having a spell
        this.localState.currentSpell.effects.forEach(effect => {
            totalComplexity += effect.complexity || 0.5; // Use stored effect complexity or a default
        });
        this.localState.currentSpell.complexity = totalComplexity;
        this.localState.currentSpell.mpCost = Math.max(1, Math.round(totalComplexity * this.config.baseMPCostPerComplexity));
        if(document.getElementById('spell-mp-cost-display')) { // Update display if rendered
            document.getElementById('spell-mp-cost-display').textContent = this.localState.currentSpell.mpCost;
        }
    },

    saveCurrentSpellToLibrary: function() {
        if (!this.localState.currentSpell.name || this.localState.currentSpell.name.trim() === "") {
            alert("Please give your spell a name.");
            return;
        }
        if (this.localState.currentSpell.effects.length === 0) {
            alert("A spell must have at least one effect.");
            return;
        }

        // Finalize ID if it was temporary or ensure it's unique if editing
        const existingSpellIndex = this.localState.createdSpells.findIndex(s => s.id === this.localState.currentSpell.id);
        if (existingSpellIndex !== -1) { // Editing an existing spell from library
            this.localState.createdSpells[existingSpellIndex] = JSON.parse(JSON.stringify(this.localState.currentSpell));
        } else { // Saving a new spell
            const newSpell = JSON.parse(JSON.stringify(this.localState.currentSpell));
            newSpell.id = `spell_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; // Ensure unique ID for truly new
            this.localState.createdSpells.push(newSpell);
        }

        console.log("MagicMakerGame: Saved spell to library. Current library:", this.localState.createdSpells);
        this.startNewSpell(); // Prepare for the next spell
        this.render();
    },

    loadSpellFromLibraryForEditing: function(spellId) {
        const spellToEdit = this.localState.createdSpells.find(s => s.id === spellId);
        if (spellToEdit) {
            this.localState.currentSpell = JSON.parse(JSON.stringify(spellToEdit)); // Deep copy for editing
            this.calculateMpCost(); // Recalculate in case config changed or for consistency
            this.render();
        } else {
            console.warn("MagicMakerGame: Could not find spell with ID to edit:", spellId);
        }
    },

    deleteSpellFromLibrary: function(spellId) {
        const spellIndex = this.localState.createdSpells.findIndex(s => s.id === spellId);
        if (spellIndex !== -1) {
            this.localState.createdSpells.splice(spellIndex, 1);
            // If the deleted spell was the one currently being edited, start a new blank spell
            if (this.localState.currentSpell && this.localState.currentSpell.id === spellId) {
                this.startNewSpell();
            }
            this.render();
        } else {
            console.warn("MagicMakerGame: Could not find spell with ID to delete:", spellId);
        }
    },

    finishCreation: function() {
        console.log("MagicMakerGame: Finishing spell creation. Spells to pass back:", this.localState.createdSpells);
        if (this.successCallback) {
            // We should update the sharedData directly here before calling back,
            // or ensure the successCallback's data is merged correctly by the GameManager
            const dataToPass = {
                // ...any other data MagicMakerGame might want to pass back...
                playerSpells: JSON.parse(JSON.stringify(this.localState.createdSpells)) // Pass a clean copy
            };
            this.successCallback(dataToPass);
        } else {
            console.warn("MagicMakerGame: No successCallback defined.");
        }
    },

    destroy: function() {
        console.log('MagicMakerGame: Destroying.');
        if (this.container) {
            this.container.innerHTML = '';
        }
        // Potentially remove global event listeners if any were added to document/window
        this.localState.currentSpell = null;
        this.localState.createdSpells = [];
    },

    // --- STYLES (can be moved to a CSS file and linked) ---
    applyStyles: function() { // Call this in init if you manage styles this way
        const styleId = 'magicMakerGameStyles';
        if (document.getElementById(styleId)) return;

        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = `
            .magic-maker-wrapper { display: flex; flex-direction: column; gap: 20px; padding: 15px; font-family: Arial, sans-serif; max-width: 900px; margin: auto; background: #f0f0f0; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
            .spell-main-details, .spell-effects-section, .spell-actions, .spell-library-section { border: 1px solid #ccc; padding: 15px; border-radius: 5px; background: #fff; }
            .spell-main-details div, .effect-modal-content div { margin-bottom: 10px; }
            .spell-main-details label, .effect-modal-content label { display: inline-block; width: 120px; font-weight: bold; }
            .spell-main-details input[type="text"], .spell-main-details select, .spell-main-details textarea,
            .effect-modal-content input[type="text"], .effect-modal-content select, .effect-modal-content input[type="number"] {
                width: calc(100% - 130px); padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;
            }
            .spell-main-details textarea { resize: vertical; }
            #spell-mp-cost-display { color: #007bff; font-size: 1.1em; }
            .spell-effect-item, .library-spell-item { border: 1px dashed #eee; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: #f9f9f9; }
            .spell-effect-item h4, .library-spell-item strong { color: #333; }
            .spell-effect-item ul { padding-left: 20px; margin-top: 5px; font-size: 0.9em; }
            .spell-actions button, .spell-effect-item button, .library-spell-item button, .effect-modal-content button {
                padding: 8px 15px; margin-right: 10px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;
            }
            #btn-show-add-effect-modal, #btn-save-spell-to-library, #btn-finish-making-spells, #btn-save-current-effect { background-color: #28a745; color: white; }
            #btn-start-new-spell, #btn-cancel-effect-modal { background-color: #ffc107; color: #212529; }
            .btn-remove-effect, .btn-delete-library-spell { background-color: #dc3545; color: white; }
            .btn-edit-effect, .btn-edit-library-spell { background-color: #17a2b8; color: white; }

            .effect-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
            .effect-modal-content { background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.2); width: 90%; max-width: 600px; }
            #effect-properties-form { max-height: 300px; overflow-y: auto; padding: 10px; border: 1px solid #eee; margin-top:10px; margin-bottom:10px; }
        `;
        document.head.appendChild(styleElement);
    }
};

// Make it available globally for now, as per existing pattern.
// In a module system, you'd use export.
if (typeof window !== 'undefined') {
    window.MagicMakerGame = MagicMakerGame;
}
