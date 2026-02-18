const trackers = new Map<string, { count: number; expiresAt: number }>();

export async function rateLimit(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60 * 1000
): Promise<{ success: boolean; remaining: number }> {
    const now = Date.now();
    const tracker = trackers.get(identifier) || { count: 0, expiresAt: now + windowMs };

    if (now > tracker.expiresAt) {
        tracker.count = 0;
        tracker.expiresAt = now + windowMs;
    }

    tracker.count++;
    trackers.set(identifier, tracker);

    return {
        success: tracker.count <= limit,
        remaining: Math.max(0, limit - tracker.count),
    };
}
