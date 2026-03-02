/**
 * DEV118 Performance Testing Suite
 * Tests for P0/P1 optimizations: Parallel crypto, O(1) lookup, Mutex protection, File locks
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// TEST 1: Parallel Crypto Operations
// ============================================
async function testParallelCrypto() {
    console.log('\n=== TEST 1: Parallel Crypto Operations ===');

    // Mock encryption key (base64 encoded)
    const mockKey = 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRlipRkwB0K1Y=';

    // Test 1A: Sequential execution (baseline)
    console.time('SequentialCrypto');
    for (let i = 0; i < 10; i++) {
        // Simulate crypto operation with timeout
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.timeEnd('SequentialCrypto');

    // Test 1B: Parallel execution (optimized)
    console.time('ParallelCrypto');
    await Promise.allSettled(
        Array(10).fill(null).map(() =>
            new Promise(resolve => setTimeout(resolve, 200))
        )
    );
    console.timeEnd('ParallelCrypto');

    console.log('✅ Crypto operations test complete\n');
}

// ============================================
// TEST 2: O(1) Feed Lookup
// ============================================
async function testFeedLookup() {
    console.log('\n=== TEST 2: O(1) Feed Lookup ===');

    // Create test data: 1000 items
    const existingItems = Array(1000).fill(null).map((_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
    }));
    const newItem = { id: 'item-500', title: 'Test Item' };

    // Test 2A: Array.some() - O(n) lookup (baseline)
    console.time('ArraySomeLookup');
    const found1 = existingItems.some(e => e.id === newItem.id);
    console.timeEnd('ArraySomeLookup');
    console.log(`Result: ${found1 ? 'Found' : 'Not found'}`);

    // Test 2B: Set.has() - O(1) lookup (optimized)
    const itemSet = new Set(existingItems.map(e => e.id));
    console.time('SetHasLookup');
    const found2 = itemSet.has(newItem.id);
    console.timeEnd('SetHasLookup');
    console.log(`Result: ${found2 ? 'Found' : 'Not found'}`);

    // Test with 10,000 items for stress test
    console.log('\n--- Stress Test: 10,000 items ---');
    const largeItems = Array(10000).fill(null).map((_, i) => ({
        id: `item-${i}`,
        title: `Item ${i}`
    }));

    console.time('ArraySome-10k');
    largeItems.some(e => e.id === 'item-5000');
    console.timeEnd('ArraySome-10k');

    const largeSet = new Set(largeItems.map(e => e.id));
    console.time('SetHas-10k');
    largeSet.has('item-5000');
    console.timeEnd('SetHas-10k');

    console.log('✅ Feed lookup test complete\n');
}

// ============================================
// TEST 3: Mutex Protection
// ============================================
async function testMutexProtection() {
    console.log('\n=== TEST 3: Mutex Race Condition Protection ===');

    const { Mutex } = await import('async-mutex');
    const testMap = new Map<string, number>();
    const mutexes = new Map<string, any>();
    const teamId = 'test-team-1';

    const getMutex = (id: string) => {
        if (!mutexes.has(id)) {
            mutexes.set(id, new Mutex());
        }
        return mutexes.get(id);
    };

    // Initialize counter
    testMap.set(teamId, 0);

    // Simulate 100 concurrent operations
    console.log('Running 100 concurrent operations...');
    console.time('MutexProtection');

    const promises = Array(100).fill(null).map((_, i) =>
        getMutex(teamId).runExclusive(async () => {
            // Simulate some async work
            await new Promise(resolve => setTimeout(resolve, 10));

            // Read-modify-write operation (race condition risk without mutex)
            const current = testMap.get(teamId) || 0;
            testMap.set(teamId, current + 1);
        })
    );

    await Promise.all(promises);
    console.timeEnd('MutexProtection');

    const finalValue = testMap.get(teamId);
    console.log(`Final counter value: ${finalValue}`);

    if (finalValue === 100) {
        console.log('✅ All operations completed successfully - no race conditions detected');
        console.log('✅ Mutex protection test complete\n');
    } else {
        console.error(`❌ Race condition detected! Expected 100, got ${finalValue}`);
        throw new Error(`Mutex protection test failed: expected 100, got ${finalValue}`);
    }
}

// ============================================
// TEST 4: File Write Locks
// ============================================
async function testFileLocks() {
    console.log('\n=== TEST 4: File Write Locks ===');

    const testDir = '/tmp/test-file-locks';
    const testFile = path.join(testDir, 'messages.jsonl');

    // Clean up any previous test artifacts
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }

    // Create test directory
    fs.mkdirSync(testDir, { recursive: true });

    // Create empty file
    fs.writeFileSync(testFile, '', 'utf8');

    // Import proper-lockfile
    const { lock } = await import('proper-lockfile');

    // Create a queue to serialize file access
    const queue: Array<() => Promise<void>> = [];
    let processing = false;

    const processQueue = async () => {
        if (processing || queue.length === 0) return;
        processing = true;

        while (queue.length > 0) {
            const task = queue.shift();
            if (task) await task();
        }

        processing = false;
    };

    // Helper function to write message with lock
    const writeMessage = async (id: number): Promise<void> => {
        return new Promise((resolve, reject) => {
            queue.push(async () => {
                const release = await lock(testFile, {
                    retries: {
                        retries: 10,
                        minTimeout: 10,
                        maxTimeout: 100
                    },
                    stale: 10000,
                    update: 1000
                });

                try {
                    const message = JSON.stringify({
                        id: `msg-${id}`,
                        content: `Concurrent message ${id}`,
                        timestamp: Date.now()
                    }) + '\n';

                    await fs.promises.appendFile(testFile, message, 'utf8');
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    await release();
                }
            });

            processQueue();
        });
    };

    // Simulate 50 concurrent file writes
    console.log('Running 50 concurrent file writes...');
    console.time('FileLockProtection');

    const promises = Array(50).fill(null).map((_, i) => writeMessage(i));
    await Promise.all(promises);

    console.timeEnd('FileLockProtection');

    // Verify all messages were written
    const content = await fs.promises.readFile(testFile, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);
    const corruptedLines: Array<{ index: number; error: string }> = [];
    const messages: Array<{ id?: string; content?: string }> = [];
    let hasFailure = false;

    lines.forEach((line, index) => {
        try {
            messages.push(JSON.parse(line));
        } catch (error) {
            corruptedLines.push({
                index,
                error: error instanceof Error ? error.message : 'Unknown parse error'
            });
        }
    });

    console.log(`Messages written: ${messages.length}`);

    // Check for corruption
    if (corruptedLines.length > 0) {
        hasFailure = true;
        console.error(`❌ Found ${corruptedLines.length} corrupted lines`);
    }

    const corrupted = messages.filter(msg => !msg.id || !msg.content);
    if (corrupted.length > 0) {
        hasFailure = true;
        console.error(`❌ Found ${corrupted.length} corrupted messages`);
    } else {
        console.log('✅ All messages written successfully - no file corruption detected');
    }

    // Verify all IDs are present
    const ids = messages.map(msg => parseInt(msg.id!.split('-')[1]));
    const uniqueIds = new Set(ids);
    console.log(`Unique messages: ${uniqueIds.size} / 50`);

    if (uniqueIds.size === 50) {
        console.log('✅ All 50 messages preserved without data loss');
    } else {
        hasFailure = true;
        console.error(`❌ Data loss detected! Expected 50 unique messages, got ${uniqueIds.size}`);
    }

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });

    if (hasFailure) {
        throw new Error('File write locks test failed');
    }

    console.log('✅ File write locks test complete\n');
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   DEV118 P0/P1 Performance Testing Suite               ║');
    console.log('║   Team Messaging Synchronization Optimizations         ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    console.log('\nTest Environment:');
    console.log('- Date:', new Date().toISOString());
    console.log('- Node.js version:', process.version);
    console.log('- Platform:', process.platform);

    try {
        // Test 1: Parallel Crypto Operations
        await testParallelCrypto();

        // Test 2: O(1) Feed Lookup
        await testFeedLookup();

        // Test 3: Mutex Protection
        await testMutexProtection();

        // Test 4: File Write Locks
        await testFileLocks();

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║   All Tests Complete!                                  ║');
        console.log('╚════════════════════════════════════════════════════════╝');

    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error);
        process.exit(1);
    }
}

// Run tests
runAllTests();
