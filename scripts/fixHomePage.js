const fs = require('fs');
const filepath = 'C:/Users/Talle/Desktop/zkOfical/src/pages/HomePage.tsx';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace("import { Link, useNavigate, useOutletContext } from 'react-router-dom';",
  "import { Link, useNavigate } from 'react-router-dom';\nimport Header from '../components/shared/Header';\nimport Footer from '../components/shared/Footer';");

content = content.replace("import { TVFocusable } from '../components/shared/TVFocusable';\nimport { useTVNavigation } from '../hooks/useTVNavigation';", "");

content = content.replace(/  const { tvFocusedIndex: focusedIndex, setTvFocusedIndex: setFocusedIndex } = useOutletContext<\{[\s\S]*?  \}>\(\);\n  const \{ isTVMode \} = useTVNavigation\(\);\n/g, "");

content = content.replace(/  \/\/ Lógica de Navegação Smart TV \(D-Pad\)[\s\S]*?return \(\) => window.removeEventListener\('keydown', handleTVKeyDown\);\n  \}, \[isTVMode, activePool\]\);\n/g, "");

content = content.replace("<main className=\"min-h-screen bg-slate-900 overflow-x-hidden\">",
  "<div className=\"min-h-screen flex flex-col\">\n      <Header />\n      <main className=\"flex-grow w-full relative bg-slate-900 overflow-x-hidden\">");

content = content.replace(/\$\{isTVMode \? 'pt-32 pb-24' : 'pt-20 pb-16'\}/g, "pt-20 pb-16");
content = content.replace(/!isTVMode/g, "true");

// Replace TVFocusable wrappers
content = content.replace(/<TVFocusable[\s\S]*?>\s*(<button[\s\S]*?<\/button>)\s*<\/TVFocusable>/g, "$1");

content = content.replace(/<\/main\s*>\n  \);/g, "</main>\n      <Footer />\n    </div>\n  );");

fs.writeFileSync(filepath, content, 'utf8');
console.log('HomePage updated successfully!');
