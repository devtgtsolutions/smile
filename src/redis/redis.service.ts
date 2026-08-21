import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error('REDIS_URL is not configured');
    }

    this.client = new Redis(redisUrl);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async setJson(key: string, value: any, ttlSeconds?: number) {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
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
    } catch (err) {
      return { value: null, degraded: true };
    }
  }
}