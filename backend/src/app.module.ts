import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LiftModule } from './lift/lift.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LiftModule,
  ],
})
export class AppModule {}
