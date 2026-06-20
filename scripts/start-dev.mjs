import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const processes = [
  {
    name: 'frontend',
    command: npmCommand,
    args: ['run', 'dev'],
  },
  {
    name: 'backend',
    command: npmCommand,
    args: ['--prefix', 'backend', 'run', 'dev'],
  },
];

const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${name} stopped with signal ${signal}`);
      return;
    }

    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      stopAll(code);
    }
  });

  return child;
});

let stopping = false;

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  setTimeout(() => process.exit(exitCode), 100);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
