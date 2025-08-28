import { IsString, IsNumber, IsArray, IsOptional, ValidateNested, IsIn, IsDateString, MinLength, IsDate, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';


export class PassengerDto{

 @IsString()
 Title:string

 @IsString()
 IsLeadPax:string

 @IsString()
 @MinLength(2)
 FirstName:string

 @IsString()
 @MinLength(2)
 LastName:string

 @IsString()
 PaxType:string


@IsString()
Gender:string

@IsDateString()
@IsOptional()
DateOfBirth:string

@IsOptional()
@IsString()
PassportNumber:string

@IsOptional()
@IsDateString()
PassportExpiry:string


@IsString()
CountryCode:string

@IsString()
CountryName:string

@Type(()=>Number)
@IsNumber()
ContactNo:number

@IsString()
City:string

@Type(()=>Number)
@IsNumber()
PinCode:number

@IsString()
AddressLine1:string

@IsString()
@IsOptional()
AddressLine2:string

@IsString()
Email:string

@IsString()
@IsOptional()
BaggageId:string

@IsString()
@IsOptional()
MealId:string

@IsString()
@IsOptional()
SeatId:string

}

export class BookingDto{

    @IsString() 
 AppReference:string
 
 @Type(()=>Number)
 @IsNumber()
 SequenceNumber:number

 @IsString()
 ResultToken:string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  Passengers: PassengerDto[];


}