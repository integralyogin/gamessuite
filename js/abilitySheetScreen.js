// js/abilitySheetScreen.js
const AbilitySheetScreen = {
    id: 'AbilitySheetScreen',
    
    availableAbilityBranches: {
        melee: {
            id: 'melee', name: 'Melee Combat', icon: '⚔️', baseUnlockCost: 1,
            upgrades: {
                damage: { id: 'meleeDamage', name: 'Melee Damage', description: 'Increases damage of auto-melee attacks.', maxLevel: 5, costPerLevel: [1, 1, 2, 2, 3] },
                speed: { id: 'meleeSpeed', name: 'Melee Attack Speed', description: 'Increases the speed (reduces cooldown) of auto-melee attacks.', maxLevel: 10, costPerLevel: [1, 1,1,1,1,1,1,1,1,1] },
                range: { id: 'meleeRange', name: 'Melee Attack Range', description: 'Increases the range of auto-melee attacks.', maxLevel: 10, costPerLevel: [1, 1, 1,1,1,1,1,1,1,1] }
            }
        },
        range: {
            id: 'range', name: 'Ranged Combat', icon: '🏹', baseUnlockCost: 1,
            upgrades: {
                damage: { id: 'rangeDamage', name: 'Ranged Damage', description: 'Increases damage of auto-ranged attacks.', maxLevel: 5, costPerLevel: [1, 1, 2, 2, 3] },
                speed: { id: 'rangeSpeed', name: 'Ranged Attack Speed', description: 'Increases the speed (reduces cooldown) of auto-ranged attacks.', maxLevel: 10, costPerLevel: [1, 1,1,1,1,1,1,1,1,1] },
                range: { id: 'rangeRange', name: 'Ranged Attack Range', description: 'Increases the range of auto-ranged attacks.', maxLevel: 10, costPerLevel: [1, 1, 1,1,1,1,1,1,1,1] },
                piercing: { id: 'rangePiercing', name: 'Piercing Shot', description: 'Allows ranged attacks to hit additional targets.', maxLevel: 3, costPerLevel: [2, 2, 3] }
            }
        },
        magic: { 
            id: 'magic', name: 'Magic Spells (Summon Orb)', icon: '✨', baseUnlockCost: 2,
            upgrades: { 
                orbStrength: { id: 'magicOrbStrength', name: 'Orb Potency', description: 'Increases the damage of each summoned orb.', maxLevel: 5, costPerLevel: [1, 1, 2, 2, 3] },
                orbSpeed: { id: 'magicOrbSpeed', name: 'Orb Attack Speed', description: 'Increases how frequently each orb attacks.', maxLevel: 10, costPerLevel: [1, 1,1,1,1,1,1,1,1,1] },
                orbRange: { id: 'magicOrbRange', name: 'Orb Attack Range', description: 'Increases the attack range of each orb.', maxLevel: 10, costPerLevel: [1, 1, 1,1,1,1,1,1,1,1] },
                orbCount: { id: 'magicOrbCount', name: 'Additional Orbs', description: 'Summons an additional orb to fight alongside you.', maxLevel: 10, costPerLevel: [3, 4, 5, 6, 7,7,7,7,7,7] }
            }
        }
    },

    sharedDataRef: null,
    zoomLevel: 1.0, minZoom: 0.3, maxZoom: 2.5,
    panX: 0, panY: 0,
    isPanning: false, lastPanMouseX: 0, lastPanMouseY: 0,
    pannableContentElement: null, modalViewportElement: null,

    setupModalStructure: function(sheetContainer, closeCallback) {
        sheetContainer.innerHTML = `
            <div id="abilitySheetModal" class="sheet-modal">
                <div class="sheet-modal-header"><h2>Ability Sheet</h2></div>
                <div class="sheet-modal-controls">
                    <button id="zoomInBtnAS">Zoom In (+)</button>
                    <button id="zoomOutBtnAS">Zoom Out (-)</button>
                    <button id="resetViewBtnAS">Reset View</button>
                    <span style="margin-left: 10px;">Points: <strong id="abilityPointsDisplayModal">0</strong></span>
                </div>
                <div class="sheet-modal-content-area">
                    <div id="abilitySheetPannableContent"></div>
                </div>
                <div class="sheet-modal-footer">
                    <button id="closeAbilitySheetBtn" class="sheet-close-btn">Close (A or Esc)</button>
                </div>
            </div>
        `;
        
        this.pannableContentElement = document.getElementById('abilitySheetPannableContent');
        this.modalViewportElement = document.querySelector('#abilitySheetModal .sheet-modal-content-area');

        document.getElementById('closeAbilitySheetBtn').onclick = closeCallback;
        document.getElementById('zoomInBtnAS').onclick = () => this.zoom(1.2);
        document.getElementById('zoomOutBtnAS').onclick = () => this.zoom(1 / 1.2);
        document.getElementById('resetViewBtnAS').onclick = () => this.resetView();
        
        this.initPanZoom();
    },

    renderAbilityList: function() {
        if (!this.sharedDataRef || !this.pannableContentElement) return;

        const apDisplay = document.getElementById('abilityPointsDisplayModal');
        if(apDisplay) apDisplay.textContent = this.sharedDataRef.playerAbilityPoints || 0;

        if (!this.sharedDataRef.abilityLevels) {
            this.sharedDataRef.abilityLevels = {};
        }
        
        for (const branchKey in this.availableAbilityBranches) {
            const branchDefinition = this.availableAbilityBranches[branchKey];
            if (!this.sharedDataRef.abilityLevels[branchKey]) {
                 this.sharedDataRef.abilityLevels[branchKey] = { unlocked: false };
            }
            for (const upgradeKey in branchDefinition.upgrades) {
                const upgradeDefinition = branchDefinition.upgrades[upgradeKey];
                const levelStorageKey = upgradeDefinition.id + 'Level'; // CORRECT KEY (e.g., magicOrbCountLevel)
                if (this.sharedDataRef.abilityLevels[branchKey][levelStorageKey] === undefined) {
                    this.sharedDataRef.abilityLevels[branchKey][levelStorageKey] = 0;
                }
            }
        }
        
        let abilitiesHTML = "";
        for (const branchKey in this.availableAbilityBranches) {
            const branch = this.availableAbilityBranches[branchKey];
            const playerBranchLevels = this.sharedDataRef.abilityLevels[branchKey]; 

            abilitiesHTML += `<div class="ability-branch"><h3>${branch.icon} ${branch.name}</h3>`;
            if (!playerBranchLevels.unlocked) {
                const canUnlock = (this.sharedDataRef.playerAbilityPoints || 0) >= branch.baseUnlockCost;
                let unlockText = `Unlock ${branch.name}`;
                if (branchKey === 'magic') unlockText = `Unlock Magic (Summon First Orb)`; 

                abilitiesHTML += `<p>${branch.name} features are currently locked.</p>
                                  <button class="unlock-branch-btn" data-branch-id="${branch.id}" ${canUnlock ? '' : 'disabled'}>
                                    ${unlockText} (Cost: ${branch.baseUnlockCost} AP)
                                  </button>`;
            } else {
                let branchStatusText = `${branch.name} Unlocked!`;
                if (branchKey === 'magic') branchStatusText = `Magic Unlocked (Orb Active)!`;
                abilitiesHTML += `<p style="color: green; font-weight: bold;">${branchStatusText}</p>
                                  <ul style='list-style: none; padding-left: 15px;'>`;
                
                if (Object.keys(branch.upgrades).length === 0 && branchKey === 'magic') {
                     abilitiesHTML += `<li><em>Further orb enhancements will appear here.</em></li>`;
                }

                for (const upgradeKey in branch.upgrades) { // upgradeKey is 'orbStrength', 'orbCount', etc.
                    const upgrade = branch.upgrades[upgradeKey];
                    const levelStorageKey = upgrade.id + 'Level'; // CORRECT KEY (e.g., magicOrbStrengthLevel)
                    const currentLevel = playerBranchLevels[levelStorageKey] || 0;

                    abilitiesHTML += `<li><strong>${upgrade.name}</strong> (Lvl ${currentLevel}/${upgrade.maxLevel})
                                    <p>${upgrade.description}</p>`;
                    if (currentLevel < upgrade.maxLevel) {
                        const costForNextLevel = upgrade.costPerLevel[currentLevel];
                        const canUpgrade = (this.sharedDataRef.playerAbilityPoints || 0) >= costForNextLevel;
                        // Pass upgradeKey ('orbStrength', 'orbCount') to identify which definition to use
                        abilitiesHTML += `<button class="upgrade-ability-btn" data-branch-id="${branch.id}" data-upgrade-key="${upgradeKey}" ${canUpgrade ? '' : 'disabled'}>
                                            Upgrade (Cost: ${costForNextLevel} AP)
                                          </button>`;
                    } else {
                        abilitiesHTML += `<strong style="color: #00796b;">Max Level!</strong>`;
                    }
                    abilitiesHTML += `</li>`;
                }
                abilitiesHTML += `</ul>`;
            }
            abilitiesHTML += `</div>`;
        }
        this.pannableContentElement.innerHTML = abilitiesHTML;
        this.attachAbilityActionListeners();
    },
    
    attachAbilityActionListeners: function() { 
        if(!this.pannableContentElement)return;
        this.pannableContentElement.querySelectorAll('.unlock-branch-btn').forEach(b=>{b.onclick=e=>{const id=e.target.dataset.branchId;this.tryUnlockBranch(id);};});
        this.pannableContentElement.querySelectorAll('.upgrade-ability-btn').forEach(b=>{b.onclick=e=>{const bId=e.target.dataset.branchId;const uKey=e.target.dataset.upgradeKey;this.tryUpgradeAbility(bId,uKey);};});
    },
    initPanZoom: function() { if(!this.pannableContentElement||!this.modalViewportElement)return;this.pannableContentElement.addEventListener('mousedown',this.handleMouseDown.bind(this));document.addEventListener('mousemove',this.handleMouseMove.bind(this));document.addEventListener('mouseup',this.handleMouseUp.bind(this));this.modalViewportElement.addEventListener('wheel',this.handleWheel.bind(this),{passive:false});this.applyTransform(); },
    handleMouseDown: function(event) { if(event.button!==0||!this.pannableContentElement.contains(event.target)||event.target.tagName==='BUTTON')return;event.preventDefault();this.isPanning=true;this.lastPanMouseX=event.clientX;this.lastPanMouseY=event.clientY;this.pannableContentElement.classList.add('grabbing'); },
    handleMouseMove: function(event) { if(!this.isPanning)return;event.preventDefault();const dX=event.clientX-this.lastPanMouseX;const dY=event.clientY-this.lastPanMouseY;this.panX+=dX;this.panY+=dY;this.lastPanMouseX=event.clientX;this.lastPanMouseY=event.clientY;this.applyTransform(); },
    handleMouseUp: function(event) { if(!this.isPanning)return;event.preventDefault();this.isPanning=false;this.pannableContentElement.classList.remove('grabbing'); },
    handleWheel: function(event) { if(!this.modalViewportElement.contains(event.target)&&event.target!==this.modalViewportElement)return;event.preventDefault();const r=this.modalViewportElement.getBoundingClientRect();const mX=event.clientX-r.left;const mY=event.clientY-r.top;const mXiC=(mX-this.panX)/this.zoomLevel;const mYiC=(mY-this.panY)/this.zoomLevel;const dS=event.deltaY<0?1.1:1/1.1;this.zoomLevel=Math.max(this.minZoom,Math.min(this.maxZoom,this.zoomLevel*dS));this.panX=mX-(mXiC*this.zoomLevel);this.panY=mY-(mYiC*this.zoomLevel);this.applyTransform(); },
    zoom: function(factor) { if(!this.modalViewportElement)return;const r=this.modalViewportElement.getBoundingClientRect();const cX=r.width/2;const cY=r.height/2;const cXiC=(cX-this.panX)/this.zoomLevel;const cYiC=(cY-this.panY)/this.zoomLevel;this.zoomLevel=Math.max(this.minZoom,Math.min(this.maxZoom,this.zoomLevel*factor));this.panX=cX-(cXiC*this.zoomLevel);this.panY=cY-(cYiC*this.zoomLevel);this.applyTransform(); },
    resetView: function() { this.zoomLevel=1.0;this.panX=0;this.panY=0;this.applyTransform(); },
    applyTransform: function() { if(this.pannableContentElement)this.pannableContentElement.style.transform=`translate(${this.panX}px,${this.panY}px) scale(${this.zoomLevel})`; },
    
    tryUnlockBranch: function(branchId) { 
        if(!this.sharedDataRef)return;const b=this.availableAbilityBranches[branchId];if(!b)return;
        if((this.sharedDataRef.playerAbilityPoints||0)>=b.baseUnlockCost){this.sharedDataRef.playerAbilityPoints-=b.baseUnlockCost;this.sharedDataRef.abilityLevels[branchId].unlocked=true;console.log(`Unlocked '${b.name}'. AP:${this.sharedDataRef.playerAbilityPoints}`);this.renderAbilityList();}
    },
    tryUpgradeAbility: function(branchId, upgradeKey) { // upgradeKey is 'orbStrength', 'orbCount', etc.
        if(!this.sharedDataRef)return;
        const branch = this.availableAbilityBranches[branchId];
        if (!branch || !branch.upgrades[upgradeKey]) {
            console.error(`Upgrade definition not found for ${branchId} -> ${upgradeKey}`);
            return;
        }
        const upgrade = branch.upgrades[upgradeKey]; // upgrade.id is 'magicOrbStrength', 'magicOrbCount'
        const playerBranchLevels = this.sharedDataRef.abilityLevels[branchId];
        const levelStorageKey = upgrade.id + 'Level'; // CORRECT KEY e.g., 'magicOrbCountLevel'
        
        const currentLevel = playerBranchLevels[levelStorageKey] || 0;
        
        if(currentLevel < upgrade.maxLevel){
            const cost=upgrade.costPerLevel[currentLevel];
            if((this.sharedDataRef.playerAbilityPoints||0)>=cost){
                this.sharedDataRef.playerAbilityPoints-=cost;
                playerBranchLevels[levelStorageKey]=currentLevel+1; // Use the correct storage key
                console.log(`Upgraded '${upgrade.name}' to Lvl ${currentLevel+1}. Stored in ${levelStorageKey}. AP:${this.sharedDataRef.playerAbilityPoints}`);
                this.renderAbilityList();
            }
        }
    },
    onOpen: function(sharedData, sheetContainer, closeCallback) { console.log("AbilitySheet: Opening...");this.sharedDataRef=sharedData;this.setupModalStructure(sheetContainer,closeCallback);this.renderAbilityList();this.resetView(); },
    onClose: function() { console.log("AbilitySheet: Closed. AP:",this.sharedDataRef?this.sharedDataRef.playerAbilityPoints:'N/A', "Levels:", this.sharedDataRef ? this.sharedDataRef.abilityLevels : 'N/A');document.removeEventListener('mousemove',this.handleMouseMove.bind(this));document.removeEventListener('mouseup',this.handleMouseUp.bind(this));this.pannableContentElement=null;this.modalViewportElement=null;this.sharedDataRef=null;}
};

