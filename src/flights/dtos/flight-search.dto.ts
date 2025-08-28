import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsIn, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class Segment {
  @IsString()
  Origin: string;

  @IsString()
  Destination: string;

  @IsDateString()
  DepartureDate: string;

  @IsOptional()
  @IsDateString()
  ReturnDate?: string;
}

export class FlightSearchDto {
  @Type(() => Number)
  @IsNumber()
  AdultCount: number;

  @Type(() => Number)
  @IsNumber()
  ChildCount: number;

  @Type(() => Number)
  @IsNumber()
  InfantCount: number;

  @IsIn(['OneWay', 'Return', 'Multicity'])
  JourneyType: 'OneWay' | 'Return' | 'Multicity';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  PreferredAirlines?: string[];

  @IsIn(['Economy', 'Business', 'First', 'PremiumEconomy', 'PremiumBusiness'])
  CabinClass: 'Economy' | 'Business' | 'First' | 'PremiumEconomy' | 'PremiumBusiness';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Segment)
  Segments: Segment[];
}