import { Module } from '@nestjs/common';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { HttpModule } from '@nestjs/axios'; // Add this import

@Module({
  imports: [
    HttpModule // Add this line to the imports array
  ],
  controllers: [FlightsController],
  providers: [FlightsService],
})
export class FlightsModule {}