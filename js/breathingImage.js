// js/prayerSceneGame.js (Focused Breathing with Smooth @property Mask Animation)

const PrayerSceneGame = {
    id: 'PrayerSceneGame',
    gameContainer: null,
    successCallback: null,
    failureCallback: null,
    sharedData: null,
    styles: null,
    elements: {},
    //imageUrl: 'images/MZtYqJyXKpEQV7NQMCwI--0--kva5n.jpg',
    imageUrl: 'images/upclose-detailed-luminous-neon-stained-glass-image-of-female-saint-in-prayer.jpg',
//    imageUrl: 'images/upclose-detailed-bright-luminous-neon-stained-glass-image-of-female-saint-in-prayer-high-constrast.jpg',
 //   imageUrl: 'images/upclose-detailed-bright-luminous-neon-stained-glass-image-of-female-saint-in-prayer.jpg',

    animationSettings: {
        baseBrightness: 0.95,
        baseSaturation: 0.95,
        baseContrast: 0.97,
        baseHueShift: -0.1,
        baseScale: 0.95,
        // NEW: Define mask stops as percentages for smooth animation via @property
        baseMaskOpaqueStop: 95,   // Opaque stop at base (image fully visible)
        baseMaskTransparentStop: 95, // Transparent stop at base

        peakBrightness: 1.82,
        peakSaturation: 1.12,
        peakContrast: 1.13,
        peakHueShift: 580,
        peakScale: 1.04,
        // NEW: Define mask stops for peak state
        peakMaskOpaqueStop: 88,    // Opaque center (e.g., 55% of radius)
        peakMaskTransparentStop: 88,   // Point where mask becomes fully transparent (e.g., 90% of radius)

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

    totalAnimationDuration: 12,

    init: function(container, successCallback, failureCallback, sharedData) {
        // ... (init logic remains the same) ...
        this.gameContainer = container;
        this.successCallback = successCallback;
        this.failureCallback = failureCallback;
        this.sharedData = sharedData;

        let phaseDurationInput = "4";
        if (this.sharedData && this.sharedData.breathSpeedSetting) {
            phaseDurationInput = this.sharedData.breathSpeedSetting;
        } else {
            const speedChoice = prompt("Set breath phase duration (seconds per phase, e.g., 2, 3, 4, 8):", "4");
            if (speedChoice && !isNaN(parseFloat(speedChoice)) && parseFloat(speedChoice) > 0) {
                phaseDurationInput = speedChoice;
            }
        }
        const phaseDuration = parseFloat(phaseDurationInput);
        this.totalAnimationDuration = phaseDuration * 4;

        console.log(`PrayerSceneGame (Focused Breathing): Initializing with ${phaseDuration}s per phase. Total: ${this.totalAnimationDuration}s.`);
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
            /* CSS Houdini @property definitions for smooth mask animation */
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
                /* Static CSS variables from animationSettings */
                --base-brightness: ${settings.baseBrightness};
                --base-saturation: ${settings.baseSaturation};
                --base-contrast-hold-out: ${settings.baseContrast};
                --base-hue-shift: ${settings.baseHueShift}deg;
                --base-scale: ${settings.baseScale};
                /* Removed baseMaskGradient string */

                --peak-brightness: ${settings.peakBrightness};
                --peak-saturation: ${settings.peakSaturation};
                --peak-contrast-hold-in: ${settings.peakContrast};
                --peak-hue-shift: ${settings.peakHueShift}deg;
                --peak-scale: ${settings.peakScale};
                /* Removed peakMaskGradient string */

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
            }

@keyframes pulseAliveFocused {
    /* Phase 1: HOLD OUT */
    0%, 100% {
        filter:
            brightness(var(--base-brightness))
            saturate(var(--base-saturation))
            contrast(var(--base-contrast-hold-out))
            hue-rotate(var(--base-hue-shift)) /* Uses base hue (e.g., 0deg) */
            drop-shadow(
                var(--shadow-offset-x) var(--shadow-offset-y-base)
                var(--shadow-blur-base) var(--shadow-color-base)
            );
        transform: scale(var(--base-scale));
        --current-mask-opaque-stop: ${settings.baseMaskOpaqueStop}%;
        --current-mask-transparent-stop: ${settings.baseMaskTransparentStop}%;
    }
    /* Phase 2: INHALE (ends here) */
    25% {
        filter:
            brightness(var(--peak-brightness))
            saturate(var(--peak-saturation))
            contrast(var(--neutral-contrast))
            hue-rotate(var(--peak-hue-shift)) /* <<< MUST use --peak-hue-shift */
            drop-shadow(
                var(--shadow-offset-x) var(--shadow-offset-y-peak)
                var(--shadow-blur-peak) var(--shadow-color-peak)
            );
        transform: scale(var(--peak-scale));
        --current-mask-opaque-stop: ${settings.peakMaskOpaqueStop}%;
        --current-mask-transparent-stop: ${settings.peakMaskTransparentStop}%;
    }
    /* Phase 3: HOLD IN (ends here) */
    50% {
        filter:
            brightness(var(--peak-brightness))
            saturate(var(--peak-saturation))
            contrast(var(--peak-contrast-hold-in))
            hue-rotate(var(--peak-hue-shift)) /* <<< MUST use --peak-hue-shift */
            drop-shadow(
                var(--shadow-offset-x) var(--shadow-offset-y-peak)
                var(--shadow-blur-peak) var(--shadow-color-peak)
            );
        transform: scale(var(--peak-scale));
        --current-mask-opaque-stop: ${settings.peakMaskOpaqueStop}%;
        --current-mask-transparent-stop: ${settings.peakMaskTransparentStop}%;
    }
    /* Phase 4: EXHALE (ends here) */
    75% {
        filter:
            brightness(var(--base-brightness))
            saturate(var(--base-saturation))
            contrast(var(--neutral-contrast))
            hue-rotate(var(--base-hue-shift)) /* <<< MUST use --base-hue-shift to return */
            drop-shadow(
                var(--shadow-offset-x) var(--shadow-offset-y-base)
                var(--shadow-blur-base) var(--shadow-color-base)
            );
        transform: scale(var(--base-scale));
        --current-mask-opaque-stop: ${settings.baseMaskOpaqueStop}%;
        --current-mask-transparent-stop: ${settings.baseMaskTransparentStop}%;
    }
}
            .prayer-scene-img-container-focused {
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
                padding: 20px;
                box-sizing: border-box;
                border-radius: 8px;
                overflow: hidden;
            }
            #prayerImageElementFocused {
                display: block;
                margin-bottom: 25px;
                border: 4px solid #251838;
                animation-name: pulseAliveFocused;
                animation-duration: ${this.totalAnimationDuration}s;
                animation-timing-function: ease-in-out;
                animation-iteration-count: infinite;
                max-width: 80%;
                max-height: 70vh;
                object-fit: contain;
                border-radius: 6px;
                /* Apply the mask using the animatable custom properties */
                mask-image: radial-gradient(circle, white var(--current-mask-opaque-stop), transparent var(--current-mask-transparent-stop));
                -webkit-mask-image: radial-gradient(circle, white var(--current-mask-opaque-stop), transparent var(--current-mask-transparent-stop));
                will-change: filter, transform, mask-image; /* mask-image or the custom props */
            }
            /* ... (rest of CSS for message, button, etc.) ... */
            .prayer-message-focused {
                font-size: 1.6em;
                margin-bottom: 30px;
                color: #f0f0f0;
                text-shadow: 1px 1px 8px #000000, 0 0 5px rgba(200, 180, 255, 0.5);
                font-style: italic;
                font-weight: 300;
            }
            .prayer-next-button-focused {
                padding: 14px 35px;
                background-color: #4a306a;
                color: #f5f0ff;
                border: none;
                border-radius: 25px;
                cursor: pointer;
                font-size: 1.1em;
                font-weight: 400;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                transition: background-color 0.3s, transform 0.2s, box-shadow 0.3s;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
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

    renderScene: function() { /* ... (remains the same) ... */
        this.gameContainer.innerHTML = '';
        this.gameContainer.className = 'game-area prayer-scene-img-container-focused';

        this.elements.image = document.createElement('img');
        this.elements.image.id = 'prayerImageElementFocused';
        this.elements.image.src = this.imageUrl;
        this.elements.image.alt = 'A sacred image for prayer and contemplation';
        this.elements.image.onerror = () => {
            console.error("PrayerSceneGame: Failed to load image at: " + this.imageUrl);
            if (this.elements.message) {
                this.elements.message.textContent = "Image could not be loaded.";
            }
        };
        this.gameContainer.appendChild(this.elements.image);

        this.elements.message = document.createElement('p');
        this.elements.message.className = 'prayer-message-focused';
        this.elements.message.textContent = '"In stillness, divine beauty unfolds."';
        this.gameContainer.appendChild(this.elements.message);

        this.elements.nextButton = document.createElement('button');
        this.elements.nextButton.className = 'prayer-next-button-focused';
        this.elements.nextButton.textContent = 'Continue Journey';
        this.gameContainer.appendChild(this.elements.nextButton);
    },
    setupEventListeners: function() { /* ... (remains the same) ... */
        if (this.elements.nextButton) {
            this.elements.nextButton.addEventListener('click', () => {
                console.log("PrayerSceneGame (Focused Breathing): Continue button clicked.");
                if (this.successCallback) {
                    this.successCallback({ prayerSceneViewed: true, breathDuration: this.totalAnimationDuration });
                }
            });
        }
    },
    destroy: function() { /* ... (remains the same) ... */
        console.log("PrayerSceneGame (Focused Breathing): Destroying...");
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
        console.log("PrayerSceneGame (Focused Breathing): Destroyed.");
    }
};
