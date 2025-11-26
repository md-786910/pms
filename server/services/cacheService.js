const NodeCache = require("node-cache");

// Create cache instance with default TTL of 5 minutes (300 seconds)
// checkperiod: how often to check for expired keys (in seconds)
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects (better performance)
});

// Cache key prefixes for different data types
const CACHE_KEYS = {
  COLUMNS: "columns",
  PROJECT: "project",
  CARDS: "cards",
  LABELS: "labels",
};

/**
 * Generate a cache key for columns by project ID
 * @param {string} projectId - The project ID
 * @returns {string} The cache key
 */
const getColumnsKey = (projectId) => `${CACHE_KEYS.COLUMNS}:${projectId}`;

/**
 * Generate a cache key for project by project ID
 * @param {string} projectId - The project ID
 * @returns {string} The cache key
 */
const getProjectKey = (projectId) => `${CACHE_KEYS.PROJECT}:${projectId}`;

/**
 * Generate a cache key for cards by project ID
 * @param {string} projectId - The project ID
 * @returns {string} The cache key
 */
const getCardsKey = (projectId) => `${CACHE_KEYS.CARDS}:${projectId}`;

/**
 * Generate a cache key for labels by project ID
 * @param {string} projectId - The project ID
 * @returns {string} The cache key
 */
const getLabelsKey = (projectId) => `${CACHE_KEYS.LABELS}:${projectId}`;

/**
 * Get data from cache
 * @param {string} key - The cache key
 * @returns {any|undefined} The cached data or undefined if not found
 */
const get = (key) => {
  return cache.get(key);
};

/**
 * Set data in cache
 * @param {string} key - The cache key
 * @param {any} data - The data to cache
 * @param {number} [ttl] - Optional TTL in seconds (defaults to stdTTL)
 * @returns {boolean} Success status
 */
const set = (key, data, ttl) => {
  if (ttl) {
    return cache.set(key, data, ttl);
  }
  return cache.set(key, data);
};

/**
 * Delete a specific key from cache
 * @param {string} key - The cache key to delete
 * @returns {number} Number of deleted keys
 */
const del = (key) => {
  return cache.del(key);
};

/**
 * Invalidate all cache entries for a specific project
 * @param {string} projectId - The project ID
 */
const invalidateProject = (projectId) => {
  const keys = [
    getColumnsKey(projectId),
    getProjectKey(projectId),
    getCardsKey(projectId),
    getLabelsKey(projectId),
  ];
  keys.forEach((key) => cache.del(key));
  console.log(`Cache invalidated for project: ${projectId}`);
};

/**
 * Invalidate columns cache for a specific project
 * @param {string} projectId - The project ID
 */
const invalidateColumns = (projectId) => {
  const key = getColumnsKey(projectId);
  cache.del(key);
  console.log(`Columns cache invalidated for project: ${projectId}`);
};

/**
 * Flush all cache entries
 */
const flushAll = () => {
  cache.flushAll();
  console.log("All cache entries flushed");
};

/**
 * Get cache statistics
 * @returns {object} Cache statistics
 */
const getStats = () => {
  return cache.getStats();
};

/**
 * Check if a key exists in cache
 * @param {string} key - The cache key
 * @returns {boolean} Whether the key exists
 */
const has = (key) => {
  return cache.has(key);
};

module.exports = {
  cache,
  CACHE_KEYS,
  getColumnsKey,
  getProjectKey,
  getCardsKey,
  getLabelsKey,
  get,
  set,
  del,
  invalidateProject,
  invalidateColumns,
  flushAll,
  getStats,
  has,
};
