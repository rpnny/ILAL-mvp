const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const target = process.argv[2];
if (!target) {
    console.error('Usage: node find-error.cjs <error_selector>');
    process.exit(1);
}

function findFiles(dir, ext, fileList = []) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            findFiles(fullPath, ext, fileList);
        } else if (fullPath.endsWith(ext)) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const basePath = path.resolve(__dirname, '../../packages/contracts/lib');
const searchPaths = [
    path.join(basePath, 'v4-core/src'),
    path.join(basePath, 'v4-periphery/src')
];

let files = [];
for (const dir of searchPaths) {
    if (fs.existsSync(dir)) {
        files = findFiles(dir, '.sol', files);
    }
}

const regex = /error\s+([A-Za-z0-9_]+)\s*\((.*?)\)/g;

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = regex.exec(content)) !== null) {
        const errorName = match[1];
        let params = match[2].trim();
        // basic param extraction
        const paramTypes = params.split(',').map(p => {
            p = p.trim();
            if (!p) return '';
            // take first word (type)
            return p.split(' ')[0];
        }).filter(p => p);

        const sigStr = `${errorName}(${paramTypes.join(',')})`;
        try {
            const sig = execSync(`cast sig "${sigStr}"`).toString().trim();
            if (sig === target) {
                console.log(`MATCH FOUND! Error: ${sigStr} in file ${file}`);
                process.exit(0);
            }
        } catch (e) { }
    }
}
console.log('Not found.');
