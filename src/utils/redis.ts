import { createClient } from 'redis';
import { config } from './config';

const redisClient = createClient({
  url: config.redis.url,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

let isConnected = false;

export const connectRedis = async (): Promise<void> => {
  if (!isConnected) {
    await redisClient.connect();
    isConnected = true;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (isConnected) {
    await redisClient.disconnect();
    isConnected = false;
  }
};

export default redisClient;