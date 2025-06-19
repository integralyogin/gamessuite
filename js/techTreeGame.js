// js/techTreeGame.js
const TechTreeGame = {
    id: 'TechTreeGame',
    gameContainer: null,
    canvas: null,
    ctx: null,
    onSuccess: null,
    localSharedData: null,

    // --- Viewport State ---
    offsetX: 0,
    offsetY: 0,
    scale: 0.7, // Initial zoom level
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,

    // --- Node Style and Layout ---
    nodeWidth: 180,
    nodeHeight: 80,
    nodePadding: 20, // For text inside node
    nodeColor: '#607D8B',
    nodeUnlockedColor: '#4CAF50',
    nodeCanUnlockColor: '#FFC107',
    lineColor: '#9E9E9E',

    // --- Tech Tree Data (Example - needs to be well-designed) ---
    // Nodes should have id, name, description, cost, effect, x, y, prerequisites, statName/abilityName
    techNodesData: {
        // Column 1: Base improvements
        'core_health_1': { id: 'core_health_1', name: "Vitality I", x: 100, y: 150, cost: 50, statName: 'maxHealth', effect: 20, description: "+20 Max HP", prerequisites: [], currentLevelKey: 'tech_core_health_1_lvl', maxLevel: 1 },
        'core_damage_1': { id: 'core_damage_1', name: "Strength I", x: 100, y: 300, cost: 70, statName: 'attack', effect: 5, description: "+5 Damage", prerequisites: [], currentLevelKey: 'tech_core_damage_1_lvl', maxLevel: 1 },
        'core_speed_1': { id: 'core_speed_1', name: "Agility I", x: 100, y: 450, cost: 60, statName: 'attackSpeed', effect: 0.1, description: "+0.1 APS", prerequisites: [], currentLevelKey: 'tech_core_speed_1_lvl', maxLevel: 1 },

        // Column 2: Advanced improvements
        'adv_health_2': { id: 'adv_health_2', name: "Vitality II", x: 400, y: 150, cost: 120, statName: 'maxHealth', effect: 30, description: "+30 Max HP", prerequisites: ['core_health_1'], currentLevelKey: 'tech_adv_health_2_lvl', maxLevel: 1 },
        'piercing_shot': { id: 'piercing_shot', name: "Piercing Shot", x: 400, y: 300, cost: 250, isAbility: true, abilityName: 'piercingShot', description: "Shots pierce 1 foe", prerequisites: ['core_damage_1'] },
        'adv_speed_2': { id: 'adv_speed_2', name: "Agility II", x: 400, y: 450, cost: 130, statName: 'attackSpeed', effect: 0.15, description: "+0.15 APS", prerequisites: ['core_speed_1'], currentLevelKey: 'tech_adv_speed_2_lvl', maxLevel: 1 },

        // Column 3: Specialist
        'multi_shot': { id: 'multi_shot', name: "Multi-Shot", x: 700, y: 300, cost: 400, isAbility: true, abilityName: 'multiShot', description: "Fire 2 projectiles", prerequisites: ['piercing_shot', 'adv_speed_2'] },
        'ultimate_health': {id: 'ultimate_health', name: "Fortitude", x: 700, y: 150, cost: 300, statName: 'maxHealth', effect: 50, description: "+50 Max HP", prerequisites: ['adv_health_2'], currentLevelKey: 'tech_ultimate_health_lvl', maxLevel: 1}
    },

    selectedNodeId: null, // For showing details of a clicked node

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.onSuccess = successCallback;
        this.localSharedData = JSON.parse(JSON.stringify(sharedData));

        // Initialize playerStats, techTreeLevels, totalCoins if they don't exist
        if (!this.localSharedData.playerStats) {
            this.localSharedData.playerStats = { attack: 10, attackSpeed: 1, projectileRange: 150, maxHealth: 100, speed: 3, projectileSpeed: 7, abilities: {} };
        }
        if (!this.localSharedData.techTreeLevels) this.localSharedData.techTreeLevels = {};
        if (!this.localSharedData.playerStats.abilities) this.localSharedData.playerStats.abilities = {};
        if (typeof this.localSharedData.totalCoins !== 'number') this.localSharedData.totalCoins = 0;

        this.offsetX = (this.gameContainer.clientWidth / 2) / this.scale - 250; // Center roughly
        this.offsetY = (this.gameContainer.clientHeight / 2) / this.scale - 300;


        this.setupCanvas();
        this.addEventListeners();
        this.draw(); // Initial draw

        console.log(`${this.id}: Initialized with canvas. Current coins: ${this.localSharedData.totalCoins}`);
    },

    setupCanvas: function() {
        this.gameContainer.innerHTML = `
            <style>
                #${this.id}-canvas-container { position: relative; width: 100%; height: 500px; background: #e0e0e0; overflow: hidden; border: 1px solid #ccc;}
                #${this.id}-canvas { display: block; }
                #${this.id}-ui-overlay { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; justify-content: space-between; background: rgba(0,0,0,0.5); color: white; padding: 10px; border-radius: 5px; z-index: 10;}
                #${this.id}-ui-overlay span { font-size: 1.1em; }
                #${this.id}-done-button { padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer; }
                #${this.id}-node-tooltip {
                    position: absolute; background: rgba(255, 255, 255, 0.95); border: 1px solid #333; border-radius: 5px;
                    padding: 10px; z-index: 20; pointer-events: none; /* Initially hidden */ display: none;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2); font-size: 0.9em; max-width: 250px;
                }
            </style>
            <div id="${this.id}-ui-overlay">
                <span id="${this.id}-coins-display">Coins: ${this.localSharedData.totalCoins}</span>
                <button id="${this.id}-done-button">Done & Continue</button>
            </div>
            <div id="${this.id}-canvas-container">
                <canvas id="${this.id}-canvas"></canvas>
            </div>
            <div id="${this.id}-node-tooltip"></div>
        `;
        this.canvas = document.getElementById(`${this.id}-canvas`);
        this.canvasContainer = document.getElementById(`${this.id}-canvas-container`);
        this.ctx = this.canvas.getContext('2d');

        // Resize canvas to fit container
        this.canvas.width = this.canvasContainer.clientWidth;
        this.canvas.height = this.canvasContainer.clientHeight;

        document.getElementById(`${this.id}-done-button`).addEventListener('click', () => this.finish());
    },

    addEventListeners: function() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this)); // Stop dragging if mouse leaves
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
    },

    // --- Interaction Handlers ---
    handleMouseDown: function(e) {
        this.isDragging = true;
        this.lastMouseX = e.offsetX;
        this.lastMouseY = e.offsetY;
        this.selectedNodeId = null; // Clear selection on drag start
        this.hideTooltip();
        this.draw();
    },

    handleMouseMove: function(e) {
        const worldMousePos = this.screenToWorld(e.offsetX, e.offsetY);
        let hoveringNode = null;
        for (const id in this.techNodesData) {
            const node = this.techNodesData[id];
            if (worldMousePos.x >= node.x && worldMousePos.x <= node.x + this.nodeWidth &&
                worldMousePos.y >= node.y && worldMousePos.y <= node.y + this.nodeHeight) {
                hoveringNode = node;
                break;
            }
        }

        if (this.isDragging) {
            const dx = e.offsetX - this.lastMouseX;
            const dy = e.offsetY - this.lastMouseY;
            this.offsetX += dx / this.scale;
            this.offsetY += dy / this.scale;
            this.lastMouseX = e.offsetX;
            this.lastMouseY = e.offsetY;
            this.draw();
        } else if (hoveringNode) {
            this.showTooltip(hoveringNode, e.clientX + 15, e.clientY + 15); // Use clientX/Y for page position
        } else {
            this.hideTooltip();
        }
    },

    handleMouseUp: function() {
        this.isDragging = false;
    },
    handleMouseLeave: function() {
        this.isDragging = false;
        this.hideTooltip();
    },

    handleWheel: function(e) {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const direction = e.deltaY < 0 ? 1 : -1; // 1 for zoom in, -1 for zoom out
        const oldScale = this.scale;
        this.scale += direction * zoomIntensity * this.scale;
        this.scale = Math.max(0.2, Math.min(3, this.scale)); // Clamp scale

        // Zoom towards mouse cursor
        const mouseX = e.offsetX; // Mouse position relative to canvas
        const mouseY = e.offsetY;

        // Adjust offset to keep the point under the cursor stationary
        this.offsetX = (mouseX / oldScale) - (mouseX / this.scale) + this.offsetX;
        this.offsetY = (mouseY / oldScale) - (mouseY / this.scale) + this.offsetY;

        this.draw();
        this.hideTooltip(); // Tooltip position might be off after zoom
    },

    handleClick: function(e) {
        if (this.isDragging && (Math.abs(e.offsetX - this.lastMouseX) > 5 || Math.abs(e.offsetY - this.lastMouseY) > 5)) {
             // If it was a drag, don't process as click (simple threshold)
            return;
        }

        const worldPos = this.screenToWorld(e.offsetX, e.offsetY);
        for (const id in this.techNodesData) {
            const node = this.techNodesData[id];
            if (worldPos.x >= node.x && worldPos.x <= node.x + this.nodeWidth &&
                worldPos.y >= node.y && worldPos.y <= node.y + this.nodeHeight) {
                this.selectedNodeId = id; // Highlight or show purchase UI
                this.attemptPurchase(id); // Or open a modal first
                this.draw();
                return;
            }
        }
        this.selectedNodeId = null; // Clicked on empty space
        this.draw();
    },

    // --- Coordinate Transformation ---
    screenToWorld: function(screenX, screenY) {
        return {
            x: (screenX / this.scale) - this.offsetX,
            y: (screenY / this.scale) - this.offsetY
        };
    },
    worldToScreen: function(worldX, worldY) {
        return {
            x: (worldX + this.offsetX) * this.scale,
            y: (worldY + this.offsetY) * this.scale
        };
    },
    
    // --- Tooltip ---
    showTooltip: function(node, screenX, screenY) {
        const tooltip = document.getElementById(`${this.id}-node-tooltip`);
        if (!tooltip) return;

        let content = `<strong>${node.name}</strong><br>`;
        content += `${node.description}<br>`;
        
        const currentLevel = node.currentLevelKey ? (this.localSharedData.techTreeLevels[node.currentLevelKey] || 0) : 0;
        const isUnlockedAbility = node.isAbility && this.localSharedData.playerStats.abilities[node.abilityName];

        if (node.isAbility) {
            if (isUnlockedAbility) {
                content += `<span style="color: green;">Unlocked</span>`;
            } else {
                content += `Cost: ${node.cost} coins`;
            }
        } else if (node.maxLevel && currentLevel >= node.maxLevel) {
            content += `<span style="color: green;">Max Level (${currentLevel}/${node.maxLevel})</span>`;
        } else {
            content += `Cost: ${node.cost} coins`;
            if(node.maxLevel) content += `<br>Level: ${currentLevel}/${node.maxLevel}`;
        }

        tooltip.innerHTML = content;
        tooltip.style.display = 'block';
        // Position tooltip near mouse, ensuring it stays within viewport
        const containerRect = this.gameContainer.getBoundingClientRect();
        let left = screenX - containerRect.left;
        let top = screenY - containerRect.top;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        // Adjust if tooltip goes off-screen (simple adjustment)
        if (left + tooltip.offsetWidth > this.canvas.width) {
            tooltip.style.left = `${left - tooltip.offsetWidth - 30}px`;
        }
        if (top + tooltip.offsetHeight > this.canvas.height) {
            tooltip.style.top = `${top - tooltip.offsetHeight - 30}px`;
        }
    },

    hideTooltip: function() {
        const tooltip = document.getElementById(`${this.id}-node-tooltip`);
        if (tooltip) tooltip.style.display = 'none';
    },

    // --- Drawing Logic ---
    draw: function() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // Apply pan and zoom
        this.ctx.translate(this.offsetX * this.scale, this.offsetY * this.scale);
        this.ctx.scale(this.scale, this.scale);

        // Draw connections (lines)
        this.ctx.strokeStyle = this.lineColor;
        this.ctx.lineWidth = 2;
        for (const id in this.techNodesData) {
            const node = this.techNodesData[id];
            if (node.prerequisites) {
                node.prerequisites.forEach(prereqId => {
                    const prereqNode = this.techNodesData[prereqId];
                    if (prereqNode) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(prereqNode.x + this.nodeWidth / 2, prereqNode.y + this.nodeHeight / 2);
                        this.ctx.lineTo(node.x + this.nodeWidth / 2, node.y + this.nodeHeight / 2);
                        this.ctx.stroke();
                    }
                });
            }
        }

        // Draw nodes
        for (const id in this.techNodesData) {
            this.drawNode(this.techNodesData[id]);
        }
        this.ctx.restore();

        // Update static UI (coins)
        document.getElementById(`${this.id}-coins-display`).textContent = `Coins: ${this.localSharedData.totalCoins}`;
    },

    drawNode: function(node) {
        const isUnlocked = this.isNodeUnlocked(node.id);
        const canUnlock = this.canUnlockNode(node.id);

        this.ctx.fillStyle = isUnlocked ? this.nodeUnlockedColor : (canUnlock ? this.nodeCanUnlockColor : this.nodeColor);
        if (this.selectedNodeId === node.id) {
            this.ctx.strokeStyle = 'yellow';
            this.ctx.lineWidth = 4;
        } else {
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 1;
        }

        this.ctx.fillRect(node.x, node.y, this.nodeWidth, this.nodeHeight);
        this.ctx.strokeRect(node.x, node.y, this.nodeWidth, this.nodeHeight);

        // Draw text (name, cost/status)
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(node.name, node.x + this.nodeWidth / 2, node.y + this.nodePadding + 5);

        this.ctx.font = '12px Arial';
        let statusText = "";
        const currentLevel = node.currentLevelKey ? (this.localSharedData.techTreeLevels[node.currentLevelKey] || 0) : 0;

        if (node.isAbility) {
            statusText = isUnlocked ? "Unlocked" : `Cost: ${node.cost}`;
        } else if (node.maxLevel) {
            if (currentLevel >= node.maxLevel) {
                statusText = `Max Lvl (${currentLevel}/${node.maxLevel})`;
            } else {
                statusText = `Lvl ${currentLevel}/${node.maxLevel} | Cost: ${node.cost}`;
            }
        } else { // Should not happen if data is well-formed
             statusText = `Cost: ${node.cost}`;
        }
        this.ctx.fillText(statusText, node.x + this.nodeWidth / 2, node.y + this.nodeHeight - this.nodePadding);
        // Maybe description as well if space allows or on hover/selection
    },

    // --- Purchase & Unlock Logic ---
    isPrerequisitesMet: function(nodeId) {
        const node = this.techNodesData[nodeId];
        if (!node.prerequisites || node.prerequisites.length === 0) return true;
        return node.prerequisites.every(prereqId => this.isNodeUnlocked(prereqId));
    },

    isNodeUnlocked: function(nodeId) {
        const node = this.techNodesData[nodeId];
        if (node.isAbility) {
            return !!this.localSharedData.playerStats.abilities[node.abilityName];
        } else if (node.currentLevelKey && node.maxLevel) {
            return (this.localSharedData.techTreeLevels[node.currentLevelKey] || 0) >= node.maxLevel;
        }
        return false; // Should have a clear definition of "unlocked" for all node types
    },
    
    isNodeFullyUpgraded: function(nodeId) { // Specifically for multi-level stat nodes
        const node = this.techNodesData[nodeId];
        if (node.isAbility) return this.isNodeUnlocked(nodeId); // Abilities are unlocked or not
        if (node.currentLevelKey && node.maxLevel) {
            return (this.localSharedData.techTreeLevels[node.currentLevelKey] || 0) >= node.maxLevel;
        }
        return false; // Not a multi-level node or no maxLevel defined
    },


    canUnlockNode: function(nodeId) {
        if (this.isNodeFullyUpgraded(nodeId)) return false; // Already maxed or unlocked
        const node = this.techNodesData[nodeId];
        return this.isPrerequisitesMet(nodeId) && this.localSharedData.totalCoins >= node.cost;
    },

    attemptPurchase: function(nodeId) {
        const node = this.techNodesData[nodeId];
        if (!node || !this.canUnlockNode(nodeId)) {
            console.log(`${this.id}: Cannot purchase/upgrade node ${nodeId}. Conditions not met or node doesn't exist.`);
            this.selectedNodeId = null; // Clear selection if purchase fails immediately
            return;
        }

        this.localSharedData.totalCoins -= node.cost;

        if (node.isAbility) {
            this.localSharedData.playerStats.abilities[node.abilityName] = true;
            console.log(`${this.id}: Unlocked ability ${node.name}.`);
        } else if (node.statName && node.currentLevelKey) { // Stat upgrade
            const currentLevel = this.localSharedData.techTreeLevels[node.currentLevelKey] || 0;
            if (currentLevel < (node.maxLevel || 1) ) { // Ensure maxLevel exists or default to 1
                this.localSharedData.techTreeLevels[node.currentLevelKey] = currentLevel + 1;
                this.localSharedData.playerStats[node.statName] = (this.localSharedData.playerStats[node.statName] || 0) + node.effect;
                console.log(`${this.id}: Upgraded ${node.name} to level ${currentLevel + 1}. New ${node.statName}: ${this.localSharedData.playerStats[node.statName]}`);
                 if (this.isNodeFullyUpgraded(nodeId)) {
                    this.selectedNodeId = null; // Deselect if maxed out
                }
            }
        }
        document.getElementById(`${this.id}-coins-display`).textContent = `Coins: ${this.localSharedData.totalCoins}`;
        this.hideTooltip(); // In case it was open
        this.draw(); // Redraw to reflect changes
    },

    // --- Finish & Cleanup ---
    finish: function() {
        console.log(`${this.id}: Finishing. Passing back sharedData:`, this.localSharedData);
        this.onSuccess(this.localSharedData);
    },

    destroy: function() {
        console.log(`${this.id}: Destroyed.`);
        // Remove event listeners if they were added to document/window
        // Canvas listeners are on the element which will be removed by innerHTML=''
        this.gameContainer.innerHTML = '';
        this.canvas = null;
        this.ctx = null;
    }
};

// No need to expose TechTreeGame globally if all interactions are through canvas event listeners
// window.TechTreeGame = TechTreeGame; // Remove if not needed
