const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  // Backgrounds
  { regex: /bg-\[\#050505\]/g, replacement: 'bg-muted' },
  { regex: /bg-\[\#0a0a0a\]/g, replacement: 'bg-card' },
  { regex: /bg-\[\#111111\]/g, replacement: 'bg-muted' },
  { regex: /bg-\[\#151515\]/g, replacement: 'bg-input' },
  { regex: /bg-\[\#0f0f0f\]/g, replacement: 'bg-card' },
  { regex: /bg-black\/80/g, replacement: 'bg-brand-navy/80' },
  { regex: /bg-white\/\[0\.02\]/g, replacement: 'bg-muted' },
  
  // Borders
  { regex: /border-white\/5/g, replacement: 'border-border' },
  { regex: /border-white\/10/g, replacement: 'border-border' },
  { regex: /border-white\/20/g, replacement: 'border-border' },
  { regex: /border-white\/30/g, replacement: 'border-border' },
  { regex: /border-gray-500/g, replacement: 'border-border' },
  { regex: /border-transparent hover:border-white\/10/g, replacement: 'border-transparent hover:border-border' },
  
  // Text
  { regex: /text-gray-300/g, replacement: 'text-foreground' },
  { regex: /text-gray-400/g, replacement: 'text-muted-foreground' },
  { regex: /text-gray-500/g, replacement: 'text-muted-foreground' },
  { regex: /text-gray-600/g, replacement: 'text-muted-foreground' },
  
  // Emerald mappings
  { regex: /emerald-500/g, replacement: 'primary' },
  { regex: /emerald-600/g, replacement: 'primary/90' },
  
  // Specific tweaks
  { regex: /rounded-sm/g, replacement: 'rounded-md' },
  { regex: /shadow-\[.*?\]/g, replacement: 'shadow-sm' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // For Navbar specifically, keep it brand-navy and white text
      if (file === 'Navbar.jsx') {
        content = content.replace(/bgColor = "bg-\[\#0a0a0a\]"/g, 'bgColor = "bg-brand-navy text-white"');
        content = content.replace(/bg-\[\#0a0a0a\]/g, 'bg-brand-navy text-white');
        content = content.replace(/bg-\[\#050505\]\/50/g, 'bg-brand-navy/90');
      }
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      // Additional global cleanup for "text-white" in main containers
      // Except in Navbar where we might want to keep it or we handled it.
      if (file !== 'Navbar.jsx') {
        // We replace text-white with text-foreground, EXCEPT if it's accompanied by text-white literally used in primary buttons.
        // Actually, if it's text-white, it's safer to just replace it, 
        // as standard buttons use text-primary-foreground which handles the white text automatically via shadcn UI Button component.
        content = content.replace(/text-white/g, 'text-foreground');
      }

      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDirectory(srcDir);
console.log('Replacement complete.');

// Fix black text on buttons
replacements.push({ regex: /text-black/g, replacement: 'text-white' });
processDirectory(srcDir);
console.log('Fixed text-black');
