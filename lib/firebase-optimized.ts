import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, startAfter, writeBatch, Timestamp, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/client';

// Cache implementation for Firebase queries
class FirebaseCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new FirebaseCache();

// Optimized query builder with indexing hints
export class OptimizedFirestore {
  // Batch operations for better performance
  static async batchWrite(operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    docId: string;
    data?: any;
  }>) {
    const batch = writeBatch(db);
    
    operations.forEach(op => {
      const docRef = doc(db, op.collection, op.docId);
      
      switch (op.type) {
        case 'set':
          if (op.data) batch.set(docRef, op.data);
          break;
        case 'update':
          if (op.data) batch.update(docRef, op.data);
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });

    await batch.commit();
  }

  // Cached document fetch with TTL
  static async getCachedDoc(collectionName: string, docId: string, ttl?: number) {
    const cacheKey = `${collectionName}:${docId}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Fetch from Firestore
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() };
      cache.set(cacheKey, data, ttl);
      return data;
    }

    return null;
  }

  // Optimized query with caching and pagination
  static async getCachedQuery(
    collectionName: string,
    constraints: any[],
    cacheKey: string,
    ttl?: number,
    pageSize: number = 20,
    lastDoc?: any
  ) {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && !lastDoc) return cached;

    // Build query with constraints
    let q = query(collection(db, collectionName), ...constraints);
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    q = query(q, limit(pageSize));

    const querySnapshot = await getDocs(q);
    const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Cache the result if not paginated
    if (!lastDoc) {
      cache.set(cacheKey, documents, ttl);
    }

    return {
      documents,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length === pageSize,
    };
  }

  // Real-time listener with caching
  static subscribeToDoc(
    collectionName: string,
    docId: string,
    callback: (data: any) => void,
    ttl?: number
  ) {
    const cacheKey = `${collectionName}:${docId}`;
    
    return onSnapshot(doc(db, collectionName, docId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        cache.set(cacheKey, data, ttl);
        callback(data);
      } else {
        callback(null);
      }
    });
  }

  // Optimized session queries with composite indexes
  static async getActiveSessions(userId?: string, limitCount: number = 50) {
    const constraints = [
      where('status', '==', 'active'),
      orderBy('lastActivity', 'desc'),
      limit(limitCount)
    ];

    if (userId) {
      constraints.unshift(where('userId', '==', userId));
    }

    const cacheKey = `active_sessions:${userId || 'all'}:${limitCount}`;
    return this.getCachedQuery('sessions', constraints, cacheKey, 2 * 60 * 1000); // 2 minutes cache
  }

  // Optimized interview queries with performance tracking
  static async getInterviewHistory(
    userId: string,
    pageSize: number = 20,
    lastDoc?: any
  ) {
    const constraints = [
      where('userId', '==', userId),
      orderBy('startTime', 'desc'),
      limit(pageSize)
    ];

    const cacheKey = `interview_history:${userId}:${pageSize}`;
    return this.getCachedQuery('interview_sessions', constraints, cacheKey, 5 * 60 * 1000, pageSize, lastDoc);
  }

  // Batch feedback processing
  static async processBatchFeedback(feedbackItems: Array<{
    sessionId: string;
    questionId: string;
    feedback: any;
    timestamp: number;
  }>) {
    const operations = feedbackItems.map(item => ({
      type: 'set' as const,
      collection: 'feedback',
      docId: `${item.sessionId}_${item.questionId}`,
      data: item
    }));

    await this.batchWrite(operations);

    // Update session summary
    const sessionFeedbacks = feedbackItems.filter(f => f.sessionId === feedbackItems[0].sessionId);
    if (sessionFeedbacks.length > 0) {
      const averageScore = sessionFeedbacks.reduce((sum, f) => sum + f.feedback.overallScore, 0) / sessionFeedbacks.length;
      
      await updateDoc(doc(db, 'interview_sessions', feedbackItems[0].sessionId), {
        'summary.averageScore': averageScore,
        'summary.lastUpdated': Timestamp.now(),
        'summary.feedbackCount': sessionFeedbacks.length
      });
    }
  }

  // Connection pool management
  static async updateConnectionPoolMetrics(metrics: {
    active: number;
    available: number;
    total: number;
    latency: number;
  }) {
    const cacheKey = 'connection_pool_metrics';
    cache.set(cacheKey, metrics, 30 * 1000); // 30 seconds cache

    await setDoc(doc(db, 'system_metrics', 'connection_pool'), {
      ...metrics,
      timestamp: Timestamp.now(),
    }, { merge: true });
  }

  static async getConnectionPoolMetrics() {
    const cacheKey = 'connection_pool_metrics';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const docSnap = await getDoc(doc(db, 'system_metrics', 'connection_pool'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      cache.set(cacheKey, data, 30 * 1000);
      return data;
    }

    return { active: 0, available: 100, total: 100, latency: 0 };
  }

  // Performance monitoring
  static async logPerformanceMetrics(operation: string, duration: number, metadata?: any) {
    await addDoc(collection(db, 'performance_logs'), {
      operation,
      duration,
      metadata,
      timestamp: Timestamp.now(),
    });
  }

  // Cleanup old data to maintain performance
  static async cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

    // Clean up old performance logs
    const oldLogsQuery = query(
      collection(db, 'performance_logs'),
      where('timestamp', '<', Timestamp.fromDate(cutoffDate))
    );
    
    const oldLogs = await getDocs(oldLogsQuery);
    const batch = writeBatch(db);
    
    oldLogs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
}

// Auto-cleanup cache every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

// Export cache instance for direct access if needed
export { cache };
