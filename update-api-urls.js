const fs = require('fs');
const path = require('path');

// Components to update
const components = [
    'frontend/src/components/Documents.js',
    'frontend/src/components/Sidebar.js',
    'frontend/src/components/StorageSettings.js'
];

// Update each component
components.forEach(componentPath => {
    if (fs.existsSync(componentPath)) {
        let content = fs.readFileSync(componentPath, 'utf8');
        
        // Add config import if not present
        if (!content.includes("import config from '../config'")) {
            content = content.replace(
                /import React[^;]+;/,
                `$&\nimport config from '../config';`
            );
        }
        
        // Replace localhost:5000 with config.getApiBaseUrl()
        content = content.replace(
            /fetch\('http:\/\/localhost:5000\/([^']+)'/g,
            "fetch(`${config.getApiBaseUrl()}/$1`"
        );
        
        // Replace template literals that already use localhost:5000
        content = content.replace(
            /`http:\/\/localhost:5000\/([^`]+)`/g,
            "`${config.getApiBaseUrl()}/$1`"
        );
        
        fs.writeFileSync(componentPath, content);
        console.log(`Updated ${componentPath}`);
    } else {
        console.log(`File not found: ${componentPath}`);
    }
});
