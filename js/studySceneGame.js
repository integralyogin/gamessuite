// js/prayerSceneGame.js (Refactored for conciseness and maintainability)

const StudySceneGame = {
    id: 'StudySceneGame',
    gameContainer: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    styles: null,
    elements: {}, // Stores DOM elements

    availableImages: [
        'images/study/study8.jpg', 
        'images/study/study0.jpg', 
        'images/study/study1.jpg', 
        'images/study/study6.jpg', 
        'images/study/study7.jpg', 
        'images/study/study2.jpg', 
	    'images/study/study3.jpg',
	    'images/study/study4.jpg',
	    'images/study/study5.jpg'
    ],
    currentImageIndex: 0,
    imageUrl: '', // Source for the image (local or URL)

    availableQuotes: [""], // Assuming a single empty quote is a placeholder for "no quote"
    currentQuoteIndex: 0,

    _eventListeners: [], // Stores {element, type, handler} for easy removal
    _keydownHandler: null, // Specific handler for document keydown

    animationSettings: {
        baseBrightness: 0.95, baseSaturation: 0.95, baseContrast: 0.97,
        baseHueShift: -0.1, baseScale: 1.25, baseMaskOpaqueStop: 95,
        baseMaskTransparentStop: 95, peakBrightness: 2.02, peakSaturation: 1.12,
        peakContrast: 1.13, peakHueShift: 720, peakScale: 1.44,
        peakMaskOpaqueStop: 88, peakMaskTransparentStop: 88, neutralContrast: 1.0,
        shadowColorBase: 'rgba(0, 0, 0, 0.1)', shadowColorPeak: 'rgba(100, 70, 150, 0.55)',
        shadowBlurBase: '10px', shadowBlurPeak: '30px', shadowOffsetYBase: '1px',
        shadowOffsetYPeak: '3px', shadowOffsetX: '0px', imageOpacity: 1.0,
        imageGrayscale: 0, imageSepia: 0, imageInvert: 0, imageBlur: '0px',
    },
    phaseDurationSeconds: 6, // Default duration for one phase
    totalAnimationDuration: 16, // phaseDurationSeconds * 4

    // --- Initialization and Teardown ---
    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (this.availableImages.length > 0 && !this.imageUrl) {
            this.imageUrl = this.availableImages[this.currentImageIndex];
        } else if (!this.imageUrl) {
            console.warn("PrayerSceneGame: No images available and no initial URL. Using fallback.");
            this.imageUrl = 'images/study/default_placeholder.png';
        }

        let initialPhaseDurationLog;
        let phaseDurationToSet = this.phaseDurationSeconds; // Default

        if (this.sharedData && this.sharedData.breathSpeedSetting) {
            const sharedSpeed = parseFloat(this.sharedData.breathSpeedSetting);
            if (!isNaN(sharedSpeed) && sharedSpeed > 0) {
                phaseDurationToSet = sharedSpeed;
                initialPhaseDurationLog = `Using phase duration from sharedData: ${phaseDurationToSet}s.`;
            } else {
                initialPhaseDurationLog = `Invalid sharedData.breathSpeedSetting. Using default: ${phaseDurationToSet}s.`;
            }
        } else {
            initialPhaseDurationLog = `Using default phase duration: ${phaseDurationToSet}s.`;
        }
        this.phaseDurationSeconds = phaseDurationToSet;
        this.totalAnimationDuration = this.phaseDurationSeconds * 4;
        this.currentQuoteIndex = 0;

        console.log(`PrayerSceneGame: Initializing. ${initialPhaseDurationLog} Total cycle: ${this.totalAnimationDuration}s.`);
        this._injectStyles();
        this.renderScene();
        this._setupAllEventListeners();
    },

    destroy: function() {
        console.log("PrayerSceneGame: Destroying...");
        this._removeAllEvents(); // Removes all listeners added via _addEvent

        const styleElement = document.getElementById('prayer-scene-focused-styles');
        if (styleElement) styleElement.remove();
        this.styles = null;

        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
            this.gameContainer.className = 'game-area';
        }
        this.elements = {};
        console.log("PrayerSceneGame: Destroyed.");
    },

    // --- DOM Manipulation and Rendering ---
    _createElement: function(tag, attributes = {}, children = []) {
        const el = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'textContent' || key === 'innerHTML') el[key] = value;
            else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
            else if (key === 'dataset' && typeof value === 'object') Object.assign(el.dataset, value);
            else if (key === 'className') el.className = value;
            else if (typeof value === 'boolean') { // For attributes like 'disabled', 'selected'
                if (value) el.setAttribute(key, ''); else el.removeAttribute(key);
            }
            else el.setAttribute(key, value);
        }
        children.forEach(child => {
            if (child instanceof Node) el.appendChild(child);
            else el.appendChild(document.createTextNode(String(child)));
        });
        return el;
    },

    _injectStyles: function() {
        const styleId = 'prayer-scene-focused-styles';
        document.getElementById(styleId)?.remove(); // Remove if exists

        this.styles = this._createElement('style', { id: styleId });
        const s = this.animationSettings; // Shorthand

        this.styles.innerHTML = `
            @property --current-mask-opaque-stop { syntax: '<percentage>'; inherits: false; initial-value: ${s.baseMaskOpaqueStop}%; }
            @property --current-mask-transparent-stop { syntax: '<percentage>'; inherits: false; initial-value: ${s.baseMaskTransparentStop}%; }

            .prayer-scene-img-container-focused {
                --base-brightness: ${s.baseBrightness}; --base-saturation: ${s.baseSaturation}; --base-contrast-hold-out: ${s.baseContrast};
                --base-hue-shift: ${s.baseHueShift}deg; --base-scale: ${s.baseScale}; --peak-brightness: ${s.peakBrightness};
                --peak-saturation: ${s.peakSaturation}; --peak-contrast-hold-in: ${s.peakContrast}; --peak-hue-shift: ${s.peakHueShift}deg;
                --peak-scale: ${s.peakScale}; --neutral-contrast: ${s.neutralContrast}; --shadow-color-base: ${s.shadowColorBase};
                --shadow-color-peak: ${s.shadowColorPeak}; --shadow-blur-base: ${s.shadowBlurBase}; --shadow-blur-peak: ${s.shadowBlurPeak};
                --shadow-offset-y-base: ${s.shadowOffsetYBase}; --shadow-offset-y-peak: ${s.shadowOffsetYPeak};
                --shadow-offset-x: ${s.shadowOffsetX}; --image-opacity: ${s.imageOpacity}; --image-grayscale: ${s.imageGrayscale};
                --image-sepia: ${s.imageSepia}; --image-invert: ${s.imageInvert}; --image-blur: ${s.imageBlur};
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                width: 100%; height: 100%; background: radial-gradient(ellipse at center, #1a122c 0%, #040510 85%);
                font-family: 'Georgia', 'Times New Roman', Times, serif; color: #e0e0e0; text-align: center;
                padding: 10px; box-sizing: border-box; border-radius: 8px; overflow: hidden; position: relative;
            }
            .prayer-controls-container { position: absolute; bottom: 15px; right: 15px; z-index: 10; display: flex; flex-direction: column; gap: 10px; align-items: flex-end; }
            .prayer-image-selector-container, .prayer-image-url-container { display: flex; gap: 5px; align-items: center; }
            #prayerImageSelector, #prayerImageUrlInput, #loadPrayerImageUrlButton {
                padding: 8px 12px; border-radius: 4px; border: 1px solid #4a306a; background-color: #2c1d3e;
                color: #f0f0f0; font-family: 'Arial', sans-serif; font-size: 0.9em; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            #prayerImageSelector, #prayerImageUrlInput { max-width: 200px; }
            #prayerImageUrlInput { flex-grow: 1; }
            #prayerImageSelector:focus, #prayerImageUrlInput:focus { outline: 2px solid #5c3d82; border-color: #5c3d82; }
            #prayerImageSelector option { background-color: #2c1d3e; color: #f0f0f0; padding: 5px; }
            #loadPrayerImageUrlButton { cursor: pointer; padding: 8px 15px; }
            #loadPrayerImageUrlButton:hover { background-color: #5c3d82; }

            @keyframes pulseAliveFocused {
                0%, 100% { /* Base state / Hold Out ends */
                    filter: brightness(var(--base-brightness)) saturate(var(--base-saturation)) contrast(var(--base-contrast-hold-out)) hue-rotate(var(--base-hue-shift)) drop-shadow(var(--shadow-offset-x) var(--shadow-offset-y-base) var(--shadow-blur-base) var(--shadow-color-base));
                    transform: scale(var(--base-scale));
                    --current-mask-opaque-stop: ${s.baseMaskOpaqueStop}%; --current-mask-transparent-stop: ${s.baseMaskTransparentStop}%;
                }
                25% { /* Inhale ends */
                    filter: brightness(var(--peak-brightness)) saturate(var(--peak-saturation)) contrast(var(--neutral-contrast)) hue-rotate(var(--peak-hue-shift)) drop-shadow(var(--shadow-offset-x) var(--shadow-offset-y-peak) var(--shadow-blur-peak) var(--shadow-color-peak));
                    transform: scale(var(--peak-scale));
                    --current-mask-opaque-stop: ${s.peakMaskOpaqueStop}%; --current-mask-transparent-stop: ${s.peakMaskTransparentStop}%;
                }
                50% { /* Hold In ends */
                    filter: brightness(var(--peak-brightness)) saturate(var(--peak-saturation)) contrast(var(--peak-contrast-hold-in)) hue-rotate(var(--peak-hue-shift)) drop-shadow(var(--shadow-offset-x) var(--shadow-offset-y-peak) var(--shadow-blur-peak) var(--shadow-color-peak));
                    transform: scale(var(--peak-scale));
                    --current-mask-opaque-stop: ${s.peakMaskOpaqueStop}%; --current-mask-transparent-stop: ${s.peakMaskTransparentStop}%;
                }
                75% { /* Exhale ends */
                    filter: brightness(var(--base-brightness)) saturate(var(--base-saturation)) contrast(var(--neutral-contrast)) hue-rotate(var(--base-hue-shift)) drop-shadow(var(--shadow-offset-x) var(--shadow-offset-y-base) var(--shadow-blur-base) var(--shadow-color-base));
                    transform: scale(var(--base-scale));
                    --current-mask-opaque-stop: ${s.baseMaskOpaqueStop}%; --current-mask-transparent-stop: ${s.baseMaskTransparentStop}%;
                }
            }
            #prayerImageElementFocused {
                display: block; margin-top: 75px; margin-bottom: 75px; border: 4px solid #251838;
                animation-name: pulseAliveFocused; animation-duration: ${this.totalAnimationDuration}s;
                animation-timing-function: ease-in-out; animation-iteration-count: infinite;
                max-width: 75%; max-height: 55vh; object-fit: contain; border-radius: 6px;
                mask-image: radial-gradient(circle, white var(--current-mask-opaque-stop), transparent var(--current-mask-transparent-stop));
                -webkit-mask-image: radial-gradient(circle, white var(--current-mask-opaque-stop), transparent var(--current-mask-transparent-stop));
                will-change: filter, transform, mask-image, -webkit-mask-image, animation-duration;
            }
            .prayer-message-focused {
                font-size: .5em; margin: 2px 0; color: #f0f0f0;
                text-shadow: 1px 1px 8px #000000, 0 0 5px rgba(200, 180, 255, 0.5);
                font-style: italic; font-weight: 300; min-height: 2em; transition: opacity 0.5s ease-in-out;
            }
            #breathingRateDisplay { font-size: 0.5em; color: #c0c0c0; margin: 5px; font-family: 'Arial', sans-serif; }
            .prayer-next-button-focused {
                padding: 12px; background-color: #4a306a; color: #f5f0ff; border: none; border-radius: 25px;
                cursor: pointer; font-size: .7em; font-weight: 400; text-transform: uppercase; letter-spacing: 1.5px;
                transition: background-color 0.3s, transform 0.2s, box-shadow 0.3s;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3); margin-top: 10px;
            }
            .prayer-next-button-focused:hover { background-color: #5c3d82; box-shadow: 0 8px 20px rgba(0,0,0,0.4); transform: translateY(-2px); }
            .prayer-next-button-focused:active { background-color: #3e2857; transform: translateY(0px); box-shadow: 0 3px 10px rgba(0,0,0,0.3); }
        `;
        document.head.appendChild(this.styles);
    },

    renderScene: function() {
        this.gameContainer.innerHTML = '';
        this.gameContainer.className = 'game-area prayer-scene-img-container-focused';
        this.elements = {}; // Reset elements

        const controlsContainer = this._createElement('div', { className: 'prayer-controls-container' });

        if (this.availableImages.length > 0) {
            const selectorOptions = [
                this._createElement('option', { value: "", textContent: "Select Predefined Image", disabled: true, selected: !this.availableImages.includes(this.imageUrl) })
            ];
            this.availableImages.forEach((imgPath, index) => {
                selectorOptions.push(this._createElement('option', {
                    value: index,
                    textContent: this._formatImageDisplayName(imgPath),
                    selected: this.imageUrl === imgPath
                }));
            });
            this.elements.imageSelector = this._createElement('select', { id: 'prayerImageSelector' }, selectorOptions);
            const selectorContainer = this._createElement('div', { className: 'prayer-image-selector-container' }, [this.elements.imageSelector]);
            controlsContainer.appendChild(selectorContainer);
        }

        this.elements.imageUrlInput = this._createElement('input', { type: 'text', id: 'prayerImageUrlInput', placeholder: 'Or paste image URL' });
        this.elements.loadUrlButton = this._createElement('button', { id: 'loadPrayerImageUrlButton', textContent: 'Load' });
        const urlInputContainer = this._createElement('div', { className: 'prayer-image-url-container' }, [this.elements.imageUrlInput, this.elements.loadUrlButton]);
        controlsContainer.appendChild(urlInputContainer);
        this.gameContainer.appendChild(controlsContainer);

        this.elements.image = this._createElement('img', { id: 'prayerImageElementFocused', src: this.imageUrl, alt: 'A sacred image for prayer and contemplation' });
        this.gameContainer.appendChild(this.elements.image);

        this.elements.message = this._createElement('p', { className: 'prayer-message-focused', textContent: this.availableQuotes[this.currentQuoteIndex] });
        this.gameContainer.appendChild(this.elements.message);

        this.elements.breathingRateDisplay = this._createElement('div', { id: 'breathingRateDisplay' });
        this.updateBreathingRateDisplay();
        this.gameContainer.appendChild(this.elements.breathingRateDisplay);

        this.elements.nextButton = this._createElement('button', { className: 'prayer-next-button-focused', textContent: 'Continue Journey' });
        this.gameContainer.appendChild(this.elements.nextButton);
    },

    _formatImageDisplayName: function(imgPath) {
        let displayName = imgPath.substring(imgPath.lastIndexOf('/') + 1);
        displayName = displayName.substring(0, displayName.lastIndexOf('.'));
        displayName = displayName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return displayName.length > 25 ? displayName.substring(0, 22) + "..." : displayName;
    },

    // --- Image and Animation Updates ---
    _updateImageSource: function(newSrc, altText = 'A sacred image for prayer and contemplation') {
        this.imageUrl = newSrc;
        if (this.elements.image) {
            this.elements.image.src = this.imageUrl;
            this.elements.image.alt = altText;
            // Reset error state appearance if any
            if (this.elements.imageUrlInput) this.elements.imageUrlInput.style.borderColor = '#4a306a';
            if (this.elements.message && this.elements.message.dataset.isError) {
                this.elements.message.textContent = this.availableQuotes[this.currentQuoteIndex]; // Restore quote
                delete this.elements.message.dataset.isError;
            }
        }
    },

    _handleImageError: function() {
        console.error("PrayerSceneGame: Failed to load image at: " + this.elements.image.src);
        const originalSrc = this.elements.image.src;
        this._updateImageSource('images/study/default_placeholder.png', "Image failed to load. Check URL or select another.");

        if (this.elements.message) {
            this.elements.message.textContent = `Failed to load: ${originalSrc.substring(originalSrc.lastIndexOf('/')+1)}. Displaying fallback.`;
            this.elements.message.dataset.isError = true; // Mark as error message
        }
        if (this.elements.imageUrlInput && this.elements.imageUrlInput.value === originalSrc) {
            this.elements.imageUrlInput.style.borderColor = 'red';
        }
        if (this.elements.imageSelector) { // Reset selector to default prompt
            this.elements.imageSelector.value = "";
            if (this.elements.imageSelector.firstChild?.disabled) {
                 this.elements.imageSelector.firstChild.selected = true;
            }
        }
    },

    _validateAndLoadImageUrl: function(url) {
        const newUrl = url.trim();
        if (!newUrl) {
            console.log("PrayerSceneGame: URL input is empty.");
            if (this.elements.message && !this.elements.message.dataset.isError) this.elements.message.textContent = "Please enter an image URL.";
            if (this.elements.imageUrlInput) this.elements.imageUrlInput.style.borderColor = 'orange';
            return false;
        }
        if (!/^(https?:\/\/|images\/)/i.test(newUrl)) { // Basic check for http(s) or local 'images/study/'
            console.warn("PrayerSceneGame: Invalid URL or path format for:", newUrl);
            if (this.elements.imageUrlInput) this.elements.imageUrlInput.style.borderColor = 'orange';
            if (this.elements.message && !this.elements.message.dataset.isError) this.elements.message.textContent = "Invalid URL format. Must start with http(s):// or be local like images/study/name.jpg.";
            return false;
        }

        this._updateImageSource(newUrl, 'Image loaded from URL');
        if (this.elements.imageSelector) {
            this.elements.imageSelector.value = ""; // Deselect predefined
            if (this.elements.imageSelector.firstChild?.disabled) {
                this.elements.imageSelector.firstChild.selected = true;
           }
        }
        console.log("PrayerSceneGame: Image changed via URL input to: " + this.imageUrl);
        return true;
    },

    updateBreathingRateDisplay: function() {
        if (this.elements.breathingRateDisplay) {
            this.elements.breathingRateDisplay.textContent =
                `Breath Phase: ${this.phaseDurationSeconds.toFixed(1)}s (Cycle: ${this.totalAnimationDuration.toFixed(1)}s) — Use Arrow Up/Down to adjust`;
        }
    },

    _updateAnimationAndRate: function() {
        this.totalAnimationDuration = this.phaseDurationSeconds * 4;
        if (this.elements.image) {
            this.elements.image.style.animationDuration = this.totalAnimationDuration + 's';
        }
        this.updateBreathingRateDisplay();
        console.log(`PrayerSceneGame: Breath phase duration changed to ${this.phaseDurationSeconds}s. Total cycle: ${this.totalAnimationDuration}s.`);
    },

    // --- Event Handling ---
    _addEvent: function(element, type, handler, options) {
        if (!element) {
            console.warn(`PrayerSceneGame: Attempted to add listener to null element for type ${type}`);
            return null;
        }
        const boundHandler = handler.bind(this);
        element.addEventListener(type, boundHandler, options);
        this._eventListeners.push({ element, type, handler: boundHandler });
        return boundHandler; // Return bound handler if it needs to be stored (e.g. for document keydown)
    },

    _removeAllEvents: function() {
        this._eventListeners.forEach(({ element, type, handler }) => {
            element?.removeEventListener(type, handler);
        });
        this._eventListeners = [];
        if (this._keydownHandler) { // Specifically remove document-level keydown
            document.removeEventListener('keydown', this._keydownHandler);
            this._keydownHandler = null;
        }
    },

    _setupAllEventListeners: function() {
        this._addEvent(this.elements.nextButton, 'click', this._handleNextButtonClick);
        this._addEvent(this.elements.imageSelector, 'change', this._handleImageSelectorChange);
        this._addEvent(this.elements.loadUrlButton, 'click', this._handleLoadUrlButtonClick);
        this._addEvent(this.elements.imageUrlInput, 'keypress', this._handleImageUrlInputKeypress);
        this._addEvent(this.elements.image, 'animationiteration', this._handleAnimationIteration);
        this._addEvent(this.elements.image, 'error', this._handleImageError); // Add error handler for the main image

        // Keyboard listener for breath rate adjustment (document level)
        this._keydownHandler = this._addEvent(document, 'keydown', this._handleDocumentKeyDown);
    },

    _handleNextButtonClick: function() {
        console.log("PrayerSceneGame: Continue button clicked.");
        if (this.successCallback) {
            this.successCallback({
                prayerSceneViewed: true,
                breathDuration: this.totalAnimationDuration,
                phaseDuration: this.phaseDurationSeconds,
                currentImage: this.imageUrl
            });
        }
    },

    _handleImageSelectorChange: function(event) {
        const newIndex = parseInt(event.target.value, 10);
        if (newIndex >= 0 && newIndex < this.availableImages.length) {
            this.currentImageIndex = newIndex;
            this._updateImageSource(this.availableImages[this.currentImageIndex]);
            if (this.elements.imageUrlInput) this.elements.imageUrlInput.value = '';
            console.log("PrayerSceneGame: Image changed via selector to: " + this.imageUrl);
        }
    },

    _handleLoadUrlButtonClick: function() {
        if (this.elements.imageUrlInput) {
            this._validateAndLoadImageUrl(this.elements.imageUrlInput.value);
        }
    },

    _handleImageUrlInputKeypress: function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this._handleLoadUrlButtonClick();
        }
    },

    _handleAnimationIteration: function() {
        if (this.availableQuotes.length > 0) {
            this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.availableQuotes.length;
            if (this.elements.message && !this.elements.message.dataset.isError) { // Don't overwrite error messages
                this.elements.message.style.opacity = 0;
                setTimeout(() => {
                    this.elements.message.textContent = this.availableQuotes[this.currentQuoteIndex];
                    this.elements.message.style.opacity = 1;
                }, 250); // Brief fade effect
            }
        }
    },

    _handleDocumentKeyDown: function(event) { // Renamed from handleKeyDown for clarity
        let rateChanged = false;
        // Using ArrowUp/ArrowDown as per the UI hint.
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.phaseDurationSeconds = Math.min(8, this.phaseDurationSeconds + 0.5); // Max 8s phase
            rateChanged = true;
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.phaseDurationSeconds = Math.max(1, this.phaseDurationSeconds - 0.5); // Min 1s phase
            rateChanged = true;
        }

        if (rateChanged) {
            this._updateAnimationAndRate();
        }
    }
};
