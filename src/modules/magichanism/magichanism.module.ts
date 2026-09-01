import { Module } from '@nestjs/common';
import { MagichanismController } from './magichanism.controller';
import { MagichanismService } from './magichanism.service';

@Module({
  controllers: [MagichanismController],
  providers: [MagichanismService],
  exports: [MagichanismService],
})
export class MagichanismModule {}