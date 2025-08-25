import { IsString } from 'class-validator';

export class GetFareQuoteDto {
  @IsString()
  ResultToken: string;
}
