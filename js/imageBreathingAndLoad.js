// js/prayerSceneGame.js (Focused Breathing with Smooth @property Mask Animation, Image Selector, URL Input, Cycling Quotes, and Adjustable Breathing Rate)

const PrayerSceneGame = {
    id: 'PrayerSceneGame',
    gameContainer: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    styles: null,
    elements: {}, // Will store image, message, button, imageSelector, imageUrlInput, loadUrlButton, breathingRateDisplay, and handlers

    availableImages: [
        'images/saint-in-prayer0.jpg',
        'images/saint-in-prayer11.jpg',
        'images/saint-in-prayer4.jpg',
        'images/saint-in-prayer8.jpg',
        'images/saint-in-prayer10.jpg',
        'images/saint-in-prayer3.jpg',
        'images/saint-in-prayer1.jpg',
        'images/saint-in-prayer2.jpg',
        'images/saint-in-prayer5.jpg',
        'images/saint-in-prayer6.jpg',
        'images/saint-in-prayer9.jpg',
        'images/saint-in-prayer12.jpg',
        'images/saint-in-prayer13.jpg',
        'images/saint-in-prayer14.jpg',
        'images/saint-in-prayer15.jpg',
        'images/saint-in-prayer7.jpg'
        // Add more image paths here as needed
    ],
    currentImageIndex: 0,
    imageUrl: '', // This will hold the source for the image, whether local or URL

    availableQuotes: [
""
    ],
    currentQuoteIndex: 0,

    // Event Handlers storage
    _animationIterationHandler: null,
    _nextButtonClickHandler: null,
    _imageSelectorChangeHandler: null,
    _loadUrlButtonClickHandler: null,
    _imageUrlInputKeypressHandler: null, // For 'Enter' key on URL input
    _keydownHandler: null, // For adjusting breath rate

    animationSettings: { // These are base visual settings, duration is now separate
        baseBrightness: 0.95,
        baseSaturation: 0.95,
        baseContrast: 0.97,
        baseHueShift: -0.1,
        baseScale: 1.25,
        baseMaskOpaqueStop: 95,
        baseMaskTransparentStop: 95,

        peakBrightness: 2.02,
        peakSaturation: 1.12,
        peakContrast: 1.13,
        peakHueShift: 580,
        peakScale: 1.44,
        peakMaskOpaqueStop: 88,
        peakMaskTransparentStop: 88,

        neutralContrast: 1.0,

        shadowColorBase: 'rgba(0, 0, 0, 0.1)',
        shadowColorPeak: 'rgba(100, 70, 150, 0.55)',
        shadowBlurBase: '10px',
        shadowBlurPeak: '30px',
        shadowOffsetYBase: '1px',
        shadowOffsetYPeak: '3px',
        shadowOffsetX: '0px',

        imageOpacity: 1.0,
        imageGrayscale: 0,
        imageSepia: 0,
        imageInvert: 0,
        imageBlur: '0px',
    },
    phaseDurationSeconds: 4, // Default duration for one phase (e.g., inhale) in seconds
    totalAnimationDuration: 16, // Will be phaseDurationSeconds * 4

    init: function(container, successCallback, failureCallback, sharedData) {
        this.gameContainer = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        if (this.availableImages.length > 0) {
            this.imageUrl = this.availableImages[this.currentImageIndex];
        } else {
            console.warn("PrayerSceneGame: No images available. Using fallback or waiting for URL input.");
            this.imageUrl = 'images/default_placeholder.png';
        }

        // Set initial phase duration: use sharedData if available, otherwise use default
        let initialPhaseDurationLog = `Using default phase duration: ${this.phaseDurationSeconds}s.`;
        if (this.sharedData && this.sharedData.breathSpeedSetting) {
            const sharedSpeed = parseFloat(this.sharedData.breathSpeedSetting);
            if (!isNaN(sharedSpeed) && sharedSpeed > 0) {
                this.phaseDurationSeconds = sharedSpeed;
                initialPhaseDurationLog = `Using phase duration from sharedData: ${this.phaseDurationSeconds}s.`;
            } else {
                initialPhaseDurationLog = `Invalid sharedData.breathSpeedSetting. Using default: ${this.phaseDurationSeconds}s.`;
            }
        }
        
        this.totalAnimationDuration = this.phaseDurationSeconds * 4;
        this.currentQuoteIndex = 0; // Ensure quotes start from the beginning

        console.log(`PrayerSceneGame (Focused Breathing): Initializing. ${initialPhaseDurationLog} Total cycle: ${this.totalAnimationDuration}s.`);
        this.injectStyles();
        this.renderScene();
        this.setupEventListeners();
    },

    injectStyles: function() {
        const styleId = 'prayer-scene-focused-styles';
        if (document.getElementById(styleId)) {
            document.getElementById(styleId).remove();
        }

        this.styles = document.createElement('style');
        this.styles.id = styleId;
        const settings = this.animationSettings;

        this.styles.innerHTML = `
            /* CSS Houdini @property definitions */
            @property --current-mask-opaque-stop {
                syntax: '<percentage>';
                inherits: false;
                initial-value: ${settings.baseMaskOpaqueStop}%;
            }
            @property --current-mask-transparent-stop {
                syntax: '<percentage>';
                inherits: false;
                initial-value: ${settings.baseMaskTransparentStop}%;
            }

            .prayer-scene-img-container-focused {
                --base-brightness: ${settings.baseBrightness};
                --base-saturation: ${settings.baseSaturation};
                --base-contrast-hold-out: ${settings.baseContrast};
                --base-hue-shift: ${settings.baseHueShift}deg;
                --base-scale: ${settings.baseScale};
                --peak-brightness: ${settings.peakBrightness};
                --peak-saturation: ${settings.peakSaturation};
                --peak-contrast-hold-in: ${settings.peakContrast};
                --peak-hue-shift: ${settings.peakHueShift}deg;
                --peak-scale: ${settings.peakScale};
                --neutral-contrast: ${settings.neutralContrast};
                --shadow-color-base: ${settings.shadowColorBase};
                --shadow-color-peak: ${settings.shadowColorPeak};
                --shadow-blur-base: ${settings.shadowBlurBase};
                --shadow-blur-peak: ${settings.shadowBlurPeak};
                --shadow-offset-y-base: ${settings.shadowOffsetYBase};
                --shadow-offset-y-peak: ${settings.shadowOffsetYPeak};
                --shadow-offset-x: ${settings.shadowOffsetX};
                --image-opacity: ${settings.imageOpacity};
                --image-grayscale: ${settings.imageGrayscale};
                --image-sepia: ${settings.imageSepia};
                --image-invert: ${settings.imageInvert};
                --image-blur: ${settings.imageBlur};
                
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                background: radial-gradient(ellipse at center, #1a122c 0%, #080510 85%);
                font-family: 'Georgia', 'Times New Roman', Times, serif;
                color: #e0e0e0;
                text-align: center;
                padding: 10px; /* Reduced padding a bit for more space */
                box-sizing: border-box;
                border-radius: 8px;
                overflow: hidden;
                position: relative;
            }

            .prayer-controls-container {
                position: absolute;
                top: 15px;
                right: 15px;
                z-index: 10;
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: flex-end;
            }

            .prayer-image-selector-container, .prayer-image-url-container {
                display: flex;
                gap: 5px;
                align-items: center;
            }

            #prayerImageSelector, #prayerImageUrlInput, #loadPrayerImageUrlButton {
                padding: 8px 12px;
                border-radius: 4px;
                border: 1px solid #4a306a;
                background-color: #2c1d3e; 
                color: #f0f0f0;
                font-family: 'Arial', sans-serif;
                font-size: 0.9em;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            #prayerImageSelector, #prayerImageUrlInput {
                max-width: 200px;
            }
             #prayerImageUrlInput {
                flex-grow: 1;
            }

            #prayerImageSelector:focus, #prayerImageUrlInput:focus {
                outline: 2px solid #5c3d82;
                border-color: #5c3d82;
            }
            #prayerImageSelector option {
                background-color: #2c1d3e;
                color: #f0f0f0;
                padding: 5px;
            }
            #loadPrayerImageUrlButton {
                cursor: pointer;
                padding: 8px 15px;
            }
            #loadPrayerImageUrlButton:hover {
                background-color: #5c3d82;
            }

            @keyframes pulseAliveFocused {
                0%, 100% { /* Base state / Hold Out ends */
                    filter:
                        brightness(var(--base-brightness))
                        saturate(var(--base-saturation))
                        contrast(var(--base-contrast-hold-out))
                        hue-rotate(var(--base-hue-shift))
                        drop-shadow(
                            var(--shadow-offset-x) var(--shadow-offset-y-base)
                            var(--shadow-blur-base) var(--shadow-color-base)
                        );
                    transform: scale(var(--base-scale));
                    --current-mask-opaque-stop: ${settings.baseMaskOpaqueStop}%;
                    --current-mask-transparent-stop: ${settings.baseMaskTransparentStop}%;
                }
                25% { /* Inhale ends */
                    filter:
                        brightness(var(--peak-brightness))
                        saturate(var(--peak-saturation))
                        contrast(var(--neutral-contrast))
                        hue-rotate(var(--peak-hue-shift))
                        drop-shadow(
                            var(--shadow-offset-x) var(--shadow-offset-y-peak)
                            var(--shadow-blur-peak) var(--shadow-color-peak)
                        );
                    transform: scale(var(--peak-scale));
                    --current-mask-opaque-stop: ${settings.peakMaskOpaqueStop}%;
                    --current-mask-transparent-stop: ${settings.peakMaskTransparentStop}%;
                }
                50% { /* Hold In ends */
                    filter:
                        brightness(var(--peak-brightness))
                        saturate(var(--peak-saturation))
                        contrast(var(--peak-contrast-hold-in))
                        hue-rotate(var(--peak-hue-shift))
                        drop-shadow(
                            var(--shadow-offset-x) var(--shadow-offset-y-peak)
                            var(--shadow-blur-peak) var(--shadow-color-peak)
                        );
                    transform: scale(var(--peak-scale));
                    --current-mask-opaque-stop: ${settings.peakMaskOpaqueStop}%;
                    --current-mask-transparent-stop: ${settings.peakMaskTransparentStop}%;
                }
                75% { /* Exhale ends */
                    filter:
                        brightness(var(--base-brightness))
                        saturate(var(--base-saturation))
                        contrast(var(--neutral-contrast))
                        hue-rotate(var(--base-hue-shift))
                        drop-shadow(
                            var(--shadow-offset-x) var(--shadow-offset-y-base)
                            var(--shadow-blur-base) var(--shadow-color-base)
                        );
                    transform: scale(var(--base-scale));
                    --current-mask-opaque-stop: ${settings.baseMaskOpaqueStop}%;
                    --current-mask-transparent-stop: ${settings.baseMaskTransparentStop}%;
                }
            }
            #prayerImageElementFocused {
                display: block;
                margin-top: 135px; /* Adjusted margin */
                margin-bottom: 15px; /* Adjusted margin */
                border: 4px solid #251838;
                animation-name: pulseAliveFocused;
                animation-duration: ${this.totalAnimationDuration}s; /* Initial duration */
                animation-timing-function: ease-in-out;
                animation-iteration-count: infinite;
                max-width: 75%; /* Adjusted max-width */
                max-height: 55vh; /* Adjusted max-height */
                object-fit: contain;
                border-radius: 6px;
                mask-image: radial-gradient(circle, white var(--current-mask-opaque-stop), transparent var(--current-mask-transparent-stop));
                -webkit-mask-image: radial-gradient(circle, white var(--current-mask-opaque-stop), transparent var(--current-mask-transparent-stop));
                will-change: filter, transform, mask-image, -webkit-mask-image, animation-duration;
            }
            .prayer-message-focused {
                font-size: .5em; /* Slightly smaller for more space */
                margin: 2px 0; /* Adjusted margin */
                color: #f0f0f0;
                text-shadow: 1px 1px 8px #000000, 0 0 5px rgba(200, 180, 255, 0.5);
                font-style: italic;
                font-weight: 300;
                min-height: 2em; 
                transition: opacity 0.5s ease-in-out;
            }
            #breathingRateDisplay { /* New style for breathing rate display */
                font-size: 0.5em;
                color: #c0c0c0;
                margin: 5px;
                font-family: 'Arial', sans-serif;
            }
            .prayer-next-button-focused {
                padding: 12px; /* Adjusted padding */
                background-color: #4a306a;
                color: #f5f0ff;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: .7em; /* Adjusted font size */
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                transition: background-color 0.3s, transform 0.2s, box-shadow 0.3s;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                margin-top: 10px; /* Ensure some space */
            }
            .prayer-next-button-focused:hover {
                background-color: #5c3d82;
                box-shadow: 0 8px 20px rgba(0,0,0,0.4);
                transform: translateY(-2px);
            }
            .prayer-next-button-focused:active {
                background-color: #3e2857;
                transform: translateY(0px);
                box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            }
        `;
        document.head.appendChild(this.styles);
    },

    renderScene: function() {
        this.gameContainer.innerHTML = '';
        this.gameContainer.className = 'game-area prayer-scene-img-container-focused';
        this.elements = {}; // Reset elements

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'prayer-controls-container';

        if (this.availableImages.length > 0) {
            const selectorContainer = document.createElement('div');
            selectorContainer.className = 'prayer-image-selector-container';
            this.elements.imageSelector = document.createElement('select');
            this.elements.imageSelector.id = 'prayerImageSelector';
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Select Predefined Image";
            defaultOption.disabled = true;
            this.elements.imageSelector.appendChild(defaultOption);
            this.availableImages.forEach((imgPath, index) => {
                const option = document.createElement('option');
                option.value = index;
                let displayName = imgPath.substring(imgPath.lastIndexOf('/') + 1);
                displayName = displayName.substring(0, displayName.lastIndexOf('.'));
                displayName = displayName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                displayName = displayName.length > 25 ? displayName.substring(0, 22) + "..." : displayName;
                option.textContent = displayName;
                this.elements.imageSelector.appendChild(option);
            });
            selectorContainer.appendChild(this.elements.imageSelector);
            controlsContainer.appendChild(selectorContainer);
        }

        const urlInputContainer = document.createElement('div');
        urlInputContainer.className = 'prayer-image-url-container';
        this.elements.imageUrlInput = document.createElement('input');
        this.elements.imageUrlInput.type = 'text';
        this.elements.imageUrlInput.id = 'prayerImageUrlInput';
        this.elements.imageUrlInput.placeholder = 'Or paste image URL';
        urlInputContainer.appendChild(this.elements.imageUrlInput);
        this.elements.loadUrlButton = document.createElement('button');
        this.elements.loadUrlButton.id = 'loadPrayerImageUrlButton';
        this.elements.loadUrlButton.textContent = 'Load';
        urlInputContainer.appendChild(this.elements.loadUrlButton);
        controlsContainer.appendChild(urlInputContainer);
        this.gameContainer.appendChild(controlsContainer);

        if (this.elements.imageSelector && this.availableImages.includes(this.imageUrl)) {
            this.currentImageIndex = this.availableImages.indexOf(this.imageUrl);
            this.elements.imageSelector.value = this.currentImageIndex;
        } else if (this.elements.imageSelector) {
            this.elements.imageSelector.value = "";
            if (this.elements.imageSelector.firstChild && this.elements.imageSelector.firstChild.disabled) {
                this.elements.imageSelector.firstChild.selected = true;
            }
        }

        this.elements.image = document.createElement('img');
        this.elements.image.id = 'prayerImageElementFocused';
        this.elements.image.src = this.imageUrl;
        this.elements.image.alt = 'A sacred image for prayer and contemplation';
        this.elements.image.onerror = () => {
            console.error("PrayerSceneGame: Failed to load image at: " + this.elements.image.src);
            const originalSrc = this.elements.image.src;
            if(this.elements.image) {
                this.elements.image.alt = "Image failed to load. Check URL or select another.";
                this.elements.image.src = 'images/default_placeholder.png';
            }
            if (this.elements.message) this.elements.message.textContent = `Failed to load: ${originalSrc.substring(originalSrc.lastIndexOf('/')+1)}. Displaying fallback.`;
            if (this.elements.imageUrlInput && this.elements.imageUrlInput.value === originalSrc) {
                this.elements.imageUrlInput.style.borderColor = 'red';
            }
            if (this.elements.imageSelector) this.elements.imageSelector.value = "";
        };
        this.gameContainer.appendChild(this.elements.image);

        this.elements.message = document.createElement('p');
        this.elements.message.className = 'prayer-message-focused';
        this.elements.message.textContent = this.availableQuotes[this.currentQuoteIndex];
        this.gameContainer.appendChild(this.elements.message);

        // Breathing rate display
        this.elements.breathingRateDisplay = document.createElement('div');
        this.elements.breathingRateDisplay.id = 'breathingRateDisplay';
        this.updateBreathingRateDisplay(); // Set initial text
        this.gameContainer.appendChild(this.elements.breathingRateDisplay);

        this.elements.nextButton = document.createElement('button');
        this.elements.nextButton.className = 'prayer-next-button-focused';
        this.elements.nextButton.textContent = 'Continue Journey';
        this.gameContainer.appendChild(this.elements.nextButton);
    },

    updateBreathingRateDisplay: function() {
        if (this.elements.breathingRateDisplay) {
            this.elements.breathingRateDisplay.textContent = 
                `Breath Phase: ${this.phaseDurationSeconds.toFixed(1)}s (Cycle: ${this.totalAnimationDuration.toFixed(1)}s) — Use Arrow Up/Down to adjust`;
        }
    },

    handleKeyDown: function(event) {
        let rateChanged = false;
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.phaseDurationSeconds = Math.min(8, this.phaseDurationSeconds + 0.5); // Max 8s phase (32s total)
            rateChanged = true;
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.phaseDurationSeconds = Math.max(1, this.phaseDurationSeconds - 0.5); // Min 1s phase (4s total)
            rateChanged = true;
        }

        if (rateChanged) {
            this.totalAnimationDuration = this.phaseDurationSeconds * 4;
            if (this.elements.image) {
                this.elements.image.style.animationDuration = this.totalAnimationDuration + 's';
            }
            this.updateBreathingRateDisplay();
            console.log(`PrayerSceneGame: Breath phase duration changed to ${this.phaseDurationSeconds}s. Total cycle: ${this.totalAnimationDuration}s.`);
        }
    },

    setupEventListeners: function() {
        // Next Button
        if (this.elements.nextButton) {
            if (this._nextButtonClickHandler) this.elements.nextButton.removeEventListener('click', this._nextButtonClickHandler);
            this._nextButtonClickHandler = () => {
                console.log("PrayerSceneGame (Focused Breathing): Continue button clicked.");
                if (this.successCallback) {
                    this.successCallback({ 
                        prayerSceneViewed: true, 
                        breathDuration: this.totalAnimationDuration, // This is the total cycle duration
                        phaseDuration: this.phaseDurationSeconds, // Pass the phase duration as well
                        currentImage: this.imageUrl 
                    });
                }
            };
            this.elements.nextButton.addEventListener('click', this._nextButtonClickHandler);
        }

        // Image Selector Dropdown
        if (this.elements.imageSelector) {
            if (this._imageSelectorChangeHandler) this.elements.imageSelector.removeEventListener('change', this._imageSelectorChangeHandler);
            this._imageSelectorChangeHandler = (event) => {
                const newIndex = parseInt(event.target.value, 10);
                if (newIndex >= 0 && newIndex < this.availableImages.length) {
                    this.currentImageIndex = newIndex;
                    this.imageUrl = this.availableImages[this.currentImageIndex];
                    if (this.elements.image) {
                        this.elements.image.src = this.imageUrl;
                        this.elements.image.alt = 'A sacred image for prayer and contemplation';
                    }
                    if (this.elements.imageUrlInput) {
                        this.elements.imageUrlInput.value = '';
                        this.elements.imageUrlInput.style.borderColor = '#4a306a';
                    }
                    console.log("PrayerSceneGame: Image changed via selector to: " + this.imageUrl);
                }
            };
            this.elements.imageSelector.addEventListener('change', this._imageSelectorChangeHandler);
        }

        // Load URL Button
        if (this.elements.loadUrlButton) {
            if (this._loadUrlButtonClickHandler) this.elements.loadUrlButton.removeEventListener('click', this._loadUrlButtonClickHandler);
            this._loadUrlButtonClickHandler = () => {
                const newUrl = this.elements.imageUrlInput.value.trim();
                if (newUrl) {
                    if (!newUrl.match(/^https?:\/\/.+/i) && !newUrl.startsWith('images/')) {
                        console.warn("PrayerSceneGame: Invalid URL or path format.");
                        this.elements.imageUrlInput.style.borderColor = 'orange';
                        if (this.elements.message) this.elements.message.textContent = "Invalid URL format.";
                        return;
                    }
                    this.imageUrl = newUrl;
                    if (this.elements.image) {
                        this.elements.image.src = this.imageUrl;
                        this.elements.image.alt = 'Image loaded from URL';
                    }
                    if (this.elements.imageSelector) {
                        this.elements.imageSelector.value = "";
                        if (this.elements.imageSelector.firstChild && this.elements.imageSelector.firstChild.disabled) {
                            this.elements.imageSelector.firstChild.selected = true;
                        }
                    }
                    this.elements.imageUrlInput.style.borderColor = '#4a306a';
                    console.log("PrayerSceneGame: Image changed via URL input to: " + this.imageUrl);
                } else {
                    console.log("PrayerSceneGame: URL input is empty.");
                     if (this.elements.message) this.elements.message.textContent = "Please enter an image URL.";
                }
            };
            this.elements.loadUrlButton.addEventListener('click', this._loadUrlButtonClickHandler);
        }
        
        // URL Input Keypress (Enter)
        if (this.elements.imageUrlInput) {
            if (this._imageUrlInputKeypressHandler) {
                this.elements.imageUrlInput.removeEventListener('keypress', this._imageUrlInputKeypressHandler);
            }
            this._imageUrlInputKeypressHandler = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (this._loadUrlButtonClickHandler) {
                         this._loadUrlButtonClickHandler();
                    }
                }
            };
            this.elements.imageUrlInput.addEventListener('keypress', this._imageUrlInputKeypressHandler);
        }

        // Animation Iteration for Quotes
        if (this.elements.image) {
            if (this._animationIterationHandler) this.elements.image.removeEventListener('animationiteration', this._animationIterationHandler);
            this._animationIterationHandler = () => {
                this.currentQuoteIndex = (this.currentQuoteIndex + 1) % this.availableQuotes.length;
                if (this.elements.message) {
                    this.elements.message.style.opacity = 0;
                    setTimeout(() => {
                        this.elements.message.textContent = this.availableQuotes[this.currentQuoteIndex];
                        this.elements.message.style.opacity = 1;
                    }, 250); 
                }
            };
            this.elements.image.addEventListener('animationiteration', this._animationIterationHandler);
        }

        // Keyboard listener for breath rate adjustment
        if (this._keydownHandler) document.removeEventListener('keydown', this._keydownHandler); // Remove if already attached
        this._keydownHandler = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this._keydownHandler);
    },

    destroy: function() {
        console.log("PrayerSceneGame (Focused Breathing): Destroying...");
        
        if (this.elements.nextButton && this._nextButtonClickHandler) {
            this.elements.nextButton.removeEventListener('click', this._nextButtonClickHandler);
        }
        if (this.elements.imageSelector && this._imageSelectorChangeHandler) {
            this.elements.imageSelector.removeEventListener('change', this._imageSelectorChangeHandler);
        }
        if (this.elements.loadUrlButton && this._loadUrlButtonClickHandler) {
            this.elements.loadUrlButton.removeEventListener('click', this._loadUrlButtonClickHandler);
        }
        if (this.elements.imageUrlInput && this._imageUrlInputKeypressHandler) {
            this.elements.imageUrlInput.removeEventListener('keypress', this._imageUrlInputKeypressHandler);
        }
        if (this.elements.image && this._animationIterationHandler) {
            this.elements.image.removeEventListener('animationiteration', this._animationIterationHandler);
        }
        if (this._keydownHandler) {
            document.removeEventListener('keydown', this._keydownHandler);
        }

        this._nextButtonClickHandler = null; 
        this._imageSelectorChangeHandler = null;
        this._loadUrlButtonClickHandler = null;
        this._imageUrlInputKeypressHandler = null;
        this._animationIterationHandler = null;
        this._keydownHandler = null;

        const styleElement = document.getElementById('prayer-scene-focused-styles');
        if (styleElement && styleElement.parentNode) {
            styleElement.parentNode.removeChild(styleElement);
            this.styles = null;
        }
        if (this.gameContainer) {
            this.gameContainer.innerHTML = '';
            this.gameContainer.className = 'game-area'; 
        }
        this.elements = {}; 
        // Reset default phase duration for next potential init, if not overridden by sharedData
        // this.phaseDurationSeconds = 4; 
        // this.totalAnimationDuration = 16;

        console.log("PrayerSceneGame (Focused Breathing): Destroyed.");
    }
};
