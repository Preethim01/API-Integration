// commit-booking.dto.ts
import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class CommitBookingDto {
  @IsString()
  @IsNotEmpty()
  resultToken: string;   // From FareQuote raw response

  @IsArray()
  passengers: any[];     // Can define schema later (Adult, Child, Infant etc.)
}
