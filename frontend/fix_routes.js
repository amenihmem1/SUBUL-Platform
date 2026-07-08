const fs = require('fs');
const path = require('path');

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  if (!fs.statSync(dir).isDirectory()) {
    processFile(dir);
    return;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fullPath.includes('node_modules') || fullPath.includes('.next') || fullPath.includes('.git')) continue;
    
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

function processFile(fullPath) {
  if (!(fullPath.endsWith('.ts') || fullPath.endsWith('.tsx'))) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const orig = content;

  // Restore fallbacks
  content = content.replace(/const backendUrl = process\.env\.NEXT_PUBLIC_BACKEND_URL;/g, "const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';");
  content = content.replace(/const backendUrl = process\.env\.BACKEND_URL;/g, "const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';");
  content = content.replace(/const BACKEND = process\.env\.NEXT_PUBLIC_BACKEND_URL;/g, "const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';");
  content = content.replace(/const BACKEND = process\.env\.BACKEND_URL;/g, "const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';");

  if (content !== orig) {
    fs.writeFileSync(fullPath, content);
    console.log('Fixed:', fullPath);
  }
}

processDir(path.join(__dirname, 'app/api'));
processDir(path.join(__dirname, 'services'));
processDir(path.join(__dirname, 'hooks'));
processFile(path.join(__dirname, 'proxy.ts'));

// Also fix proxy.ts specific issues
if (fs.existsSync(path.join(__dirname, 'proxy.ts'))) {
  let content = fs.readFileSync(path.join(__dirname, 'proxy.ts'), 'utf8');
  if (!content.includes('|| \'http://localhost:3001\'')) {
     content = content.replace(/process\.env\.BACKEND_URL/g, "(process.env.BACKEND_URL || 'http://localhost:3001')");
     fs.writeFileSync(path.join(__dirname, 'proxy.ts'), content);
     console.log('Fixed proxy.ts');
  }
}
