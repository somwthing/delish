// File: services/fileService.js
const fs = require('fs').promises;
const path = require('path');
const { inspect } = require('util');

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data');
const MAX_LOG_LENGTH = 120; // Truncate long data previews in logs
let writeCounter = 0; // Track all write operations

// List of non-category JSON files to exclude
const EXCLUDED_FILES = ['cart.json', 'orders.json', 'users.json', 'products.json'];

/**
 * Resolves absolute path and ensures data directory exists
 */
async function resolveDataPath(fileName) {
  await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
  return path.join(DATA_DIR, fileName);
}

/**
 * Atomic write implementation (write temp file + rename)
 */
async function atomicWrite(filePath, data) {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmpPath, data, 'utf8');
    await fs.rename(tmpPath, filePath);
  } catch (error) {
    try { await fs.unlink(tmpPath); } catch {} // Cleanup temp file on failure
    throw error;
  }
}

/**
 * Safely reads and parses JSON file
 */
async function readFile(fileName) {
  const filePath = await resolveDataPath(fileName);
  
  try {
    const rawData = await fs.readFile(filePath, 'utf8');
    console.log(`[FILE] Read ${fileName} (${rawData.length} bytes)`);
    
    const parsed = JSON.parse(rawData);
    if (fileName === 'cart.json' && Array.isArray(parsed)) {
      console.warn('[FILE] WARNING: cart.json is an array (expected object)');
    }
    
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`[FILE] ${fileName} not found, returning null`);
      return null;
    }
    console.error(`[FILE] Read error for ${fileName}:`, error.message);
    throw new Error(`Failed to read ${fileName}: ${error.message}`);
  }
}

/**
 * Safely writes data with atomic operations
 */
async function writeFile(fileName, data) {
  const filePath = await resolveDataPath(fileName);
  const writeId = ++writeCounter;
  const dataString = JSON.stringify(data, null, 2);
  const preview = inspect(data).slice(0, MAX_LOG_LENGTH);

  console.log(`[FILE] Write #${writeId} to ${fileName}\nPreview: ${preview}...`);

  try {
    await atomicWrite(filePath, dataString);
    console.log(`[FILE] Write #${writeId} successful (${dataString.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`[FILE] Write #${writeId} failed:`, error.stack || error);
    throw new Error(`Failed to write ${fileName}: ${error.message}`);
  }
}

/**
 * Lists all JSON files in the data directory, excluding non-category files
 */
async function listJsonFiles() {
  try {
    const files = await fs.readdir(DATA_DIR);
    const jsonFiles = files
      .filter(file => file.endsWith('.json') && !EXCLUDED_FILES.includes(file))
      .map(file => file.replace('.json', ''));
    console.log('[FILE] Listed JSON files:', jsonFiles);
    return jsonFiles;
  } catch (error) {
    console.error('[FILE] Error listing JSON files:', error);
    return [];
  }
}

/**
 * JSON-specific aliases
 */
async function readJsonFile(fileName) {
  return readFile(fileName);
}

async function writeJsonFile(fileName, data) {
  return writeFile(fileName, data);
}

module.exports = {
  readFile,
  writeFile,
  readJsonFile,
  writeJsonFile,
  listJsonFiles,
  _testExports: { resolveDataPath, atomicWrite } // For testing only
};