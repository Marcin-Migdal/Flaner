const fs = require('fs');
const { execSync } = require('child_process');

try {
  const result = execSync('npx eslint . --format json', { encoding: 'utf-8' });
  fs.writeFileSync('eslint-report-node.json', result, 'utf-8');
} catch (e) {
  // eslint exits with 1 if there are errors
  fs.writeFileSync('eslint-report-node.json', e.stdout, 'utf-8');
}
