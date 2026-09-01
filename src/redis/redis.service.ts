// redis/redis.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) throw new Error('REDIS_URL is not configured');
    this.client = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  // Raw string set with optional TTL
  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async setJson(key: string, value: any, ttlSeconds?: number) {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async safeGetJson<T>(key: string): Promise<{ value: T | null; degraded: boolean }> {
    try {
      const value = await this.getJson<T>(key);
      return { value, degraded: false };
    } catch {
      return { value: null, degraded: true };
    }
  }

  // Atomic increment for player numbering
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }
}