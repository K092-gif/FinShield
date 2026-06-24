const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Add min="0" and onWheel blur
    content = content.replace(/<input type="number"/g, '<input type="number" min="0" onWheel={(e) => e.currentTarget.blur()}');

    // 2. Fix the onChange zero fallback to empty string and Math.max
    content = content.replace(/e\.target\.value === '' \? 0 : Number\(e\.target\.value\)/g, "e.target.value === '' ? '' : Math.max(0, Number(e.target.value))");

    // 3. Fix the value disappearing when 0
    content = content.replace(/value=\{([a-zA-Z0-9_\[\]\.]+) === 0 \? '' : \1\}/g, 'value={$1}');

    // 4. In EmergencyFundTool.tsx, fix expenses default 8000 to empty string for first use
    if (filePath.includes('EmergencyFundTool')) {
        content = content.replace(/: 8000/g, ": ''");
        content = content.replace(/: 10000/g, ": ''");
        content = content.replace(/: 4000/g, ": ''");
        content = content.replace(/: 5000/g, ": ''");
        content = content.replace(/: 3000/g, ": ''");
    }

    if (filePath.includes('RetirementTool')) {
        // Change useState(0) to useState<number | ''>('')
        const statesToChange = ['childrenPre2561', 'childrenPost2561', 'adoptedChildren', 'pregnancyCost', 'parents', 'ssf', 'rmf', 'tesg', 'pvd', 'nsf', 'socialEnterprise', 'ssfx', 'socialSecurity', 'lifeIns', 'healthIns', 'parentsHealthIns', 'pensionIns', 'easyEReceipt', 'localTravel', 'homeLoanInterest', 'homeRepair', 'donationGeneral', 'donationEdu', 'donationPolitic'];
        
        statesToChange.forEach(state => {
            const regex = new RegExp(`const \\\[${state}, set${state.charAt(0).toUpperCase() + state.slice(1)}\\\] = useState\\\(0\\\);`, 'g');
            content = content.replace(regex, `const [${state}, set${state.charAt(0).toUpperCase() + state.slice(1)}] = useState<number | ''>('');`);
        });

        // Add Number() wrapper around variables in calculations
        const varsToWrap = ['annualIncome', ...statesToChange];
        varsToWrap.forEach(v => {
            // Negative lookbehind and lookahead to only match variables as whole words, not inside other words
            // But JS doesn't support \b perfectly with symbols, we'll do our best.
            // Actually, simple regex replacement might be messy, so we replace specific patterns.
            content = content.replace(new RegExp(`\\b${v}\\b`, 'g'), `(Number(${v})||0)`);
        });

        // Revert the wrapping in definitions and state setters
        content = content.replace(/\(Number\(\(Number\(([a-zA-Z0-9_]+)\)\|\|0\)\)\|\|0\)/g, '(Number($1)||0)');
        content = content.replace(/const \[\(Number\(([a-zA-Z0-9_]+)\)\|\|0\), set/g, 'const [$1, set');
        content = content.replace(/value=\{\(Number\(([a-zA-Z0-9_]+)\)\|\|0\)\}/g, 'value={$1}');
        content = content.replace(/set([a-zA-Z0-9_]+)\(\(Number\(([^)]+)\)\|\|0\)\)/g, 'set$1($2)');
        content = content.replace(/\(Number\(([a-zA-Z0-9_]+)\)\|\|0\) === '' \? '' : Math/g, '$1 === \'\' ? \'\' : Math');
        content = content.replace(/value=\{([a-zA-Z0-9_]+) === 0 \? '' : \(Number\(\1\)\|\|0\)\}/g, 'value={$1}');
        content = content.replace(/Math.max\(0, \(Number\(Number\(e.target.value\)\)\|\|0\)\)/g, 'Math.max(0, Number(e.target.value))');
        content = content.replace(/onChange=\{\(e\) => set([a-zA-Z0-9_]+)\(e\.target\.value === '' \? '' : Math.max\(0, \(Number\(Number\(e\.target\.value\)\)\|\|0\)\)\)\}/g, 'onChange={(e) => set$1(e.target.value === \'\' ? \'\' : Math.max(0, Number(e.target.value)))}');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
    }
}

processFile(path.join(__dirname, 'src/components/simulator/RetirementTool.tsx'));
processFile(path.join(__dirname, 'src/components/simulator/EmergencyFundTool.tsx'));
processFile(path.join(__dirname, 'src/components/ui/SettingsPanel.tsx'));
