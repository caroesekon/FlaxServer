/**
 * In-memory USSD session store
 * For production, replace with Redis
 */
const sessions = new Map();

// Auto-cleanup expired sessions every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, session] of sessions) {
        if (now - session.updatedAt > 5 * 60 * 1000) {
            sessions.delete(key);
        }
    }
}, 5 * 60 * 1000);

const getSession = (sessionId) => {
    const session = sessions.get(sessionId);
    if (!session) return null;

    // Check expiry (5 minutes)
    if (Date.now() - session.updatedAt > 5 * 60 * 1000) {
        sessions.delete(sessionId);
        return null;
    }

    return session;
};

const setSession = (sessionId, data) => {
    sessions.set(sessionId, {
        ...data,
        updatedAt: Date.now()
    });
};

const clearSession = (sessionId) => {
    sessions.delete(sessionId);
};

module.exports = { getSession, setSession, clearSession };