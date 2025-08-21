// get-fare-quote.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class GetFareQuoteDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}