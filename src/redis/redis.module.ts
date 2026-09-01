import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { SessionGateway } from './sessionGateway';

@Global() // available everywhere without re-importing — handy since Game/Quiz/Room all need it
@Module({
  providers: [RedisService, SessionGateway],
  exports: [RedisService, SessionGateway],
})
export class RedisModule {}