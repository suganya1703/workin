// Tamil Voice & Speech Parser Module for Workin
// Supports all major Tamil Nadu Districts and Towns

/**
 * Common Tamil Skill Keywords mapping to standardized categories
 */
const TAMIL_SKILL_DICTIONARY = {
    'சமையல்': 'cooking',
    'குக்கிங்': 'cooking',
    'கேட்டரிங்': 'catering',
    'சர்வர்': 'catering',
    'சாப்பாடு': 'catering',
    'லோடிங்': 'loading',
    'மூட்டை': 'loading',
    'எலக்ட்ரீஷியன்': 'electrician',
    'வயர்மேன்': 'electrician',
    'பிளம்பிங்': 'plumbing',
    'சுத்தம்': 'cleaning',
    'பெயிண்டிங்': 'painting',
    'கட்டுமானம்': 'construction',
    'வாகனம்': 'driver',
    'டிரைவர்': 'driver'
};

/**
 * Supported Major Districts & Towns in Tamil Nadu
 */
const TAMILNADU_LOCATIONS = [
    { name: 'Dindigul', tamil: 'திண்டுக்கல்' },
    { name: 'Madurai', tamil: 'மதுரை' },
    { name: 'Thanjavur', tamil: 'தஞ்சாவூர்' },
    { name: 'Coimbatore', tamil: 'கோயம்புத்தூர்' },
    { name: 'Trichy', tamil: 'திருச்சி' },
    { name: 'Salem', tamil: 'சேலம்' },
    { name: 'Tirunelveli', tamil: 'திருநெல்வேலி' },
    { name: 'Erode', tamil: 'ஈரோடு' },
    { name: 'Vellore', tamil: 'வேலூர்' },
    { name: 'Tiruppur', tamil: 'திருப்பூர்' },
    { name: 'Karur', tamil: 'கரூர்' },
    { name: 'Cuddalore', tamil: 'கடலூர்' },
    { name: 'Kanchipuram', tamil: 'காஞ்சிபுரம்' },
    { name: 'Chennai', tamil: 'சென்னை' },
    { name: 'Tuticorin', tamil: 'தூத்துக்குடி' },
    { name: 'Nagercoil', tamil: 'நாகர்கோவில்' },
    { name: 'Virudhunagar', tamil: 'விருதுநகர்' }
];

/**
 * Extracts structured job requirements from Tamil text/transcription
 * @param {string} tamilText - Transcribed speech from audio note
 * @returns {object} Parsed job request object
 */
function parseTamilJobRequest(tamilText) {
    const textLower = tamilText.toLowerCase();
    
    // 1. Extract Skill
    let detectedSkill = 'catering';
    for (const [kw, skill] of Object.entries(TAMIL_SKILL_DICTIONARY)) {
        if (tamilText.includes(kw)) {
            detectedSkill = skill;
            break;
        }
    }

    // 2. Extract Number of Workers Needed
    const numberMatches = tamilText.match(/(\d+)\s*(பேர்|நபர்கள்|ஆட்கள்|workers)?/i);
    let count = 3;
    if (numberMatches && numberMatches[1]) {
        count = parseInt(numberMatches[1], 10);
    } else if (tamilText.includes('அஞ்சு') || tamilText.includes('ஐந்து')) {
        count = 5;
    } else if (tamilText.includes('பத்து')) {
        count = 10;
    } else if (tamilText.includes('ரெண்டு') || tamilText.includes('இரண்டு')) {
        count = 2;
    }

    // 3. Extract Location across Tamil Nadu
    let location = 'Dindigul';
    for (const loc of TAMILNADU_LOCATIONS) {
        if (tamilText.includes(loc.tamil) || textLower.includes(loc.name.toLowerCase())) {
            location = loc.name;
            break;
        }
    }

    // 4. Calculate Rate & Bundled Price
    const baseDailyRate = detectedSkill === 'cooking' || detectedSkill === 'electrician' ? 800 : 600;
    const subtotal = count * baseDailyRate;
    const platformFee = Math.round(subtotal * 0.08); // 8% fee
    const bundledTotal = subtotal + platformFee;

    return {
        rawText: tamilText,
        detectedSkill,
        workerCount: count,
        location,
        perWorkerRate: baseDailyRate,
        subtotal,
        platformFee,
        bundledTotal,
        summaryTamil: `${location}-ல் ${count} ${detectedSkill} தொழிலாளர்கள் தேவை. ஒருவருக்கு நாள் சம்பளம் ₹${baseDailyRate}. மொத்த கட்டணம் ₹${bundledTotal} (பிளாட்ஃபார்ம் கட்டணம் ₹${platformFee} உட்பட).`
    };
}

module.exports = {
    parseTamilJobRequest,
    TAMIL_SKILL_DICTIONARY,
    TAMILNADU_LOCATIONS
};
