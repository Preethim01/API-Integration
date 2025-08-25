import { IsString, IsNotEmpty } from 'class-validator';

export class CommitBookingDto {
  @IsString()
  @IsNotEmpty()
  ResultToken: string; // from FareQuote response

  @IsString()
  @IsNotEmpty()
  AppReference: string; // from /flights/app-reference
}
