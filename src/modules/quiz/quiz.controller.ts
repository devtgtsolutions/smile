import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';

import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';

@Controller('quiz')
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Post()
  create(@Body() dto: CreateQuizDto) {
    return this.quizService.create(dto);
  }

  @Get()
  findAll(@Query() filters: { categoryId?: string; isActive?: boolean }) {
    return this.quizService.findAll(filters);
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
  update(@Param('id') id: string, @Body() dto: Partial<CreateQuizDto>) {
    return this.quizService.update(id, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(@UploadedFile() file: Express.Multer.File) {
    const csvData = file.buffer.toString('utf-8');
    return this.quizService.importFromCsv(csvData);
  }

  // Optionally, you can add JSON import if needed
  @Post('import/json')
  @UseInterceptors(FileInterceptor('file'))
  importJson(@UploadedFile() file: Express.Multer.File) {
    const jsonData = JSON.parse(file.buffer.toString('utf-8'));
    return this.quizService.create(jsonData);
  }
}