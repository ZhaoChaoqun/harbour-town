import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const basePath = '/harbour-town/';
const port = Number(process.env.PORT || 4179);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
await fs.promises.access(path.join(root, 'index.html'));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
};
const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (error) {
    if (!(error instanceof URIError || error instanceof TypeError)) throw error;
    res.writeHead(400).end('Invalid URL');
    return;
  }
  if (pathname === '/' || pathname === basePath.slice(0, -1)) {
    res.writeHead(302, { Location: basePath }).end();
    return;
  }
  if (!pathname.startsWith(basePath)) {
    res.writeHead(404).end('Not found');
    return;
  }
  const relative = pathname.slice(basePath.length) || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  fs.stat(file, (error, stat) => {
    if (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        res.writeHead(404).end('Not found');
      } else {
        console.error('Failed to read preview file:', error);
        res.writeHead(500).end('Unable to read file');
      }
      return;
    }
    if (!stat.isFile()) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    const stream = fs.createReadStream(file);
    stream.on('error', error => {
      console.error('Failed to stream preview file:', error);
      res.destroy(error);
    });
    stream.pipe(res);
  });
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Harbour preview ready at http://127.0.0.1:${port}${basePath}`);
});
