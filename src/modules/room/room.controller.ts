import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';

// @UseGuards(AuthGuard('jwt-access'))
@Controller('rooms')
export class RoomController {
  constructor(private roomService: RoomService) {}

  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomService.create(dto);
  }

  @Get()
  findAll() {
    return this.roomService.findAll();
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.roomService.findOne(id);
  // }
  @Get(':id')
findOne(@Param('id') id: string) {
  return this.roomService.findOneDetailed(id);
}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoomDto>) {
    return this.roomService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomService.remove(id);
  }
  @Post(':id/restart')
restart(@Param('id') id: string) {
  return this.roomService.restartRoom(id);
}

@Post(':id/start-session')
startSession(@Param('id') id: string, @Body() dto: { durationMinutes: number }) {
  return this.roomService.startRoomSession(id, dto.durationMinutes);
}
}