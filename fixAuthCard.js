const fs = require('fs');
const screens = ['AdminLoginScreen.js', 'GuardLoginScreen.js', 'SecurityHeadLoginScreen.js', 'StudentLoginScreen.js'];

screens.forEach(s => {
    const file = './src/screens/auth/' + s;
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('loginCard: {')) {
        content = content.replace(/loginCard:\s*\{((?:[^{}]|{[^{}]*})*)\}/g, (match, inner) => {
            if (!inner.includes('maxWidth:')) {
                return `loginCard: {${inner}, maxWidth: 450, alignSelf: 'center', width: '100%'}`;
            }
            return match;
        });
        fs.writeFileSync(file, content);
        console.log('Fixed', s);
    }
});
