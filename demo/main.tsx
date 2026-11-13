import { createRoot } from 'react-dom/client';
import { Github } from 'lucide-react';
import { Draw } from '../src/sketch-react';
import '../src/sketch-react/styles.css';

createRoot(document.getElementById('root')!).render(
  <Draw
    docsUrl="https://draw.biyik.dev/docs/en"
    links={[{ label: 'GitHub', href: 'https://github.com/metinfarukbiyik/biyik-draw', icon: <Github size={16} /> }]}
  />,
);
