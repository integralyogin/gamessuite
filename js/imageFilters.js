// js/prayerSceneGame.js (Stained Glass Version with External Image and Filter Controls)

const PrayerSceneGame = {
    id: 'PrayerSceneGame',
    gameContainer: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    styles: null,
    elements: {},
    imageUrl: 'images/MZtYqJyXKpEQV7NQMCwI--0--kva5n.jpg', // Make sure this path is accessible

    // Default and current filter settings
    filterSettings: {
        contrast: 1.3,
        brightness: 1.1,
        saturate: 1.5,
        hue: -15, // degrees
        shadowR: 220,
        shadowG: 180,
        shadowB: 255,
        shadowA: 0.45,
        shadowBlur: 20, // px
    },

    // Pulse animation parameters (can be adjusted here if needed)
    pulseAnimationFactors: {
        contrastFactor: 1.03,   // e.g., 1.3 -> 1.3 * 1.03 = 1.339
        brightnessFactor: 1.05, // e.g., 1.1 -> 1.1 * 1.05 = 1.155
        saturateFactor: 1.10,   // e.g., 1.5 -> 1.5 * 1.10 = 1.65
        hueShift: 3,            // e.g., -15deg -> -15 + 3 = -12deg
        shadowAFactor: 1.1,     // e.g., 0.45 -> 0.45 * 1.1 = 0.495
        shadowBlurAdd: 2,       // e.g., 20px -> 20 + 2 = 22px
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        // Deep copy default settings to current settings for this instance
        this.currentFilterSettings = JSON.parse(JSON.stringify(this.filterSettings));

        console.log(`PrayerSceneGame (External Image with Filters): Initializing.`);
        this.injectStyles();
        this.applyCssVariables(this.currentFilterSettings); // Apply initial CSS variables
        this.renderScene();
        this.setupEventListeners();
        this.initControls(this.currentFilterSettings); // Set initial control values
    },

    applyCssVariables: function(settings) {
        const rootStyle = this.gameContainer.style; // Apply to game container to scope variables
        rootStyle.setProperty('--psg-base-contrast', settings.contrast);
        rootStyle.setProperty('--psg-base-brightness', settings.brightness);
        rootStyle.setProperty('--psg-base-saturate', settings.saturate);
        rootStyle.setProperty('--psg-base-hue', settings.hue + 'deg');
        rootStyle.setProperty('--psg-base-shadow-r', settings.shadowR);
        rootStyle.setProperty('--psg-base-shadow-g', settings.shadowG);
        rootStyle.setProperty('--psg-base-shadow-b', settings.shadowB);
        rootStyle.setProperty('--psg-base-shadow-a', settings.shadowA);
        rootStyle.setProperty('--psg-base-shadow-blur', settings.shadowBlur + 'px');
    },

    injectStyles: function() {
        const styleId = 'prayer-scene-image-styles';
        if (document.getElementById(styleId)) return;

        this.styles = document.createElement('style');
        this.styles.id = styleId;
        this.styles.innerHTML = `
            /* CSS Variables will be set on .prayer-scene-img-container by JS */
            .prayer-scene-img-container {
                /* Default values, JS will override with currentFilterSettings */
                --psg-base-contrast: ${this.filterSettings.contrast};
                --psg-base-brightness: ${this.filterSettings.brightness};
                --psg-base-saturate: ${this.filterSettings.saturate};
                --psg-base-hue: ${this.filterSettings.hue}deg;
                --psg-base-shadow-r: ${this.filterSettings.shadowR};
                --psg-base-shadow-g: ${this.filterSettings.shadowG};
                --psg-base-shadow-b: ${this.filterSettings.shadowB};
                --psg-base-shadow-a: ${this.filterSettings.shadowA};
                --psg-base-shadow-blur: ${this.filterSettings.shadowBlur}px;

                /* Pulse animation factors */
                --psg-pulse-contrast-factor: ${this.pulseAnimationFactors.contrastFactor};
                --psg-pulse-brightness-factor: ${this.pulseAnimationFactors.brightnessFactor};
                --psg-pulse-saturate-factor: ${this.pulseAnimationFactors.saturateFactor};
                --psg-pulse-hue-shift: ${this.pulseAnimationFactors.hueShift}deg;
                --psg-pulse-shadow-a-factor: ${this.pulseAnimationFactors.shadowAFactor};
                --psg-pulse-shadow-blur-add: ${this.pulseAnimationFactors.shadowBlurAdd}px;
            }

            @keyframes pulseAlive {
                0%, 100% {
                    filter:
                        contrast(var(--psg-base-contrast))
                        brightness(var(--psg-base-brightness))
                        saturate(var(--psg-base-saturate))
                        hue-rotate(var(--psg-base-hue))
                        drop-shadow(0 0 var(--psg-base-shadow-blur) rgba(var(--psg-base-shadow-r), var(--psg-base-shadow-g), var(--psg-base-shadow-b), var(--psg-base-shadow-a)));
                }
                50% {
                    filter:
                        contrast(calc(var(--psg-base-contrast) * var(--psg-pulse-contrast-factor)))
                        brightness(calc(var(--psg-base-brightness) * var(--psg-pulse-brightness-factor)))
                        saturate(calc(var(--psg-base-saturate) * var(--psg-pulse-saturate-factor)))
                        hue-rotate(calc(var(--psg-base-hue) + var(--psg-pulse-hue-shift)))
                        drop-shadow(0 0 calc(var(--psg-base-shadow-blur) + var(--psg-pulse-shadow-blur-add)) rgba(var(--psg-base-shadow-r), var(--psg-base-shadow-g), var(--psg-base-shadow-b), calc(var(--psg-base-shadow-a) * var(--psg-pulse-shadow-a-factor)) ));
                }
            }

            .prayer-scene-img-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                background: radial-gradient(ellipse at center, #2a1f3d 0%, #0c0814 75%);
                font-family: 'Georgia', 'Times New Roman', Times, serif;
                color: #f0f0f0;
                text-align: center;
                padding: 10px; /* Reduced padding to make space for controls */
                box-sizing: border-box;
                border-radius: 8px;
                overflow: auto; /* Changed to auto for controls */
            }
            #prayerImageElement {
                display: block;
                margin-bottom: 15px; /* Adjusted margin */
                border: 5px solid #302045;
                animation: pulseAlive 4s ease-in-out infinite;
                max-width: 70%; /* Adjusted for controls */
                max-height: 50vh; /* Adjusted for controls */
                object-fit: contain;
                border-radius: 4px;
                box-shadow: inset 0 0 50px rgba(0,0,0,0.5), 0 0 25px rgba(60,40,90,0.5);
            }
            .prayer-message-img {
                font-size: 1.5em; /* Adjusted size */
                margin-bottom: 15px; /* Adjusted margin */
                color: #f8f8f8;
                text-shadow: 1px 1px 7px #000000, 0 0 4px #d8d8ff;
                font-style: italic;
            }
            .prayer-next-button-img {
                padding: 12px 30px; /* Adjusted padding */
                background-color: #5a407a;
                color: #faf5ff;
                border: 2px solid #8a70aa;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1.1em; /* Adjusted size */
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                transition: background-color 0.3s, transform 0.1s, box-shadow 0.3s;
                box-shadow: 0 6px 12px rgba(0,0,0,0.4);
                margin-top: 10px; /* Added margin */
            }
            .prayer-next-button-img:hover {
                background-color: #705098;
                border-color: #aa90ca;
                box-shadow: 0 8px 16px rgba(0,0,0,0.5);
                transform: translateY(-2px);
            }
            .prayer-next-button-img:active {
                background-color: #4a306a;
                transform: translateY(0px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            }

            /* Styles for filter controls */
            .filter-controls {
                display: flex;
                flex-wrap: wrap; /* Allow controls to wrap */
                justify-content: center;
                gap: 10px; /* Gap between control groups */
                padding: 10px;
                background-color: rgba(0,0,0,0.2);
                border-radius: 5px;
                margin-bottom: 10px; /* Space before image */
                width: 100%;
                max-width: 600px; /* Max width for controls */
                box-sizing: border-box;
            }
            .filter-controls > div {
                display: flex;
                flex-direction: column; /* Stack label and input */
                align-items: center;
                margin: 5px;
                min-width: 120px; /* Min width for each control group */
            }
            .filter-controls label {
                font-size: 0.9em;
                margin-bottom: 3px;
                color: #ccc;
            }
            .filter-controls input[type="range"] {
                width: 100px;
            }
            .filter-controls input[type="color"] {
                width: 50px;
                height: 25px;
                padding: 0;
                border: 1px solid #555;
            }
            .filter-controls span { /* For displaying slider value */
                font-size: 0.8em;
                color: #aaa;
                min-width: 30px;
                text-align: right;
            }
        `;
        document.head.appendChild(this.styles);
    },

    renderScene: function() {
        this.gameContainer.innerHTML = ''; // Clear previous content
        this.gameContainer.className = 'game-area prayer-scene-img-container';

        // Filter Controls Container
        this.elements.controlsContainer = document.createElement('div');
        this.elements.controlsContainer.className = 'filter-controls';

        // Helper to create a slider
        const createSlider = (id, label, min, max, step, value, unit = '') => {
            const div = document.createElement('div');
            const labelEl = document.createElement('label');
            labelEl.htmlFor = id;
            labelEl.textContent = label;
            const inputEl = document.createElement('input');
            inputEl.type = 'range';
            inputEl.id = id;
            inputEl.min = min;
            inputEl.max = max;
            inputEl.step = step;
            inputEl.value = value;
            const valueDisplay = document.createElement('span');
            valueDisplay.id = id + 'Value';
            valueDisplay.textContent = value + unit;

            inputEl.addEventListener('input', () => { // Update display on input
                 valueDisplay.textContent = inputEl.value + unit;
            });

            div.appendChild(labelEl);
            div.appendChild(inputEl);
            div.appendChild(valueDisplay);
            this.elements.controlsContainer.appendChild(div);
            return inputEl;
        };
        
        // Create sliders
        this.elements.contrastSlider = createSlider('psgContrastSlider', 'Contrast:', 0.1, 3, 0.05, this.currentFilterSettings.contrast);
        this.elements.brightnessSlider = createSlider('psgBrightnessSlider', 'Brightness:', 0.1, 3, 0.05, this.currentFilterSettings.brightness);
        this.elements.saturationSlider = createSlider('psgSaturationSlider', 'Saturation:', 0, 3, 0.05, this.currentFilterSettings.saturate);
        this.elements.hueSlider = createSlider('psgHueSlider', 'Hue Rotate:', -180, 180, 1, this.currentFilterSettings.hue, '°');
        this.elements.shadowBlurSlider = createSlider('psgShadowBlurSlider', 'Shadow Blur:', 0, 50, 1, this.currentFilterSettings.shadowBlur, 'px');
        this.elements.shadowAlphaSlider = createSlider('psgShadowAlphaSlider', 'Shadow Alpha:', 0, 1, 0.01, this.currentFilterSettings.shadowA);

        // Shadow Color Picker
        const colorDiv = document.createElement('div');
        const colorLabel = document.createElement('label');
        colorLabel.htmlFor = 'psgShadowColorPicker';
        colorLabel.textContent = 'Shadow Color:';
        this.elements.shadowColorPicker = document.createElement('input');
        this.elements.shadowColorPicker.type = 'color';
        this.elements.shadowColorPicker.id = 'psgShadowColorPicker';
        this.elements.shadowColorPicker.value = this.rgbToHex(this.currentFilterSettings.shadowR, this.currentFilterSettings.shadowG, this.currentFilterSettings.shadowB);
        colorDiv.appendChild(colorLabel);
        colorDiv.appendChild(this.elements.shadowColorPicker);
        this.elements.controlsContainer.appendChild(colorDiv);

        this.gameContainer.appendChild(this.elements.controlsContainer);

        // Image Element
        this.elements.image = document.createElement('img');
        this.elements.image.id = 'prayerImageElement';
        this.elements.image.src = this.imageUrl;
        this.elements.image.alt = 'A sacred image for prayer and contemplation';
        this.elements.image.onerror = () => {
            console.error("PrayerSceneGame: Failed to load image at: " + this.imageUrl);
            if (this.elements.message) {
                this.elements.message.textContent = "Image could not be loaded.";
            }
            const errorText = document.createElement('p');
            errorText.textContent = `Error: Could not load image. Path: ${this.imageUrl}`;
            errorText.style.color = 'red';
            errorText.style.marginTop = '20px';
            this.gameContainer.insertBefore(errorText, this.elements.message || null);
        };
        this.gameContainer.appendChild(this.elements.image);

        // Message
        this.elements.message = document.createElement('p');
        this.elements.message.className = 'prayer-message-img';
        this.elements.message.textContent = '"In stillness, divine beauty unfolds."';
        this.gameContainer.appendChild(this.elements.message);

        // Next Game Button
        this.elements.nextButton = document.createElement('button');
        this.elements.nextButton.className = 'prayer-next-button-img';
        this.elements.nextButton.textContent = 'Continue Journey';
        this.gameContainer.appendChild(this.elements.nextButton);
    },

    initControls: function(settings) {
        // Sliders are initialized with values in renderScene helper
        // Just ensure the span displays are also up-to-date if needed
        document.getElementById('psgContrastSliderValue').textContent = settings.contrast;
        document.getElementById('psgBrightnessSliderValue').textContent = settings.brightness;
        document.getElementById('psgSaturationSliderValue').textContent = settings.saturate;
        document.getElementById('psgHueSliderValue').textContent = settings.hue + '°';
        document.getElementById('psgShadowBlurSliderValue').textContent = settings.shadowBlur + 'px';
        document.getElementById('psgShadowAlphaSliderValue').textContent = settings.shadowA;
        this.elements.shadowColorPicker.value = this.rgbToHex(settings.shadowR, settings.shadowG, settings.shadowB);
    },
    
    rgbToHex: function(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    },

    hexToRgb: function(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },

    setupEventListeners: function() {
        const update = () => {
            this.currentFilterSettings.contrast = parseFloat(this.elements.contrastSlider.value);
            this.currentFilterSettings.brightness = parseFloat(this.elements.brightnessSlider.value);
            this.currentFilterSettings.saturate = parseFloat(this.elements.saturationSlider.value);
            this.currentFilterSettings.hue = parseInt(this.elements.hueSlider.value);
            this.currentFilterSettings.shadowBlur = parseInt(this.elements.shadowBlurSlider.value);
            this.currentFilterSettings.shadowA = parseFloat(this.elements.shadowAlphaSlider.value);
            
            const shadowRgb = this.hexToRgb(this.elements.shadowColorPicker.value);
            if (shadowRgb) {
                this.currentFilterSettings.shadowR = shadowRgb.r;
                this.currentFilterSettings.shadowG = shadowRgb.g;
                this.currentFilterSettings.shadowB = shadowRgb.b;
            }
            this.applyCssVariables(this.currentFilterSettings);
        };

        ['contrastSlider', 'brightnessSlider', 'saturationSlider', 'hueSlider', 'shadowBlurSlider', 'shadowAlphaSlider'].forEach(id => {
            this.elements[id].addEventListener('input', update);
        });
        this.elements.shadowColorPicker.addEventListener('input', update);

        this.elements.nextButton.addEventListener('click', () => {
            console.log("PrayerSceneGame (External Image with Filters): Continue button clicked.");
            if (this.successCallback) {
                this.successCallback({ prayerSceneViewed: true, finalFilters: this.currentFilterSettings });
            }
        });
    },

    destroy: function() {
        console.log("PrayerSceneGame (External Image with Filters): Destroying...");
        const styleElement = document.getElementById('prayer-scene-image-styles');
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            this.styles = null;
        }
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
            this.gameContainer.className = 'game-area';
             // Clear any dynamically set CSS variables on the container
            const propsToClear = [
                '--psg-base-contrast', '--psg-base-brightness', '--psg-base-saturate',
                '--psg-base-hue', '--psg-base-shadow-r', '--psg-base-shadow-g',
                '--psg-base-shadow-b', '--psg-base-shadow-a', '--psg-base-shadow-blur'
            ];
            propsToClear.forEach(prop => this.gameContainer.style.removeProperty(prop));
        }
        this.elements = {};
        console.log("PrayerSceneGame (External Image with Filters): Destroyed.");
    }
};
