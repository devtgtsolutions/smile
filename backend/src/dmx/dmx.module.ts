import { Module, Global } from '@nestjs/common';
import { DmxService } from './dmx.service';

@Global()
@Module({
  providers: [DmxService],
  exports: [DmxService],
})
export class DmxModule {}