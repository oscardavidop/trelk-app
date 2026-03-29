import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

/**
 * MongoDB connection configuration optimized for +1M DAU.
 * Prepared for horizontal scaling with sharding.
 *
 * Sharding strategy:
 *   - shard key: { commandSlug: 1 } for command-related collections
 *   - shard key: { userId: 'hashed' } for user-related collections
 *
 * HOT/COLD data separation:
 *   HOT: command_ratings, commands, histories (recent 30d)
 *   COLD: logs, old reports, analytics
 */
export function getMongoConfig(config: ConfigService): MongooseModuleOptions {
  const isProd = config.get('NODE_ENV') === 'production';

  return {
    uri: config.get<string>('MONGODB_URI'),
    maxPoolSize: isProd ? 50 : 10,
    minPoolSize: isProd ? 10 : 2,
    socketTimeoutMS: 45_000,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 10_000,
    heartbeatFrequencyMS: isProd ? 10_000 : 30_000,
    retryWrites: true,
    retryReads: true,
    writeConcern: {
      w: isProd ? 'majority' : 1,
      j: isProd,
    },
    readPreference: 'primaryPreferred',

    // === Compression ===
    compressors: ['snappy', 'zlib'],
  };
}


export function getMongoMiniAppConfig(config: ConfigService): MongooseModuleOptions {
  return {
    uri: config.get<string>('MONGODB_URI_MINIAPP'),
    maxPoolSize: 5,
    minPoolSize: 1,
    socketTimeoutMS: 30_000,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 10_000,
    heartbeatFrequencyMS: 30_000,
    retryWrites: true,
    retryReads: true,
    writeConcern: { w: 1, j: false },
    readPreference: 'primary',
    compressors: ['snappy', 'zlib'],
  };
}



/**
 * Index migration script suggestions.
 * Run these on MongoDB to prepare for sharding:
 *
 * // Enable sharding on database
 * sh.enableSharding("trelk")
 *
 * // Shard command_ratings by command slug
 * sh.shardCollection("trelk.command_ratings", { command: 1 })
 *
 * // Shard histories by userId (hashed for even distribution)
 * sh.shardCollection("trelk.histories", { userId: "hashed" })
 *
 * // Shard notifications by userId
 * sh.shardCollection("trelk.notifications", { userId: "hashed" })
 */
export const SHARDING_NOTES = {
  collections: {
    command_ratings: { shardKey: { command: 1 }, type: 'range' },
    histories: { shardKey: { userId: 'hashed' }, type: 'hashed' },
    notifications: { shardKey: { userId: 'hashed' }, type: 'hashed' },
    abuse_records: { shardKey: { userId: 'hashed' }, type: 'hashed' },
  },
};
