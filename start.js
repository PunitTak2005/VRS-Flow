const { spawn } = require('child_process');
const path = require('path');

function log(name, data) {
  const lines = data.toString().trim().split('\n');
  lines.forEach(line => {
    console.log(`[${name}] ${line}`);
  });
}

console.log('--------------------------------------------------');
console.log('🤖 Starting Volunteer Management System Runner');
console.log('--------------------------------------------------');

// 1. Start Client static server (port 3004)
const clientServePath = path.join(__dirname, 'client', 'serve.cjs');
console.log(`[System] Launching frontend server: ${clientServePath}`);

const frontend = spawn('node', [clientServePath], {
  env: { ...process.env, PORT: '3004' }
});

frontend.stdout.on('data', data => log('Frontend', data));
frontend.stderr.on('data', data => log('Frontend Error', data));

// 2. Start Server backend (port 5004)
const serverStartPath = path.join(__dirname, 'server', 'src', 'server.js');
console.log(`[System] Launching backend server: ${serverStartPath}`);

const backend = spawn('node', [serverStartPath], {
  env: { ...process.env, PORT: '5004' }
});

backend.stdout.on('data', data => log('Backend', data));
backend.stderr.on('data', data => log('Backend Error', data));

// Graceful exit handler
let exiting = false;
const handleExit = (name, code) => {
  if (exiting) return;
  exiting = true;
  console.log(`[System] ${name} process exited with code ${code}. Shutting down entire system...`);
  frontend.kill();
  backend.kill();
  process.exit(code || 0);
};

frontend.on('close', code => handleExit('Frontend', code));
backend.on('close', code => handleExit('Backend', code));

const shutdown = () => {
  if (exiting) return;
  exiting = true;
  console.log('\n[System] SIGTERM/SIGINT received. Shutting down servers gracefully...');
  frontend.kill('SIGTERM');
  backend.kill('SIGTERM');
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
