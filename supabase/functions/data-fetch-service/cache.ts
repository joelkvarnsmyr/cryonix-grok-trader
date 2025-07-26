// Advanced caching system for Cryonix data fetching
// Implements the caching strategy from the blueprint

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  source: 'market_data' | 'sentiment' | 'news' | 'technical_indicators' | 'google_trends';
}

interface CacheConfig {
  market_data: number;      // 60 seconds
  sentiment: number;        // 300 seconds (5 minutes)
  news: number;            // 300 seconds (5 minutes)
  technical_indicators: number; // 600 seconds (10 minutes)
  google_trends: number;   // 300 seconds (5 minutes)
}

class DataCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000; // Maximum cache entries
  
  private readonly cacheDurations: CacheConfig = {
    market_data: 60 * 1000,        // 1 minute
    sentiment: 5 * 60 * 1000,      // 5 minutes
    news: 5 * 60 * 1000,           // 5 minutes
    technical_indicators: 10 * 60 * 1000, // 10 minutes
    google_trends: 5 * 60 * 1000   // 5 minutes
  };

  constructor() {
    // Clean up expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  // Generate cache key from parameters
  private generateKey(source: keyof CacheConfig, params: any): string {
    const paramString = typeof params === 'object' ? 
      JSON.stringify(params, Object.keys(params).sort()) : 
      String(params);
    return `${source}:${paramString}`;
  }

  // Set data in cache
  set(source: keyof CacheConfig, params: any, data: any): void {
    const key = this.generateKey(source, params);
    const now = Date.now();
    const duration = this.cacheDurations[source];
    
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + duration,
      source
    };

    this.cache.set(key, entry);
    
    // Enforce max cache size
    if (this.cache.size > this.maxSize) {
      this.evictOldest();
    }

    console.log(`📦 Cached ${source} data (expires in ${duration/1000}s)`);
  }

  // Get data from cache
  get(source: keyof CacheConfig, params: any): any | null {
    const key = this.generateKey(source, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`🔍 Cache miss for ${source}`);
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      console.log(`⏰ Cache expired for ${source}`);
      return null;
    }

    const ageSeconds = (now - entry.timestamp) / 1000;
    console.log(`✅ Cache hit for ${source} (age: ${ageSeconds.toFixed(1)}s)`);
    return entry.data;
  }

  // Check if data is cached and fresh
  has(source: keyof CacheConfig, params: any): boolean {
    return this.get(source, params) !== null;
  }

  // Clear cache for specific source
  clearBySource(source: keyof CacheConfig): void {
    const keysToDelete = [];
    for (const [key, entry] of this.cache.entries()) {
      if (entry.source === source) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Cleared ${keysToDelete.length} ${source} cache entries`);
  }

  // Clear all cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared entire cache (${size} entries)`);
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const stats = {
      totalEntries: this.cache.size,
      bySource: {} as Record<string, number>,
      expiredEntries: 0,
      oldestEntry: now,
      newestEntry: 0
    };

    for (const [key, entry] of this.cache.entries()) {
      // Count by source
      stats.bySource[entry.source] = (stats.bySource[entry.source] || 0) + 1;
      
      // Count expired
      if (now > entry.expiresAt) {
        stats.expiredEntries++;
      }

      // Track age
      if (entry.timestamp < stats.oldestEntry) {
        stats.oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > stats.newestEntry) {
        stats.newestEntry = entry.timestamp;
      }
    }

    return {
      ...stats,
      oldestAgeMinutes: stats.totalEntries > 0 ? (now - stats.oldestEntry) / (1000 * 60) : 0,
      newestAgeMinutes: stats.totalEntries > 0 ? (now - stats.newestEntry) / (1000 * 60) : 0
    };
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  // Evict oldest entries when cache is full
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`🗑️ Evicted ${toRemove} oldest cache entries`);
  }
}

// Status tracking for monitoring cache performance
class CacheMonitor {
  private hits = 0;
  private misses = 0;
  private errors = 0;
  private startTime = Date.now();

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  recordError(): void {
    this.errors++;
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100) : 0;
    const uptime = (Date.now() - this.startTime) / 1000;

    return {
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      total,
      hitRate: hitRate.toFixed(1),
      uptimeSeconds: uptime,
      requestsPerSecond: total / uptime
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.startTime = Date.now();
  }
}

// Singleton instances
export const dataCache = new DataCache();
export const cacheMonitor = new CacheMonitor();

// Helper functions for easy integration
export function getCachedData(source: keyof CacheConfig, params: any): any | null {
  const data = dataCache.get(source, params);
  if (data) {
    cacheMonitor.recordHit();
    return data;
  } else {
    cacheMonitor.recordMiss();
    return null;
  }
}

export function setCachedData(source: keyof CacheConfig, params: any, data: any): void {
  try {
    dataCache.set(source, params, data);
  } catch (error) {
    console.error('Error setting cache data:', error);
    cacheMonitor.recordError();
  }
}

export function getCacheStats() {
  return {
    cache: dataCache.getStats(),
    monitor: cacheMonitor.getStats()
  };
}

export function clearCache(source?: keyof CacheConfig) {
  if (source) {
    dataCache.clearBySource(source);
  } else {
    dataCache.clear();
  }
}

// Cache status for integration with status handler
export function getCacheStatus(): 'green' | 'yellow' | 'red' {
  const stats = cacheMonitor.getStats();
  
  if (stats.errors > stats.total * 0.1) return 'red'; // >10% error rate
  if (stats.hitRate < 30) return 'yellow'; // <30% hit rate
  return 'green';
}