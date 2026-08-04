import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global() // available everywhere without re-importing — handy since Game/Quiz/Room all need it
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}