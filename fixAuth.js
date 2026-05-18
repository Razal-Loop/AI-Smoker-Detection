const fs = require('fs');
const files = fs.readdirSync('./src/screens/auth').map(f => './src/screens/auth/' + f).filter(f => f.endsWith('.js'));
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('authCard: {')) {
        content = content.replace(/authCard:\s*\{((?:[^{}]|{[^{}]*})*)\}/g, (match, inner) => {
            if (!inner.includes('maxWidth:')) {
                return `authCard: {${inner}, maxWidth: 450, alignSelf: 'center'}`;
            }
            return match;
        });
        fs.writeFileSync(f, content);
        console.log('Fixed authCard in', f);
    }
});

// Also fix WelcomeScreen
let wsContent = fs.readFileSync('./src/screens/auth/WelcomeScreen.js', 'utf8');
if (wsContent.includes('rolesGrid: {')) {
    wsContent = wsContent.replace(/rolesGrid:\s*\{((?:[^{}]|{[^{}]*})*)\}/g, (match, inner) => {
        if (!inner.includes('maxWidth:')) {
            return `rolesGrid: {${inner}, maxWidth: 600, alignSelf: 'center', width: '100%'}`;
        }
        return match;
    });
    fs.writeFileSync('./src/screens/auth/WelcomeScreen.js', wsContent);
    console.log('Fixed WelcomeScreen rolesGrid');
}
