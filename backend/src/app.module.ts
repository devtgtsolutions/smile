import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { RoomModule } from './modules/room/room.module';
import { GameModule } from './modules/game/game.module';

@Module({
  imports: [AuthModule, QuizModule, RoomModule, GameModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
