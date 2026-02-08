import { Module } from '@nestjs/common';
import { LiftService } from './api/lift.service';
import { LiftGateway } from './api/lift.gateway';

@Module({
  providers: [LiftService, LiftGateway],
  exports: [LiftService],
})
export class LiftModule {}
