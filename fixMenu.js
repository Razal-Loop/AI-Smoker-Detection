const fs = require('fs');

const tabBarStyleStr = `tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 25,
          height: Platform.OS === 'ios' ? 95 : 82,
          paddingBottom: Platform.OS === 'ios' ? 30 : 20,
          paddingTop: 12,
          ...(Platform.OS === 'web' 
             ? { 
                 position: 'absolute',
                 bottom: 20,
                 left: 0,
                 right: 0,
                 marginHorizontal: 'auto',
                 width: '90%',
                 maxWidth: 500,
                 borderRadius: 36,
                 borderWidth: 1,
                 borderColor: '#E2E8F0',
                 boxShadow: '0 10px 25px rgba(15, 23, 42, 0.1)'
               }
             : {
                 position: 'absolute',
                 bottom: 0,
                 left: 0,
                 right: 0,
                 borderTopLeftRadius: 36,
                 borderTopRightRadius: 36,
                 borderWidth: 1,
                 borderColor: '#F1F5F9',
                 shadowColor: '#0F172A',
                 shadowOffset: { width: 0, height: -4 },
                 shadowOpacity: 0.1,
                 shadowRadius: 10
               })
        }`;

['AdminNavigator.js', 'StudentNavigator.js', 'GuardNavigator.js', 'SecurityHeadNavigator.js'].forEach(f => {
    const path = './src/navigation/' + f;
    let content = fs.readFileSync(path, 'utf8');

    if (!content.includes("import { Platform")) {
        content = content.replace("import { View", "import { View, Platform");
    }

    const startIdx = content.indexOf('tabBarStyle: {');
    if (startIdx !== -1) {
        let braceCount = 1;
        let endIdx = startIdx + 'tabBarStyle: {'.length;
        while (braceCount > 0 && endIdx < content.length) {
            if (content[endIdx] === '{') braceCount++;
            if (content[endIdx] === '}') braceCount--;
            endIdx++;
        }

        const originalStyle = content.substring(startIdx, endIdx);
        content = content.replace(originalStyle, tabBarStyleStr);

        fs.writeFileSync(path, content);
        console.log('Fixed', f);
    }
});
