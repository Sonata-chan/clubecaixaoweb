const { chromium } = require('@playwright/test');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const server = http.createServer((req, res) => {
    let filePath = '.' + url.parse(req.url).pathname;
    if (filePath === './') filePath = './index.html';
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.svg': 'application/image/svg+xml'
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(8000, '127.0.0.1');

async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const consoleMsgs = [];
    const pageErrors = [];
    page.on('console', msg => consoleMsgs.push("[" + msg.type() + "] " + msg.text()));
    page.on('pageerror', err => pageErrors.push(err.message));

    try {
        await page.goto('http://127.0.0.1:8000/index.html?testMode=1&testCase=boot');
        await page.waitForTimeout(15000);
        
        const snapshot = await page.evaluate(() => window.__CLUBECAIXAO_TEST__);
        const errorPrinterExists = await page.evaluate(() => !!document.getElementById('errorPrinter'));
        
        process.stdout.write('--- SNAPSHOT ---\n');
        process.stdout.write(JSON.stringify(snapshot, null, 2) + '\n');
        process.stdout.write('--- CONSOLE ---\n');
        process.stdout.write(consoleMsgs.join('\n') + '\n');
        process.stdout.write('--- ERRORS ---\n');
        process.stdout.write(pageErrors.join('\n') + '\n');
        process.stdout.write('--- ERROR PRINTER ---\n');
        process.stdout.write('Exists: ' + errorPrinterExists + '\n');
    } catch (e) {
        process.stderr.write(e.stack + '\n');
    } finally {
        await browser.close();
        server.close();
    }
}

run();
