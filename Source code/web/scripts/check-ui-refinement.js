const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const modalHook = read('src/components/ui/useModalA11y.ts');
const cameraPage = read('src/pages/Camera/CameraPage.tsx');
const refinement = read('src/styles/refinement.css');

const checks = [
  [modalHook.includes("event.key === 'Escape'"), 'Modal must close with Escape'],
  [modalHook.includes("event.key !== 'Tab'"), 'Modal must contain keyboard focus'],
  [cameraPage.includes("matchMedia('(min-width: 701px)')"), 'Camera navigator must default closed on mobile'],
  [refinement.includes('.login-page *'), 'Login controls must use predictable box sizing'],
  [refinement.includes('@media (pointer: coarse)'), 'Touch layouts must expose larger controls'],
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(message);
}

console.log('UI refinement checks passed: ' + checks.length);
