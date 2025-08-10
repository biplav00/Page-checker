// queueFunctions.js
import { existsSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";

const filePath = resolve("queue.csv");

// Ensure file exists with header
function initQueue() {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, "value\n", "utf8");
  }
}

// Read queue from CSV
function readQueue() {
  const data = readFileSync(filePath, "utf8");
  const lines = data.trim().split("\n").slice(1); // remove header
  return lines.filter(Boolean);
}

// Save queue to CSV
function saveQueue(queue) {
  const csvContent = "value\n" + queue.join("\n");
  writeFileSync(filePath, csvContent, "utf8");
}

// Push item into queue
function pushToQueue(item) {
  initQueue();
  const queue = readQueue();
  queue.push(item);
  saveQueue(queue);
}

// Pop item from queue
function popFromQueue() {
  initQueue();
  const queue = readQueue();
  if (queue.length === 0) return null;
  const item = queue.shift();
  saveQueue(queue);
  return item;
}

// Peek without removing
function peekQueue() {
  initQueue();
  const queue = readQueue();
  return queue.length > 0 ? queue[0] : null;
}

// Queue size
function queueSize() {
  initQueue();
  return readQueue().length;
}

export default { pushToQueue, popFromQueue, peekQueue, queueSize };
