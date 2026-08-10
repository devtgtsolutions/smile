import {
  Body, Controller, Delete, Get, Param, Post, Query,
  UploadedFile, UseGuards, UseInterceptors, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { QuizService } from './quiz.service';
import { QuizImportService } from './quiz-import.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

// @UseGuards(AuthGuard('jwt-access'))
@Controller('quiz')
export class QuizController {
  constructor(
    private quizService: QuizService,
    private importService: QuizImportService,
  ) {}

  @Post()
  create(@Body() dto: CreateQuizDto, @Req() req: any) {
    return this.quizService.create(dto, req.user.userId);
  }

  @Get()
  findAll(@Query('category') category?: string) {
    return this.quizService.findAll({ category });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quizService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizService.remove(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateQuizDto>,
  ) {
    return this.quizService.update(id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('import/json')
  @UseInterceptors(FileInterceptor('file'))
  importJson(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.importService.importFromJson(file.buffer, req.user.userId);
  }

  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    return this.importService.importFromCsv(file.buffer, req.user.userId);
  }

}