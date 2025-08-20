import { IsNotEmpty, IsInt, Min, ValidateNested,IsIn } from 'class-validator';
import { Type } from 'class-transformer';

class SegmentDto {
  @IsNotEmpty()
  Origin: string;

  @IsNotEmpty()
  Destination: string;

  @IsNotEmpty()
  DepartureDate: string;
}

export class SearchFlightDto {
  @IsInt()
  @Min(1, { message: 'Adult count must be at least 1' })
  AdultCount: number;

  @IsInt()
  @Min(0)
  ChildCount: number;

  @IsInt()
  @Min(0)
  InfantCount: number;

  @IsNotEmpty()
  JourneyType: string;

  @ValidateNested({ each: true })
  @Type(() => SegmentDto)
  Segments: SegmentDto[];

   @IsNotEmpty()
  @IsIn(['Economy', 'Business', 'First'], { message: 'Invalid cabin class' })
  CabinClass: string;
}