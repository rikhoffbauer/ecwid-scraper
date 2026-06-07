const fs = require('fs');

let test = fs.readFileSync('test/sync.test.ts', 'utf8');
test = test.replace(/event\.path === "\/product\/price"/g, 'event.path === "/price"');
test = test.replace(/path: "\/product\/price"/g, 'path: "/price"');
fs.writeFileSync('test/sync.test.ts', test);
