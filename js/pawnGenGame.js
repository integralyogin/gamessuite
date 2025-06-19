// js/pawnGeneratorGame.js
const PawnGenGame = {
    id: 'PawnGeneratorGame',
    container: null, // Will be a temporary, likely hidden, container
    successCallback: null, // To return the generated pawns
    failureCallback: null, // For error handling
    sharedData: null, // Might receive parameters for generation later

    config: {
        // This config will become more complex later (e.g., based on player level, available items, etc.)
        numberOfPawnsToGenerate: 4,
        recruitBaseCost: 50,
        statMinValue: 5,
        statMaxValue: 15,
        possibleClasses: ["Warrior", "Archer", "Mage", "Rogue", "Cleric", "Paladin", "Druid"],
        possibleNames: ["Arin", "Bryn", "Corin", "Dara", "Elara", "Fynn", "Gwen", "Hale", "Iris", "Jorn", "Kael", "Lyra", "Milo", "Nia", "Orin", "Pria", "Quinn", "Roric", "Sari", "Teva", "Vance", "Wren", "Xyla", "Yuri", "Zane"],
        possibleSurnames: ["Stonehand", "Swiftarrow", "Shadowwalker", "Lightbringer", "Ironheart", "Silverwand", "Quickfoot", "Steelsoul", "Moonwhisper", "Sunstrider", "Riverfell", "Nightwind"]
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.container = container; // Though we might not display anything in it for now
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData; // Could use this for generation parameters

        console.log("PawnGeneratorGame: Initializing. Received sharedData:", JSON.parse(JSON.stringify(this.sharedData)));

        // For now, this game runs instantly and returns data.
        // Later, it could have its own UI, delays, or more complex processes.
        try {
            const generatedPawns = this.generatePawns();
            console.log("PawnGeneratorGame: Generated pawns:", JSON.parse(JSON.stringify(generatedPawns)));
            // The successCallback expects an object that will be merged into the calling game's sharedData.
            // So, we should return an object, e.g., { generatedRecruits: generatedPawns }
            this.successCallback({ generatedRecruits: generatedPawns });
        } catch (error) {
            console.error("PawnGeneratorGame: Error during pawn generation:", error);
            this.failureCallback({ reason: "Pawn generation failed.", error: error.toString() });
        }
    },

    generateRandomName: function() {
        const name = this.config.possibleNames[Math.floor(Math.random() * this.config.possibleNames.length)];
        const surname = this.config.possibleSurnames[Math.floor(Math.random() * this.config.possibleSurnames.length)];
        return `${name} ${surname}`;
    },

    generateSinglePawn: function() {
        const heroClass = this.config.possibleClasses[Math.floor(Math.random() * this.config.possibleClasses.length)];
        
        // Basic stat generation (can be much more detailed)
        const primaryStatValue = this.config.statMinValue + Math.floor(Math.random() * (this.config.statMaxValue - this.config.statMinValue + 1));
        let primaryStatName = "STR"; // Default
        if (heroClass === "Mage") primaryStatName = "INT";
        else if (heroClass === "Archer" || heroClass === "Rogue") primaryStatName = "DEX";
        else if (heroClass === "Cleric" || heroClass === "Druid") primaryStatName = "WIS";
        else if (heroClass === "Paladin") primaryStatName = "CHA"; // Example

        const pawn = {
            id: `pawn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // More unique ID
            name: this.generateRandomName(),
            class: heroClass,
            level: 1, // Default level
            stats: {
                hp: this.config.statMinValue + Math.floor(Math.random() * (this.config.statMaxValue - this.config.statMinValue + 1)) + 10, // HP generally higher
                [primaryStatName]: primaryStatValue,
                // Could add other base stats like CON, etc.
            },
            equipment: {}, // Placeholder for future item generation
            skills: [],    // Placeholder
            cost: this.config.recruitBaseCost + Math.floor(Math.random() * (heroClass.length * 5)) - (primaryStatValue) // Cost influenced by class & stats
        };
        // Ensure cost is not negative
        pawn.cost = Math.max(10, pawn.cost); 
        return pawn;
    },

    generatePawns: function() {
        const pawns = [];
        for (let i = 0; i < this.config.numberOfPawnsToGenerate; i++) {
            pawns.push(this.generateSinglePawn());
        }
        return pawns;
    },

    destroy: function() {
        // This game currently has no persistent elements or complex listeners to clean up.
        // If it had a UI in its container, we'd clear it here.
        console.log("PawnGeneratorGame: Destroying (no complex cleanup needed for now).");
        if (this.container) {
            this.container.innerHTML = ''; // Clear if anything was rendered
        }
    }
};

