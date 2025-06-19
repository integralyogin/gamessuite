/**
 * partsLoader.js
 * A singleton module to fetch and hold the master parts data from parts.json.
 * This prevents multiple fetch calls and provides a single source of truth.
 */
const PartsLoader = (function() {
    let partsData = null;
    let partsPromise = null;

    async function loadParts() {
        try {
            const response = await fetch('js/parts.json');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            partsData = await response.json();
            console.log("Master parts data loaded successfully.");
            return partsData;
        } catch (error) {
            console.error("Could not load parts data:", error);
            return null;
        }
    }

    return {
        getParts: function() {
            if (partsData) {
                return Promise.resolve(partsData);
            }
            if (!partsPromise) {
                partsPromise = loadParts();
            }
            return partsPromise;
        }
    };
})();

