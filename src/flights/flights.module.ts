import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FlightsApiService } from './flights.service';
import { FlightsApiController } from './flights.controller';

@Module({

    imports: [HttpModule],
    providers:[FlightsApiService],
    controllers:[FlightsApiController]


})
export class FlightsApiModule {}