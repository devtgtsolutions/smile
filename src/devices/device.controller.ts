import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { DeviceService } from './device.service';
import { UpdateDeviceDto } from './dto/device.dto'; // Remove CreateDeviceDto – replaced by token flow
import { AuthGuard } from '@nestjs/passport';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { ClaimTokenDto } from './dto/claim-token.dto';

@Controller('rooms/:tenantId/devices')
// @UseGuards(AuthGuard('jwt-access')) // Enforce authentication; tenantId extracted from JWT
export class DeviceController {
  constructor(private deviceService: DeviceService) { }

  // List all devices in the room (tenant)
  @Get()
  async getDevices(@Param('tenantId') tenantId: string) {
    return this.deviceService.getDevices(tenantId);
  }

  // Update device metadata (name, type, etc.)
  @Patch(':deviceId')
  async updateDevice(
    @Param('tenantId') tenantId: string,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.deviceService.updateDevice(tenantId, deviceId, dto);
  }

  // Remove a device
  @Delete(':deviceId')
  async deleteDevice(@Param('tenantId') tenantId: string, @Param('deviceId') deviceId: string) {
    return this.deviceService.deleteDevice(tenantId, deviceId);
  }

  // Step 1: Admin generates a registration token
  @Post('generate-token')
  async generateToken(
    @Param('tenantId') tenantId: string,   // ← extract from URL param
    @Body() dto: GenerateTokenDto
  ) {
    return this.deviceService.generateToken(tenantId, dto);
  }

  // Step 2: Tablet claims the token with its unique tabletId
  @Post('claim-token')
  async claimToken(@Body() dto: ClaimTokenDto) {
    return this.deviceService.claimToken(dto);
  }
}