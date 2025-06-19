// complexPawnGenerator.js
// Base pawn generator for the "Integral Being" design.

const ComplexPawnGenerator = {
    config: {
        // --- Default Configuration ---
        // Define ranges or methods for determining potentials and current levels
        defaultPotentialRange: { min: 30, max: 100 },
        defaultCurrentToPotentialRatio: { min: 0.2, max: 0.5 },
        psychicAwakeningPotentialRange: { min: 5, max: 40 }, // Psychic often starts low but with high impact
        divineSparkScale: 100, // Max value for Divine Spark's influence calculation

        // Limb conditions
        limbConditions: ['Perfect', 'Healthy', 'Strained', 'Slightly Impaired', 'Damaged', 'Dormant', 'Stirring', 'Awakening', 'Active', 'Evolved_Lvl1'],
        subtleLimbInitialState: 'Dormant',
        physicalLimbInitialState: 'Healthy',

        // Veils of Ignorance - potential starting veils
        potentialVeils: [
            { id: 'veil_tamasic_inertia', name: 'Tamasic Inertia', description: 'A drag of dullness and resistance to action.', planeImpact: { physical: -10, vital: -10, mental: -5 }, yogicImpact: { aspirationIntensity: -10 } },
            { id: 'veil_rajasic_agitation', name: 'Rajasic Agitation', description: 'Restless energy and uncontrolled impulses.', planeImpact: { vital: { emotionalStability: -15 } }, yogicImpact: { concentrationFocus: -10 } },
            { id: 'veil_ego_dominance_slight', name: 'Slight Ego-Dominance', description: 'The sense of self is somewhat over-assertive.', planeImpact: {}, yogicImpact: { psychicInfluence: -5, surrenderCapacity: -10 } },
            { id: 'veil_mental_chatter', name: 'Mental Chatter', description: 'A busy, unfocused mind.', planeImpact: { mental: { silencePotential: -15, concentrationFocus: -10 } } },
        ],
        initialVeilCount: { min: 1, max: 2 },
    },

    // --- Utility Functions ---
    getRandomInt: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    getRandomFloat: function(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Helper to create an attribute with current and potential
    createAttribute: function(potentialMin, potentialMax, currentRatioMin, currentRatioMax, baseName = "") {
        const potential = this.getRandomInt(potentialMin, potentialMax);
        const current = Math.floor(potential * this.getRandomFloat(currentRatioMin, currentRatioMax));
        return {
            name: baseName, // Optional: if you want to store the name directly
            current: Math.max(1, current), // Ensure current is at least 1
            potential: potential,
            purity: this.getRandomInt(30, 70), // Default purity, can be adjusted
            // evolution_points: 0 // For tracking development
        };
    },

    // --- Pawn Generation Phases ---

    // Phase 1: Spark & Potential Seeding
    _phase1_seedSparkAndCorePotentials: function(pawn) {
        pawn.divineSparkRating = this.getRandomInt(1, 10); // Profound impact despite low number
        pawn.psychicCore = {
            awakeningLevel: this.createAttribute(
                this.config.psychicAwakeningPotentialRange.min,
                this.config.psychicAwakeningPotentialRange.max,
                0.05, 0.15 // Psychic current awakening starts very low
            ),
            influenceOnNature: { current: this.getRandomInt(1, 10), potential: 100 },
            discernmentOfTruth: this.createAttribute(10, 50, 0.1, 0.3),
            loveAnandaFlow: this.createAttribute(10, 60, 0.1, 0.3),
            aspirationSourceStrength: this.createAttribute(20, 70, 0.2, 0.4),
            conscienceSensitivity: this.createAttribute(15, 60, 0.1, 0.4),
        };
        pawn.transformationPotential = this.getRandomInt(
            pawn.divineSparkRating * 5 + pawn.psychicCore.awakeningLevel.potential / 2,
            100 + pawn.divineSparkRating * 10 // Max potential, can exceed 100 for truly special pawns
        );
        pawn.transformationPotential = Math.min(pawn.transformationPotential, 200); // Cap it for sanity
    },

    // Phase 2: Constitutional Blueprint (Planes of Consciousness)
    _phase2_constitutionalBlueprint: function(pawn) {
        pawn.planes = {
            physical: {
                vitalityCore: this.createAttribute(40, 100, 0.3, 0.6, "Physical Vitality Core"),
                strengthPotential: this.createAttribute(30, 100, 0.2, 0.5, "Physical Strength"),
                agilityPotential: this.createAttribute(30, 100, 0.2, 0.5, "Physical Agility"),
                sensoryAcuity: this.createAttribute(30, 90, 0.3, 0.6, "Sensory Acuity"),
                purityState: { current: this.getRandomInt(20, 60), potential: 100 },
                subtleConductivity: this.createAttribute(10, 70, 0.1, 0.4, "Subtle Physical Conductivity"),
                cellularMemoryResonance: { current: 0, history: [] } // Can store impact of experiences
            },
            vital: {
                energyReservoir: this.createAttribute(50, 120, 0.4, 0.7, "Vital Energy Reservoir"), // Vital can be high
                powerProjection: this.createAttribute(30, 110, 0.2, 0.5, "Vital Power Projection"),
                emotionalSpectrumRange: this.createAttribute(40, 90, 0.5, 0.8, "Emotional Spectrum"),
                emotionalStabilityQuotient: this.createAttribute(20, 80, 0.2, 0.5, "Emotional Stability"),
                purityState: { current: this.getRandomInt(15, 50), potential: 100 },
                receptivityToBeautyJoy: this.createAttribute(20, 90, 0.3, 0.6, "Receptivity to Beauty/Joy"),
                driveIntensity: this.createAttribute(30, 100, 0.3, 0.6, "Vital Drive")
            },
            mental: {
                cognitiveCapacity: this.createAttribute(40, 110, 0.3, 0.6, "Cognitive Capacity"),
                conceptualClarity: this.createAttribute(30, 100, 0.2, 0.5, "Conceptual Clarity"),
                concentrationFocus: this.createAttribute(20, 90, 0.2, 0.4, "Concentration Focus"),
                memoryMatrixEfficiency: this.createAttribute(30, 100, 0.3, 0.6, "Memory Efficiency"),
                plasticityAdaptability: this.createAttribute(25, 95, 0.2, 0.5, "Mental Plasticity"),
                silencePotential: this.createAttribute(5, 70, 0.05, 0.2, "Mental Silence Potential"), // Starts low
                purityState: { current: this.getRandomInt(20, 55), potential: 100 },
                creativeImaginationFaculty: this.createAttribute(30, 100, 0.2, 0.5, "Creative Imagination")
            },
            spiritual: { // Potential for higher consciousness, often latent
                opennessToHigherPlanes: this.createAttribute(10, 80, 0.05, 0.2, "Spiritual Openness"),
                descentChannelCapacity: this.createAttribute(5, 70, 0.05, 0.15, "Descent Channel Capacity"),
                widenessUniversality: this.createAttribute(5, 75, 0.05, 0.15, "Spiritual Wideness"),
                peaceAbidance: this.createAttribute(10, 80, 0.1, 0.2, "Spiritual Peace"),
                powerPotential: this.createAttribute(5, 70, 0.01, 0.1, "Spiritual Power Potential"), // Very latent
                knowledgeGnosisReceptivity: this.createAttribute(10, 85, 0.05, 0.2, "Gnosis Receptivity")
            }
        };
    },

    // Phase 3: Yogic Foundation
    _phase3_yogicFoundation: function(pawn) {
        pawn.yogicAttributes = {
            aspirationIntensity: this.createAttribute(
                10 + pawn.psychicCore.aspirationSourceStrength.current / 2,
                60 + pawn.psychicCore.aspirationSourceStrength.potential / 2,
                0.2, 0.5, "Aspiration Intensity"
            ),
            receptivityActiveState: this.createAttribute(
                10 + pawn.planes.spiritual.opennessToHigherPlanes.current / 3,
                50 + pawn.planes.spiritual.opennessToHigherPlanes.potential / 2,
                0.2, 0.5, "Receptivity (Global)"
            ),
            faithResilience: this.createAttribute(10, 70, 0.2, 0.4, "Faith Resilience"),
            sincerityPurityOfMotive: this.createAttribute(15, 80, 0.3, 0.6, "Sincerity"), // Influenced by Psychic
            enduranceInTrial: this.createAttribute(20, 80, 0.2, 0.5, "Endurance in Trial"),
            consecrationScope: this.createAttribute(5, 60, 0.1, 0.3, "Consecration Scope"),
            selfObservationDepth: this.createAttribute(10, 70, 0.1, 0.3, "Self-Observation Depth"),
            innerWitnessStability: this.createAttribute(5, 65, 0.05, 0.2, "Inner Witness Stability"),
            meditationProfundity: this.createAttribute(5, 70, 0.05, 0.2, "Meditation Profundity"),
            willInSadhanaStrength: this.createAttribute(10, 75, 0.1, 0.4, "Will in Sadhana"),
            surrenderCapacity: this.createAttribute(5, 60, 0.05, 0.2, "Surrender Capacity"), // Hard to develop
            gratitudeCultivation: { current: this.getRandomInt(0, 20), potential: 100 },
            humilityTrueState: { current: this.getRandomInt(0, 15), potential: 100 }, // True humility is rare
        };

        // Initial Purity efforts based on Psychic Influence and Sincerity
        ['physical', 'vital', 'mental'].forEach(plane => {
            pawn.yogicAttributes[`purityEffortFocus_${plane}`] = {
                current: Math.floor((pawn.psychicCore.influenceOnNature.current + pawn.yogicAttributes.sincerityPurityOfMotive.current) / 20),
                potential: 100
            };
        });
    },

    // Phase 4: Limb & Faculty Initialization
    _phase4_initializeLimbsAndFaculties: function(pawn) {
        pawn.limbs = { physical: [], subtle: [] };
        pawn.faculties = { antahkarana: {}, jnanaIndriyas: {}, karmaIndriyas: {} };

        // --- Physical Limbs ---
        // Helper to create a physical limb
        const createPhysicalLimb = (name, type, baseProps = {}) => {
            let properties = {};
            if (name.includes('Eye')) properties = { visualAcuity: pawn.planes.physical.sensoryAcuity.current * this.getRandomFloat(0.8, 1.2), colorPerception: pawn.planes.physical.sensoryAcuity.current * this.getRandomFloat(0.7, 1.1), ...baseProps };
            else if (name.includes('Ear')) properties = { auditoryAcuity: pawn.planes.physical.sensoryAcuity.current * this.getRandomFloat(0.8, 1.2), ...baseProps };
            else if (name.includes('Hand')) properties = { dexterity: pawn.planes.physical.agilityPotential.current * this.getRandomFloat(0.7, 1.1), gripStrength: pawn.planes.physical.strengthPotential.current * this.getRandomFloat(0.6, 1.0), ...baseProps };
            else properties = { ...baseProps };
            
            Object.keys(properties).forEach(key => { // Ensure props are integers
                properties[key] = Math.floor(properties[key]);
            });

            return {
                id: `${type}_${name.toLowerCase().replace(/\s+/g, '_')}_${this.getRandomInt(1000,9999)}`,
                name: name,
                type: 'physical_organ', // More specific type
                limb_type: type, // e.g. 'sensory_organ', 'motor_limb', 'internal_system'
                condition: this.config.physicalLimbInitialState,
                purityLevel: pawn.planes.physical.purityState.current * this.getRandomFloat(0.9, 1.1),
                properties: properties,
                evolutionPaths: [], // To be defined later based on game design, e.g., { pathName: "Aura Perception", requirements: {}, effects: {} }
                damageSustained: 0,
                maxIntegrity: 100 // Example property for health of the limb
            };
        };

        pawn.limbs.physical.push(createPhysicalLimb('Eye Left', 'sensory_organ'));
        pawn.limbs.physical.push(createPhysicalLimb('Eye Right', 'sensory_organ'));
        pawn.limbs.physical.push(createPhysicalLimb('Ear Left', 'sensory_organ'));
        pawn.limbs.physical.push(createPhysicalLimb('Ear Right', 'sensory_organ'));
        pawn.limbs.physical.push(createPhysicalLimb('Nose Olfactory System', 'sensory_organ'));
        pawn.limbs.physical.push(createPhysicalLimb('Tongue & Speech Apparatus', 'sensory_organ')); // Combined for simplicity
        pawn.limbs.physical.push(createPhysicalLimb('Skin Tactile System', 'sensory_organ', { area: 100 })); // Example unique prop

        pawn.limbs.physical.push(createPhysicalLimb('Hand Left', 'motor_limb'));
        pawn.limbs.physical.push(createPhysicalLimb('Hand Right', 'motor_limb'));
        pawn.limbs.physical.push(createPhysicalLimb('Arm Left', 'motor_limb'));
        pawn.limbs.physical.push(createPhysicalLimb('Arm Right', 'motor_limb'));
        pawn.limbs.physical.push(createPhysicalLimb('Leg Left', 'motor_limb'));
        pawn.limbs.physical.push(createPhysicalLimb('Leg Right', 'motor_limb'));
        pawn.limbs.physical.push(createPhysicalLimb('Foot Left', 'motor_limb'));
        pawn.limbs.physical.push(createPhysicalLimb('Foot Right', 'motor_limb'));

        pawn.limbs.physical.push(createPhysicalLimb('Brain Neurological System', 'internal_system', { processingSpeed: pawn.planes.mental.cognitiveCapacity.current }));
        pawn.limbs.physical.push(createPhysicalLimb('Heart Circulatory System', 'internal_system', { cardiacOutput: pawn.planes.physical.vitalityCore.current }));
        pawn.limbs.physical.push(createPhysicalLimb('Lungs Respiratory System', 'internal_system', { lungCapacity: pawn.planes.physical.vitalityCore.current * 1.2 }));
        // ... other internal organs as needed: Digestive, Endocrine, Musculoskeletal_Core etc.

        // --- Subtle Limbs (Adharas/Chakras) ---
        const createSubtleLimb = (name, description, primaryPlaneLink) => {
            return {
                id: `subtle_${name.toLowerCase()}_${this.getRandomInt(1000,9999)}`,
                name: name,
                type: 'subtle_center',
                description: description,
                condition: this.config.subtleLimbInitialState, // e.g., Dormant, Stirring
                activityLevel: this.getRandomInt(1, 10), // 0-100
                purityLevel: (pawn.planes[primaryPlaneLink]?.purityState?.current || pawn.psychicCore.awakeningLevel.purity || 40) * this.getRandomFloat(0.7, 1.0),
                blockages: [], // Can store specific blockages
                functions: [], // List functions, e.g., "Grounding", "Emotional Processing"
                evolutionPaths: [] // e.g., { pathName: "Awaken Fully", requirements: {psychicInfluence: 50, ...}, effects: {activityLevel: +50, functions_unlocked: ["..."]} }
            };
        };
        pawn.limbs.subtle.push(createSubtleLimb('Muladhara', 'Root Center - Physical Grounding', 'physical'));
        pawn.limbs.subtle.push(createSubtleLimb('Svadhisthana', 'Sacral Center - Lower Vital', 'vital'));
        pawn.limbs.subtle.push(createSubtleLimb('Manipura', 'Navel Center - Dynamism & Power', 'vital'));
        pawn.limbs.subtle.push(createSubtleLimb('Anahata', 'Heart Center - Emotion & Psychic Opening', 'psychicCore')); // Linked to psychic
        pawn.limbs.subtle.push(createSubtleLimb('Vishuddha', 'Throat Center - Expression & Purification', 'mental'));
        pawn.limbs.subtle.push(createSubtleLimb('Ajna', 'Third Eye Center - Will & Vision', 'mental'));
        pawn.limbs.subtle.push(createSubtleLimb('Sahasrara', 'Crown Center - Spiritual Connection', 'spiritual'));


        // --- Faculties (Inner Instruments) ---
        pawn.faculties.antahkarana = {
            manas: { state: 'Active', purity: pawn.planes.mental.purityState.current * this.getRandomFloat(0.8,1.0), functionality: pawn.planes.mental.cognitiveCapacity.current * 0.7 },
            buddhi: { state: 'Developing', purity: pawn.planes.mental.purityState.current * this.getRandomFloat(0.7,0.9), discernmentLevel: pawn.planes.mental.conceptualClarity.current * 0.6 },
            chitta: { state: 'Storing', purity: pawn.planes.mental.purityState.current * this.getRandomFloat(0.6,0.8), memoryCapacity: pawn.planes.mental.memoryMatrixEfficiency.current * 0.8 },
            ahamkara: { state: 'Dominant', purity: 10 + pawn.psychicCore.influenceOnNature.current / 5, strength: this.getRandomInt(40,80) } // Ego is strong initially
        };
        
        const createJnanaIndriya = (name, planeLinkAttr) => ({ name, level: planeLinkAttr.current * 0.1, purity: planeLinkAttr.purity * 0.5, condition: 'Latent'});
        pawn.faculties.jnanaIndriyas = {
            subtleSight: createJnanaIndriya('Subtle Sight', pawn.planes.spiritual.knowledgeGnosisReceptivity),
            subtleHearing: createJnanaIndriya('Subtle Hearing', pawn.planes.spiritual.knowledgeGnosisReceptivity),
            // ... other subtle senses
        };
        // KarmaIndriyas would be similar, mostly latent.

    },

    // Phase 5: Skill & Siddhi Imprints
    _phase5_skillAndSiddhiImprints: function(pawn) {
        pawn.skills = []; // Array of skill objects { id, name, level, mastery, type }
        pawn.siddhis = { latent: [], active: [] }; // { id, name, description, requirements_met_percent }

        // Example: Grant one skill based on highest plane potential or psychic core
        let primaryFocus = 'physical'; // Default
        let maxPlanePotential = 0;
        for (const plane in pawn.planes) {
            // Simplified: sum potentials of sub-attributes
            let currentPlanePotential = Object.values(pawn.planes[plane])
                .filter(attr => typeof attr === 'object' && attr.hasOwnProperty('potential'))
                .reduce((sum, attr) => sum + attr.potential, 0);
            if (currentPlanePotential > maxPlanePotential) {
                maxPlanePotential = currentPlanePotential;
                primaryFocus = plane;
            }
        }
        if (pawn.psychicCore.awakeningLevel.potential > maxPlanePotential / 3) primaryFocus = 'psychic'; // Psychic is influential

        const skillMap = {
            physical: { id: 'skill_basic_endurance', name: 'Basic Endurance', level: 1, type: 'physical' },
            vital: { id: 'skill_vital_surge', name: 'Vital Surge', level: 1, type: 'vital' },
            mental: { id: 'skill_focused_thought', name: 'Focused Thought', level: 1, type: 'mental' },
            psychic: { id: 'skill_heart_felt_aspiration', name: 'Heart-Felt Aspiration', level: 1, type: 'psychic' },
            spiritual: { id: 'skill_moment_of_peace', name: 'Moment of Peace', level: 1, type: 'spiritual' }
        };
        if (skillMap[primaryFocus]) pawn.skills.push(skillMap[primaryFocus]);


        // Latent Siddhis (example, more complex logic needed)
        if (pawn.divineSparkRating > 7 && pawn.psychicCore.awakeningLevel.potential > 30) {
            pawn.siddhis.latent.push({ id: 'siddhi_immutable_peace_latent', name: 'Immutable Peace (Latent)', requirements_met_percent: 5 });
        }
        if (pawn.planes.spiritual.powerPotential.potential > 60 && pawn.transformationPotential > 150) {
             pawn.siddhis.latent.push({ id: 'siddhi_transformative_power_minor_latent', name: 'Transformative Power Minor (Latent)', requirements_met_percent: 1 });
        }
    },

    // Phase 6: Initial Status & Veils
    _phase6_initialStatusAndVeils: function(pawn) {
        pawn.veilsOfIgnorance = [];
        const veilCount = this.getRandomInt(this.config.initialVeilCount.min, this.config.initialVeilCount.max);
        let availableVeils = [...this.config.potentialVeils];

        for (let i = 0; i < veilCount && availableVeils.length > 0; i++) {
            const veilIndex = this.getRandomInt(0, availableVeils.length - 1);
            const chosenVeil = availableVeils.splice(veilIndex, 1)[0];
            pawn.veilsOfIgnorance.push(chosenVeil);

            // Apply impact (simplified example)
            if (chosenVeil.planeImpact) {
                for (const planeKey in chosenVeil.planeImpact) {
                    if (pawn.planes[planeKey]) {
                        const impacts = chosenVeil.planeImpact[planeKey];
                        if (typeof impacts === 'number') { // Direct impact on a main plane stat (hypothetical)
                           // This needs more specific mapping in a real game, e.g. impacting 'purityState' or a sub-attribute.
                           // For now, just log it or apply to a general 'condition_modifier'
                           pawn.planes[planeKey].condition_modifier = (pawn.planes[planeKey].condition_modifier || 0) + impacts;
                        } else { // Impact on sub-attributes
                            for (const subAttrKey in impacts) {
                                if (pawn.planes[planeKey][subAttrKey] && pawn.planes[planeKey][subAttrKey].hasOwnProperty('current')) {
                                    pawn.planes[planeKey][subAttrKey].current += impacts[subAttrKey];
                                    pawn.planes[planeKey][subAttrKey].current = Math.max(1, pawn.planes[planeKey][subAttrKey].current); // Don't go below 1
                                }
                            }
                        }
                    }
                }
            }
            // Similar logic for yogicImpact
        }

        const statuses = ["Newly Manifested", "Stirring in Ignorance", "Faintly Aspiring", "A Shadowed Spark", "Poised at the Brink"];
        pawn.overallStartingStatus = statuses[this.getRandomInt(0, statuses.length - 1)];
        pawn.statusEffects = []; // Start with no active game-play status effects initially
    },

    // Phase 7: Refinement & Inter-Attribute Balancing (Placeholder)
    _phase7_refineAndBalance: function(pawn) {
        // This phase would involve checking for logical inconsistencies
        // e.g., if Psychic Influence is high, purity states in other planes should not be abysmal without a reason (like a strong Veil).
        // Adjust attributes slightly to ensure a coherent, though potentially conflicted, starting pawn.
        // Example: Boost purityState of planes slightly based on psychicCore.influenceOnNature.current
        for (const planeKey in pawn.planes) {
            if (pawn.planes[planeKey].purityState) {
                pawn.planes[planeKey].purityState.current += Math.floor(pawn.psychicCore.influenceOnNature.current / 10);
                pawn.planes[planeKey].purityState.current = Math.min(100, Math.max(1, pawn.planes[planeKey].purityState.current));
            }
        }
        // Ensure yogic attributes like aspiration are not zero if psychic core has some aspiration strength.
        if (pawn.psychicCore.aspirationSourceStrength.current > 0 && pawn.yogicAttributes.aspirationIntensity.current <= 1) {
            pawn.yogicAttributes.aspirationIntensity.current = this.getRandomInt(2, 5 + Math.floor(pawn.psychicCore.aspirationSourceStrength.current / 10));
        }
    },


    // --- Main Generation Function ---
    generateIntegralBeing: function(customConfig = {}) {
        // Merge custom config with defaults if any
        this.config = { ...this.config, ...customConfig };

        const pawn = {
            id: `pawn_${Date.now()}_${this.getRandomInt(10000, 99999)}`,
            name: `Being #${this.getRandomInt(1, 1000)}`, // Placeholder name
            // Initialize core structures
            divineSparkRating: 0,
            psychicCore: {},
            planes: {},
            yogicAttributes: {},
            limbs: { physical: [], subtle: [] },
            faculties: {},
            skills: [],
            siddhis: { latent: [], active: [] },
            statusEffects: [],
            veilsOfIgnorance: [],
            overallStartingStatus: '',
            transformationPotential: 0,
            // evolutionLog: [], // To track significant evolutionary changes to limbs/faculties/attributes
        };

        // Execute generation phases
        this._phase1_seedSparkAndCorePotentials(pawn);
        this._phase2_constitutionalBlueprint(pawn);
        this._phase3_yogicFoundation(pawn);
        this._phase4_initializeLimbsAndFaculties(pawn);
        this._phase5_skillAndSiddhiImprints(pawn);
        this._phase6_initialStatusAndVeils(pawn);
        this._phase7_refineAndBalance(pawn);

        console.log("Generated Integral Being:", pawn);
        return pawn;
    },

    // --- Functions for Limb Evolution/Impairment (Conceptual Stubs) ---
    evolveLimb: function(pawn, limbId, evolutionPathId, resources) {
        // Find limb, find evolution path
        // Check requirements (resources, pawn attributes, etc.)
        // Apply effects (change limb condition, properties, add new functions)
        // pawn.evolutionLog.push({ timestamp: Date.now(), event: 'Limb Evolved', limbId, evolutionPathId });
        console.warn(`Conceptual: Evolve limb ${limbId} via ${evolutionPathId}. Needs full implementation.`);
        return pawn;
    },

    damageLimb: function(pawn, limbId, damageAmount, damageType) {
        // Find limb
        // Apply damage, change condition (e.g. Healthy -> Strained -> Damaged)
        // Potentially create status effects
        // pawn.evolutionLog.push({ timestamp: Date.now(), event: 'Limb Damaged', limbId, damageAmount, damageType });
        console.warn(`Conceptual: Damage limb ${limbId} by ${damageAmount} (${damageType}). Needs full implementation.`);
        return pawn;
    },

    awakenSubtleFaculty: function(pawn, facultyId, method) {
        // Find faculty
        // Based on method and pawn's yogic attributes, improve its state/level/purity
        // pawn.evolutionLog.push({ timestamp: Date.now(), event: 'Faculty Awakened', facultyId, method });
        console.warn(`Conceptual: Awaken subtle faculty ${facultyId} via ${method}. Needs full implementation.`);
        return pawn;
    }

};

// Example Usage (typically this would be called by a game manager)
// const myNewPawn = ComplexPawnGenerator.generateIntegralBeing();
// console.log(myNewPawn.name, myNewPawn.planes.physical.vitalityCore);

// To make it available globally like the user's original PawnGeneratorGame
// if (typeof window !== 'undefined') {
//   window.ComplexPawnGenerator = ComplexPawnGenerator;
// }
