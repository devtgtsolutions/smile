import { Module } from '@nestjs/common';
import { HelpRequestController } from './help-request.controller';
import { HelpRequestService } from './help-request.service';
import { GameModule } from '../game/game.module';

@Module({
  imports: [GameModule], 
  controllers: [HelpRequestController],
  providers: [HelpRequestService],
})
export class HelpRequestModule {}