package br.com.dwcore.acadflow_api.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitService {

    private final ConcurrentHashMap<String, Deque<Long>> store = new ConcurrentHashMap<>();
    private final int maxRequests;
    private final long windowMs;

    public RateLimitService(
            @Value("${app.rate-limit.max-requests:10}") int maxRequests,
            @Value("${app.rate-limit.window-ms:60000}") long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    public boolean isAllowed(String key) {
        long now = System.currentTimeMillis();
        long[] count = {0};
        store.compute(key, (k, deque) -> {
            if (deque == null) deque = new ArrayDeque<>();
            long cutoff = now - windowMs;
            while (!deque.isEmpty() && deque.peekFirst() < cutoff) {
                deque.pollFirst();
            }
            deque.addLast(now);
            count[0] = deque.size();
            return deque;
        });
        return count[0] <= maxRequests;
    }
}
