const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.js')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src/screens');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    const hasDimensions = content.includes("Dimensions.get('window')");

    if (hasDimensions) {
        // Determine the variable name extracted from Dimensions
        let widthVar = 'width';
        let heightVar = 'height';
        let hasWidth = content.includes('{ width }');
        let hasHeightAndWidth = content.includes('{ width, height }');
        let hasWidthRenamed = /const\s+\{\s*width\s*:\s*(\w+)\s*\}\s*=\s*Dimensions\.get\('window'\)/.exec(content);

        // Check if useWindowDimensions is imported
        if (!content.includes('useWindowDimensions')) {
            content = content.replace(/import\s+\{([^}]+)\}\s+from\s+'react-native';/, "import { $1, useWindowDimensions } from 'react-native';");
        }

        // Remove the Dimensions.get
        content = content.replace(/const\s+\{[^\}]+\}\s*=\s*Dimensions\.get\('window'\);/g, '');

        // Inject useWindowDimensions into the component function
        // Assuming the component is the first exported function or the one using the hook
        // Let's use a regex to find the component arrow function or normal function
        const funcRegex = /(const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{|function\s+(\w+)\s*\([^)]*\)\s*\{)/;

        let injected = false;
        content = content.replace(funcRegex, (match) => {
            if (!injected) {
                injected = true;
                let hooks = `  const { width, height } = useWindowDimensions();\n`;
                if (hasWidthRenamed) {
                    hooks = `  const { width: ${hasWidthRenamed[1]}, height } = useWindowDimensions();\n`;
                }
                return match + '\n' + hooks;
            }
            return match;
        });

        // Special fix for static styles
        // If we have width in StyleSheet, replace it with '100%' or modify it
        // Already did DashboardScreen and LiveCameraScreen statically.

        fs.writeFileSync(file, content);
        console.log('Fixed', file);
    }
});
