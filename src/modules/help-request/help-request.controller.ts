import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { HelpRequestService } from './help-request.service';
import { CreateHelpRequestDto } from './dto/create-help-request.dto';
import { UpdateHelpRequestDto } from './dto/update-help-request.dto';

@Controller()
export class HelpRequestController {
  constructor(private helpRequestService: HelpRequestService) {}

  @Get('rooms/:tenantId/help-request')
  getActive(@Param('tenantId') tenantId: string) {
    return this.helpRequestService.findActiveForTenant(tenantId);
  }

  @Post('rooms/:tenantId/help-request')
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateHelpRequestDto) {
    return this.helpRequestService.create(tenantId, dto.reason);
  }

  @Patch('help-requests/:id')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateHelpRequestDto) {
    return this.helpRequestService.updateStatus(id, dto.status);
  }
}