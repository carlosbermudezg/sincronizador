// src/ftpQueue.js
const queue = [];
let running = false;

export function addTask(task) {
  queue.push(task);
  runNext();
}

async function runNext() {
  if (running) return;
  const task = queue.shift();
  if (!task) return;
  running = true;
  try {
    await task();
  } catch (err) {
    console.error(err);
  }
  running = false;
  runNext();
}
