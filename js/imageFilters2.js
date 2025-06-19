// js/imageFilters2.js (Stained Glass Version with External Image, MORE Filter Controls, SVG Distortion, URL Loader, and Duotone)

const ImageFilters2 = {
    id: 'ImageFilters2',
    gameContainer: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    styles: null,
    elements: {
        svgTurbulence: null,
        svgDisplacementMap: null,
        feDuotoneMatrix: null,      // << NEW for Duotone
        urlInput: null,
        loadImageButton: null,
        imageLoadErrorText: null
    },
    imageUrl: 'images/saint_in_prayer/saint-in-prayer0.jpg',

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
        grayscale: 0,
        invert: 0,
        opacity: 1,
        sepia: 0,
        imageBlur: 0,
        distortionScale: 0,
        distortionFrequency: 0.01,
        distortionOctaves: 2,
        distortionSeed: 0,
        // --- Duotone Settings ---
        duotoneColor1: '#0000FF', // Color for dark tones (e.g., blue)
        duotoneColor2: '#FFFF00', // Color for light tones (e.g., yellow)
        duotoneStrength: 0.0,     // 0.0 (no effect) to 1.0 (full effect)
        // --- End Duotone Settings ---
    },

    pulseAnimationFactors: {
        contrastFactor: 1.03,
        brightnessFactor: 1.05,
        saturateFactor: 1.10,
        hueShift: 3,
        shadowAFactor: 1.1,
        shadowBlurAdd: 2,
    },

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;
        this.currentFilterSettings = JSON.parse(JSON.stringify(this.filterSettings));
        console.log(`ImageFilters2: Initializing.`);
        this.injectStyles();
        this.renderScene();
        this.applyCssVariables(this.currentFilterSettings);
        this.setupEventListeners();
        this.initControls(this.currentFilterSettings);
    },

    applyCssVariables: function(settings) {
        const rootStyle = this.gameContainer.style;
        rootStyle.setProperty('--psg-base-contrast', settings.contrast);
        rootStyle.setProperty('--psg-base-brightness', settings.brightness);
        rootStyle.setProperty('--psg-base-saturate', settings.saturate);
        rootStyle.setProperty('--psg-base-hue', settings.hue + 'deg');
        rootStyle.setProperty('--psg-base-shadow-r', settings.shadowR);
        rootStyle.setProperty('--psg-base-shadow-g', settings.shadowG);
        rootStyle.setProperty('--psg-base-shadow-b', settings.shadowB);
        rootStyle.setProperty('--psg-base-shadow-a', settings.shadowA);
        rootStyle.setProperty('--psg-base-shadow-blur', settings.shadowBlur + 'px');
        rootStyle.setProperty('--psg-base-grayscale', settings.grayscale);
        rootStyle.setProperty('--psg-base-invert', settings.invert);
        rootStyle.setProperty('--psg-base-opacity', settings.opacity);
        rootStyle.setProperty('--psg-base-sepia', settings.sepia);
        rootStyle.setProperty('--psg-base-image-blur', settings.imageBlur + 'px');
    },

    // << NEW HELPER FUNCTION for Duotone >>
    calculateDuotoneMatrixValues: function(hexColor1, hexColor2, strength) {
        const c1 = this.hexToRgb(hexColor1);
        const c2 = this.hexToRgb(hexColor2);

        const identityMatrix = [
            1,0,0,0,0, 
            0,1,0,0,0, 
            0,0,1,0,0, 
            0,0,0,1,0
        ];
        // Fallback to identity if colors are invalid or strength is 0
        if (!c1 || !c2 || strength === 0) { 
            return identityMatrix; 
        }

        // Normalize colors to 0-1 range
        const r1 = c1.r / 255, g1 = c1.g / 255, b1 = c1.b / 255;
        const r2 = c2.r / 255, g2 = c2.g / 255, b2 = c2.b / 255;

        // Luminance coefficients for Rec. 709
        const lr = 0.2126, lg = 0.7152, lb = 0.0722;

        // Duotone matrix values (D_matrix) based on luminance mapping
        const D_matrix = [
            lr * (r2 - r1), lg * (r2 - r1), lb * (r2 - r1), 0, r1,
            lr * (g2 - g1), lg * (g2 - g1), lb * (g2 - g1), 0, g1,
            lr * (b2 - b1), lg * (b2 - b1), lb * (b2 - b1), 0, b1,
            0,              0,              0,              1, 0
        ];

        // Interpolate between Identity and Duotone based on strength (s)
        const s = parseFloat(strength);
        const finalMatrix = [];
        for (let i = 0; i < 20; i++) {
            // Ensure values are numbers before toFixed
            const interpolatedValue = (1 - s) * identityMatrix[i] + s * D_matrix[i];
            finalMatrix[i] = parseFloat(interpolatedValue.toFixed(4)); 
        }
        return finalMatrix;
    },
    // << END NEW HELPER FUNCTION >>

    injectStyles: function() {
        const styleId = 'prayer-scene-image-styles';
        if (document.getElementById(styleId)) return;

        this.styles = document.createElement('style');
        this.styles.id = styleId;
        // --- Using your exact CSS from the provided code ---
        this.styles.innerHTML = `
            .prayer-scene-img-container { /* CSS variables are set on gameContainer directly by JS */ }

            @keyframes pulseAlive {
                0%, 100% {
                    filter:
                        url(#svgDistort)
                        contrast(var(--psg-base-contrast))
                        brightness(var(--psg-base-brightness))
                        saturate(var(--psg-base-saturate))
                        hue-rotate(var(--psg-base-hue))
                        grayscale(var(--psg-base-grayscale))
                        invert(var(--psg-base-invert))
                        opacity(var(--psg-base-opacity))
                        sepia(var(--psg-base-sepia))
                        blur(var(--psg-base-image-blur))
                        drop-shadow(
                            0px 0px
                            var(--psg-base-shadow-blur)
                            rgba(var(--psg-base-shadow-r), var(--psg-base-shadow-g), var(--psg-base-shadow-b), var(--psg-base-shadow-a))
                        );
                }
                50% {
                    filter:
                        url(#svgDistort)
                        contrast(calc(var(--psg-base-contrast) * ${this.pulseAnimationFactors.contrastFactor}))
                        brightness(calc(var(--psg-base-brightness) * ${this.pulseAnimationFactors.brightnessFactor}))
                        saturate(calc(var(--psg-base-saturate) * ${this.pulseAnimationFactors.saturateFactor}))
                        hue-rotate(calc(var(--psg-base-hue) + ${this.pulseAnimationFactors.hueShift}deg))
                        grayscale(var(--psg-base-grayscale))
                        invert(var(--psg-base-invert))
                        opacity(var(--psg-base-opacity))
                        sepia(var(--psg-base-sepia))
                        blur(var(--psg-base-image-blur))
                        drop-shadow(
                            0px 0px
                            calc(var(--psg-base-shadow-blur) + ${this.pulseAnimationFactors.shadowBlurAdd}px)
                            rgba(var(--psg-base-shadow-r), var(--psg-base-shadow-g), var(--psg-base-shadow-b), calc(var(--psg-base-shadow-a) * ${this.pulseAnimationFactors.shadowAFactor}))
                        );
                }
            }

            .prayer-scene-img-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                width: 100%;
                height: 100%;
                background: radial-gradient(ellipse at center, #2a1f3d 0%, #0c0814 75%);
                font-family: 'Georgia', 'Times New Roman', Times, serif;
                color: #f0f0f0;
                text-align: center;
                padding: 5px;
                box-sizing: border-box;
                border-radius: 8px;
                overflow: auto;
            }

            /* Styles for URL Loader */
            .image-url-loader {
                display: flex;
                align-items: center;
                gap: 8px; 
                margin-bottom: 12px; 
                padding: 8px;
                background-color: rgba(0,0,0,0.2); 
                border-radius: 4px;
                width: 100%;
                max-width: 850px; 
                box-sizing: border-box;
            }
            .image-url-loader input[type="text"] {
                flex-grow: 1;
                padding: 7px 10px; 
                border-radius: 3px;
                border: 1px solid #555; 
                background-color: #1a1a1a; 
                color: #e0e0e0;
                font-size: 0.85em;
            }
            .image-url-loader button {
                padding: 7px 12px; 
                background-color: #4a3860; 
                color: #e8e0f0;
                border: 1px solid #6a508a;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.85em;
                transition: background-color 0.2s;
                flex-shrink: 0; 
            }
            .image-url-loader button:hover {
                background-color: #5a4870;
            }
            .image-load-error-message {
                color: #ff9090;
                font-size: 0.8em;
                margin-left: 8px;
                white-space: nowrap; 
                overflow: hidden;
                text-overflow: ellipsis;
                display: none; 
                flex-shrink: 1; 
            }

            #prayerImageElement {
                display: block;
                margin-top: 10px; 
                margin-bottom: 10px;
                border: 3px solid #302045;
                animation: pulseAlive 4s ease-in-out infinite;
                max-width: 90%;
                max-height: calc(100vh - 280px); /* MAY NEED ADJUSTMENT if controls grow */
                min-height: 100px; 
                object-fit: contain;
                border-radius: 4px;
                box-shadow: inset 0 0 30px rgba(0,0,0,0.4), 0 0 15px rgba(60,40,90,0.4);
            }
            .prayer-message-img {
                font-size: 1.3em;
                margin-bottom: 10px;
                color: #f8f8f8;
                text-shadow: 1px 1px 5px #000000, 0 0 3px #d8d8ff;
                font-style: italic;
            }
            .prayer-next-button-img {
                padding: 10px 25px;
                background-color: #5a407a;
                color: #faf5ff;
                border: 1px solid #8a70aa;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1em;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                transition: background-color 0.3s, transform 0.1s, box-shadow 0.3s;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                margin-top: 5px;
            }
            .prayer-next-button-img:hover {
                background-color: #705098;
                border-color: #aa90ca;
                box-shadow: 0 6px 12px rgba(0,0,0,0.4);
                transform: translateY(-1px);
            }
            .prayer-next-button-img:active {
                background-color: #4a306a;
                transform: translateY(0px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .filter-controls {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 8px 12px;
                padding: 8px;
                background-color: rgba(0,0,0,0.25);
                border-radius: 5px;
                margin-bottom: 10px;
                width: 100%;
                max-width: 850px;
                box-sizing: border-box;
            }
            .filter-controls > div { /* This styles the container for each label-input-span group */
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 110px;
            }
            .filter-controls label {
                font-size: 0.85em;
                margin-bottom: 2px;
                color: #c0c0c0;
            }
            .filter-controls input[type="range"] {
                width: 95px;
                height: 18px;
            }
            .filter-controls input[type="color"] { /* General style for ALL color pickers */
                width: 50px; /* Adjusted for better visibility */
                height: 25px; /* Adjusted for better visibility */
                padding: 0;
                border: 1px solid #444;
                margin-top: 2px; /* Space between label and color picker */
            }
            .filter-controls span { /* For slider value display */
                font-size: 0.75em;
                color: #999;
                min-width: 35px;
                text-align: center;
                margin-top: 1px;
            }
        `;
        // --- End of your exact CSS ---
        document.head.appendChild(this.styles);
    },

    renderScene: function() {
        this.gameContainer.innerHTML = '';
        this.gameContainer.className = 'game-area prayer-scene-img-container';

        // URL Loader (from your provided code)
        const urlLoaderContainer = document.createElement('div');
        urlLoaderContainer.className = 'image-url-loader';
        this.elements.urlInput = document.createElement('input');
        this.elements.urlInput.type = 'text';
        this.elements.urlInput.placeholder = 'Enter image URL and press Enter or click Load';
        this.elements.urlInput.value = this.imageUrl;
        this.elements.loadImageButton = document.createElement('button');
        this.elements.loadImageButton.textContent = 'Load';
        this.elements.imageLoadErrorText = document.createElement('span');
        this.elements.imageLoadErrorText.className = 'image-load-error-message';
        urlLoaderContainer.appendChild(this.elements.urlInput);
        urlLoaderContainer.appendChild(this.elements.loadImageButton);
        urlLoaderContainer.appendChild(this.elements.imageLoadErrorText);
        this.gameContainer.appendChild(urlLoaderContainer);

        // SVG Filter Definition
        const svgNS = "http://www.w3.org/2000/svg";
        const svgContainer = document.createElementNS(svgNS, "svg");
        svgContainer.id = 'ImageFilters2SVGContainer';
        svgContainer.style.position = 'absolute'; svgContainer.style.width = '0'; svgContainer.style.height = '0'; svgContainer.style.overflow = 'hidden';
        
        const filter = document.createElementNS(svgNS, "filter");
        filter.id = 'svgDistort';

        this.elements.svgTurbulence = document.createElementNS(svgNS, "feTurbulence");
        this.elements.svgTurbulence.setAttribute('type', 'fractalNoise');
        this.elements.svgTurbulence.setAttribute('baseFrequency', this.currentFilterSettings.distortionFrequency.toString());
        this.elements.svgTurbulence.setAttribute('numOctaves', this.currentFilterSettings.distortionOctaves.toString());
        this.elements.svgTurbulence.setAttribute('seed', this.currentFilterSettings.distortionSeed.toString());
        this.elements.svgTurbulence.setAttribute('result', 'turbulenceOutput'); // Explicit result for chaining
        
        this.elements.svgDisplacementMap = document.createElementNS(svgNS, "feDisplacementMap");
        // Set 'in' for displacement map if SourceGraphic is not desired after a previous filter.
        // Here, SourceGraphic is fine if turbulence is just for the map.
        // If turbulence was meant to be visible first, chain it.
        // For now, assuming displacement map acts on original SourceGraphic perturbed by turbulence map.
        this.elements.svgDisplacementMap.setAttribute('in', 'SourceGraphic'); 
        this.elements.svgDisplacementMap.setAttribute('in2', 'turbulenceOutput');
        this.elements.svgDisplacementMap.setAttribute('scale', this.currentFilterSettings.distortionScale.toString());
        this.elements.svgDisplacementMap.setAttribute('xChannelSelector', 'R');
        this.elements.svgDisplacementMap.setAttribute('yChannelSelector', 'G');
        this.elements.svgDisplacementMap.setAttribute('result', 'displacementOutput'); // Explicit result for chaining

        // << NEW feColorMatrix for Duotone >>
        this.elements.feDuotoneMatrix = document.createElementNS(svgNS, "feColorMatrix");
        this.elements.feDuotoneMatrix.setAttribute('in', 'displacementOutput'); // Input from the displacement map
        this.elements.feDuotoneMatrix.setAttribute('type', 'matrix');
        const initialMatrixValues = this.calculateDuotoneMatrixValues(
            this.currentFilterSettings.duotoneColor1,
            this.currentFilterSettings.duotoneColor2,
            this.currentFilterSettings.duotoneStrength
        );
        this.elements.feDuotoneMatrix.setAttribute('values', initialMatrixValues.join(' '));
        // The result of this feColorMatrix will be the final output of the #svgDistort filter if it's the last one listed here.

        filter.appendChild(this.elements.svgTurbulence);
        filter.appendChild(this.elements.svgDisplacementMap);
        filter.appendChild(this.elements.feDuotoneMatrix); // Add duotone to the SVG filter chain
        
        svgContainer.appendChild(filter);
        this.gameContainer.appendChild(svgContainer);

        // Filter Controls Container
        this.elements.controlsContainer = document.createElement('div');
        this.elements.controlsContainer.className = 'filter-controls';

        const createSlider = (id, label, min, max, step, value, unit = '', displayPrecision = -1) => {
            const div = document.createElement('div');
            const labelEl = document.createElement('label');
            labelEl.htmlFor = id; labelEl.textContent = label;
            const inputEl = document.createElement('input');
            inputEl.type = 'range'; inputEl.id = id; inputEl.min = min; inputEl.max = max; inputEl.step = step; inputEl.value = value;
            const valueDisplay = document.createElement('span');
            valueDisplay.id = id + 'Value';
            let prec = 0;
            if (displayPrecision !== -1) { prec = displayPrecision; }
            else { if (step < 1 && step > 0) { const s = step.toString(); prec = s.includes('.') ? s.split('.')[1].length : 2; } }
            valueDisplay.textContent = parseFloat(value).toFixed(prec) + unit;
            inputEl.addEventListener('input', () => { valueDisplay.textContent = parseFloat(inputEl.value).toFixed(prec) + unit; });
            div.appendChild(labelEl); div.appendChild(inputEl); div.appendChild(valueDisplay);
            this.elements.controlsContainer.appendChild(div);
            this.elements[id.replace('psg','').charAt(0).toLowerCase() + id.slice(4)] = inputEl; // Store direct ref if not already done
            return inputEl;
        };
        
        // << NEW createColorPicker helper >>
        const createColorPicker = (id, labelText, defaultValue) => {
            const div = document.createElement('div'); // Each color picker in its own div for layout
            const labelEl = document.createElement('label');
            labelEl.htmlFor = id;
            labelEl.textContent = labelText;
            const inputEl = document.createElement('input');
            inputEl.type = 'color';
            inputEl.id = id;
            inputEl.value = defaultValue;
            // Styling for color picker itself is now in CSS via .filter-controls input[type="color"]
            div.appendChild(labelEl);
            div.appendChild(inputEl);
            this.elements.controlsContainer.appendChild(div);
            this.elements[id.replace('psg','').charAt(0).toLowerCase() + id.slice(4)] = inputEl; // Store direct ref
            return inputEl;
        };

        // Existing Sliders (from your provided code)
        this.elements.contrastSlider = createSlider('psgContrastSlider', 'Contrast:', 0.1, 3, 0.05, this.currentFilterSettings.contrast);
        this.elements.brightnessSlider = createSlider('psgBrightnessSlider', 'Brightness:', 0.1, 3, 0.05, this.currentFilterSettings.brightness);
        this.elements.saturationSlider = createSlider('psgSaturationSlider', 'Saturation:', 0, 3, 0.05, this.currentFilterSettings.saturate);
        this.elements.hueSlider = createSlider('psgHueSlider', 'Hue:', -180, 180, 1, this.currentFilterSettings.hue, '°');
        this.elements.grayscaleSlider = createSlider('psgGrayscaleSlider', 'Grayscale:', 0, 1, 0.01, this.currentFilterSettings.grayscale);
        this.elements.invertSlider = createSlider('psgInvertSlider', 'Invert:', 0, 1, 0.01, this.currentFilterSettings.invert);
        this.elements.opacitySlider = createSlider('psgOpacitySlider', 'Opacity:', 0, 1, 0.01, this.currentFilterSettings.opacity);
        this.elements.sepiaSlider = createSlider('psgSepiaSlider', 'Sepia:', 0, 1, 0.01, this.currentFilterSettings.sepia);
        this.elements.imageBlurSlider = createSlider('psgImageBlurSlider', 'Image Blur:', 0, 20, 0.5, this.currentFilterSettings.imageBlur, 'px');
        this.elements.distortionScaleSlider = createSlider('psgDistortionScaleSlider', 'Distort Scale:', 0, 100, 1, this.currentFilterSettings.distortionScale, 'px', 0);
        this.elements.distortionFrequencySlider = createSlider('psgDistortionFrequencySlider', 'Distort Freq:', 0.001, 0.2, 0.001, this.currentFilterSettings.distortionFrequency, '', 3);
        this.elements.distortionOctavesSlider = createSlider('psgDistortionOctavesSlider', 'Distort Octaves:', 1, 10, 1, this.currentFilterSettings.distortionOctaves, '', 0);
        this.elements.distortionSeedSlider = createSlider('psgDistortionSeedSlider', 'Distort Seed:', 0, 100, 1, this.currentFilterSettings.distortionSeed, '', 0);
        
        // << NEW Duotone Controls >>
        this.elements.duotoneStrengthSlider = createSlider('psgDuotoneStrengthSlider', 'Duotone Str:', 0, 1, 0.01, this.currentFilterSettings.duotoneStrength, '', 2);
        this.elements.duotoneColor1Picker = createColorPicker('psgDuotoneColor1Picker', 'Duotone Dark:', this.currentFilterSettings.duotoneColor1);
        this.elements.duotoneColor2Picker = createColorPicker('psgDuotoneColor2Picker', 'Duotone Light:', this.currentFilterSettings.duotoneColor2);

        // Shadow Sliders & Picker (from your provided code)
        this.elements.shadowBlurSlider = createSlider('psgShadowBlurSlider', 'Shadow Blur:', 0, 50, 1, this.currentFilterSettings.shadowBlur, 'px');
        this.elements.shadowAlphaSlider = createSlider('psgShadowAlphaSlider', 'Shadow Alpha:', 0, 1, 0.01, this.currentFilterSettings.shadowA);
        // Shadow Color Picker (using createColorPicker for consistency, or keep your original)
        // Using your original approach for shadow color picker for now:
        const shadowColorDiv = document.createElement('div');
        const shadowColorLabel = document.createElement('label'); shadowColorLabel.htmlFor = 'psgShadowColorPicker'; shadowColorLabel.textContent = 'Shadow Color:';
        this.elements.shadowColorPicker = document.createElement('input'); this.elements.shadowColorPicker.type = 'color'; this.elements.shadowColorPicker.id = 'psgShadowColorPicker';
        this.elements.shadowColorPicker.value = this.rgbToHex(this.currentFilterSettings.shadowR, this.currentFilterSettings.shadowG, this.currentFilterSettings.shadowB);
        shadowColorDiv.appendChild(shadowColorLabel); shadowColorDiv.appendChild(this.elements.shadowColorPicker);
        this.elements.controlsContainer.appendChild(shadowColorDiv);
        
        this.gameContainer.appendChild(this.elements.controlsContainer);

        // Image Element, Message, Next Button (from your provided code)
        this.elements.image = document.createElement('img');
        this.elements.image.id = 'prayerImageElement';
        this.elements.image.alt = 'A sacred image for prayer and contemplation';
        this.elements.image.onerror = () => {
            const errorMsg = "Error: Invalid URL or CORS issue loading: " + this.elements.image.src.substring(0, 100) + "...";
            console.error(errorMsg);
            this.elements.image.alt = 'Error loading image. Check URL/CORS.';
            if (this.elements.imageLoadErrorText) {
                this.elements.imageLoadErrorText.textContent = 'Load Error. Check console.';
                this.elements.imageLoadErrorText.style.display = 'inline';
            }
            if (this.failureCallback) this.failureCallback("Image load error: " + this.elements.image.src);
        };
        this.elements.image.onload = () => {
            if (this.elements.imageLoadErrorText) {
                this.elements.imageLoadErrorText.textContent = '';
                this.elements.imageLoadErrorText.style.display = 'none';
            }
            this.elements.image.alt = 'A sacred image for prayer and contemplation';
        };
        this.elements.image.src = this.imageUrl;
        this.gameContainer.appendChild(this.elements.image);

        this.elements.message = document.createElement('p');
        this.elements.message.className = 'prayer-message-img';
        this.elements.message.textContent = '"In stillness, divine beauty unfolds."';
        this.gameContainer.appendChild(this.elements.message);
        this.elements.nextButton = document.createElement('button');
        this.elements.nextButton.className = 'prayer-next-button-img';
        this.elements.nextButton.textContent = 'Continue Journey';
        this.gameContainer.appendChild(this.elements.nextButton);
    },

    initControls: function(settings) {
        const updateDisplay = (id, value, unit = '', precision = -1) => {
            const el = document.getElementById(id + 'Value');
            if (el) {
                let displayValueText;
                let effectivePrecision = precision;
                if (precision === -1) { 
                    const sliderEl = document.getElementById(id);
                    if (sliderEl && sliderEl.step) {
                        const step = parseFloat(sliderEl.step);
                        if (step < 1 && step > 0) { const stepStr = step.toString(); effectivePrecision = stepStr.includes('.') ? stepStr.split('.')[1].length : 2; }
                        else { effectivePrecision = 0; }
                    } else { effectivePrecision = (value.toString().includes('.')) ? Math.min(value.toString().split('.')[1].length, 3) : 0;}
                }
                displayValueText = parseFloat(value).toFixed(effectivePrecision);
                el.textContent = displayValueText + unit;
            }
        };
        
        updateDisplay('psgContrastSlider', settings.contrast, '', 2);
        updateDisplay('psgBrightnessSlider', settings.brightness, '', 2);
        updateDisplay('psgSaturationSlider', settings.saturate, '', 2);
        updateDisplay('psgHueSlider', settings.hue, '°', 0);
        updateDisplay('psgGrayscaleSlider', settings.grayscale, '', 2);
        updateDisplay('psgInvertSlider', settings.invert, '', 2);
        updateDisplay('psgOpacitySlider', settings.opacity, '', 2);
        updateDisplay('psgSepiaSlider', settings.sepia, '', 2);
        updateDisplay('psgImageBlurSlider', settings.imageBlur, 'px', 1);
        updateDisplay('psgShadowBlurSlider', settings.shadowBlur, 'px', 0);
        updateDisplay('psgShadowAlphaSlider', settings.shadowA, '', 2);
        updateDisplay('psgDistortionScaleSlider', settings.distortionScale, 'px', 0);
        updateDisplay('psgDistortionFrequencySlider', settings.distortionFrequency, '', 3);
        updateDisplay('psgDistortionOctavesSlider', settings.distortionOctaves, '', 0);
        updateDisplay('psgDistortionSeedSlider', settings.distortionSeed, '', 0);
        // << NEW for Duotone >>
        updateDisplay('psgDuotoneStrengthSlider', settings.duotoneStrength, '', 2);
        
        this.elements.shadowColorPicker.value = this.rgbToHex(settings.shadowR, settings.shadowG, settings.shadowB);
    },
    
    rgbToHex: function(r, g, b) { return "#" + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1).toUpperCase(); },
    hexToRgb: function(hex) { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? {r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)} : null; },

    setupEventListeners: function() {
        const updateAll = () => { 
            this.currentFilterSettings.contrast = parseFloat(this.elements.contrastSlider.value);
            this.currentFilterSettings.brightness = parseFloat(this.elements.brightnessSlider.value);
            this.currentFilterSettings.saturate = parseFloat(this.elements.saturationSlider.value);
            this.currentFilterSettings.hue = parseInt(this.elements.hueSlider.value);
            this.currentFilterSettings.grayscale = parseFloat(this.elements.grayscaleSlider.value);
            this.currentFilterSettings.invert = parseFloat(this.elements.invertSlider.value);
            this.currentFilterSettings.opacity = parseFloat(this.elements.opacitySlider.value);
            this.currentFilterSettings.sepia = parseFloat(this.elements.sepiaSlider.value);
            this.currentFilterSettings.imageBlur = parseFloat(this.elements.imageBlurSlider.value);
            this.currentFilterSettings.shadowBlur = parseInt(this.elements.shadowBlurSlider.value);
            this.currentFilterSettings.shadowA = parseFloat(this.elements.shadowAlphaSlider.value);
            const shadowRgb = this.hexToRgb(this.elements.shadowColorPicker.value);
            if (shadowRgb) { this.currentFilterSettings.shadowR = shadowRgb.r; this.currentFilterSettings.shadowG = shadowRgb.g; this.currentFilterSettings.shadowB = shadowRgb.b; }
            this.currentFilterSettings.distortionScale = parseFloat(this.elements.distortionScaleSlider.value);
            this.currentFilterSettings.distortionFrequency = parseFloat(this.elements.distortionFrequencySlider.value);
            this.currentFilterSettings.distortionOctaves = parseInt(this.elements.distortionOctavesSlider.value);
            this.currentFilterSettings.distortionSeed = parseInt(this.elements.distortionSeedSlider.value);

            // << NEW for Duotone >>
            this.currentFilterSettings.duotoneColor1 = this.elements.duotoneColor1Picker.value;
            this.currentFilterSettings.duotoneColor2 = this.elements.duotoneColor2Picker.value;
            this.currentFilterSettings.duotoneStrength = parseFloat(this.elements.duotoneStrengthSlider.value);

            // Update Distortion SVG
            if (this.elements.svgTurbulence) {
                this.elements.svgTurbulence.setAttribute('baseFrequency', this.currentFilterSettings.distortionFrequency.toString());
                this.elements.svgTurbulence.setAttribute('numOctaves', this.currentFilterSettings.distortionOctaves.toString());
                this.elements.svgTurbulence.setAttribute('seed', this.currentFilterSettings.distortionSeed.toString());
            }
            if (this.elements.svgDisplacementMap) {
                this.elements.svgDisplacementMap.setAttribute('scale', this.currentFilterSettings.distortionScale.toString());
            }
            // << NEW Update Duotone Matrix >>
            if (this.elements.feDuotoneMatrix) {
                const matrixValues = this.calculateDuotoneMatrixValues(
                    this.currentFilterSettings.duotoneColor1,
                    this.currentFilterSettings.duotoneColor2,
                    this.currentFilterSettings.duotoneStrength
                );
                this.elements.feDuotoneMatrix.setAttribute('values', matrixValues.join(' '));
            }
            
            this.applyCssVariables(this.currentFilterSettings);
        };

        const sliderIds = [
            'contrastSlider', 'brightnessSlider', 'saturationSlider', 'hueSlider',
            'grayscaleSlider', 'invertSlider', 'opacitySlider', 'sepiaSlider', 'imageBlurSlider',
            'shadowBlurSlider', 'shadowAlphaSlider',
            'distortionScaleSlider', 'distortionFrequencySlider', 'distortionOctavesSlider', 'distortionSeedSlider',
            'duotoneStrengthSlider' // << NEW Duotone Slider ID >>
        ];
        sliderIds.forEach(baseId => {
             // Access elements like this.elements.contrastSlider, not this.elements['psgContrastSlider']
            const elementKey = baseId.replace('psg','').charAt(0).toLowerCase() + baseId.slice(4);
            if (this.elements[elementKey]) { 
                this.elements[elementKey].addEventListener('input', updateAll); 
            } else { 
                // Check if it was stored with 'psg' prefix if the above failed (though createSlider aims to store without)
                if (this.elements[baseId]) {
                     this.elements[baseId].addEventListener('input', updateAll); 
                } else {
                    console.warn(`Slider element for ${baseId} (or ${elementKey}) not found during event listener setup.`); 
                }
            }
        });
        if (this.elements.shadowColorPicker) { this.elements.shadowColorPicker.addEventListener('input', updateAll); }
        // << NEW Duotone Color Picker Listeners >>
        if (this.elements.duotoneColor1Picker) { this.elements.duotoneColor1Picker.addEventListener('input', updateAll); }
        if (this.elements.duotoneColor2Picker) { this.elements.duotoneColor2Picker.addEventListener('input', updateAll); }


        // Event listener for the Load Image button (from your provided code)
        const loadImageFromInput = () => {
            const newImageUrl = this.elements.urlInput.value.trim();
            if (newImageUrl) {
                this.imageUrl = newImageUrl; 
                if (this.elements.imageLoadErrorText) {
                    this.elements.imageLoadErrorText.textContent = '';
                    this.elements.imageLoadErrorText.style.display = 'none';
                }
                this.elements.image.src = newImageUrl;
            } else {
                if (this.elements.imageLoadErrorText) {
                    this.elements.imageLoadErrorText.textContent = 'Please enter an image URL.';
                    this.elements.imageLoadErrorText.style.display = 'inline';
                }
                console.warn("Image URL input is empty.");
            }
        };

        if (this.elements.loadImageButton) {
            this.elements.loadImageButton.addEventListener('click', loadImageFromInput);
        }
        if (this.elements.urlInput) {
            this.elements.urlInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    loadImageFromInput();
                }
            });
        }

        this.elements.nextButton.addEventListener('click', () => {
            if (this.successCallback) { this.successCallback({ prayerSceneViewed: true, finalFilters: this.currentFilterSettings }); }
        });
    },

    destroy: function() {
        console.log("ImageFilters2: Destroying...");
        const styleElement = document.getElementById('prayer-scene-image-styles');
        if (styleElement && styleElement.parentNode) { styleElement.parentNode.removeChild(styleElement); this.styles = null; }
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
            this.gameContainer.className = 'game-area';
            const propsToClear = [
                '--psg-base-contrast', '--psg-base-brightness', '--psg-base-saturate',
                '--psg-base-hue', '--psg-base-shadow-r', '--psg-base-shadow-g',
                '--psg-base-shadow-b', '--psg-base-shadow-a', '--psg-base-shadow-blur',
                '--psg-base-grayscale', '--psg-base-invert', '--psg-base-opacity',
                '--psg-base-sepia', '--psg-base-image-blur'
            ];
            propsToClear.forEach(prop => this.gameContainer.style.removeProperty(prop));
        }
        this.elements = { 
            svgTurbulence: null, svgDisplacementMap: null, feDuotoneMatrix: null,
            urlInput: null, loadImageButton: null, imageLoadErrorText: null 
        }; 
        console.log("ImageFilters2: Destroyed.");
    }
};
