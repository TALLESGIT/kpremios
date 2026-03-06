const fs = require('fs');
const path = require('path');

function removeConsoleLogs(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      removeConsoleLogs(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove console.log, console.error, console.warn, console.info lines
      content = content.replace(/^\s*console\.(log|error|warn|info)\([^;]*\);\s*$/gm, '');
      
      // Remove empty lines that might be left behind
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      fs.writeFileSync(filePath, content);
      console.log(`Processed: ${filePath}`);
    }
  });
}

removeConsoleLogs('./src');
console.log('All console logs removed!');
