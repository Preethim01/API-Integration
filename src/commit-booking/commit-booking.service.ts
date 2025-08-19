
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CommitBookingService {
  constructor(private readonly http: HttpService) {}

  private formatBookingResponse(rawResponse: any) {
    const bookingDetails = rawResponse?.CommitBooking?.BookingDetails;
    if (!bookingDetails) {
      throw new InternalServerErrorException('Invalid response format from provider.');
    }

    const firstFlightSegment = bookingDetails.JourneyList.FlightDetails.Details[0][0];
    const passenger = bookingDetails.PassengerDetails[0];
    const priceBreakup = bookingDetails.Price.PriceBreakup;

    return {
      Status: rawResponse.Status,
      Message: 'Booking confirmed',
      BookingDetails: {
        BookingId: bookingDetails.BookingId,
        PNR: bookingDetails.PNR,
        TicketingTimeLimit: bookingDetails.TicketingTimeLimit,
      },
      Passengers: [
        {
          PassengerId: passenger.PassengerId,
          Title: passenger.Title,
          FirstName: passenger.FirstName,
          LastName: passenger.LastName,
          TicketNumber: passenger.TicketNumber,
        },
      ],
      Flights: [
        {
          Origin: {
            AirportCode: firstFlightSegment.Origin.AirportCode,
            CityName: firstFlightSegment.Origin.CityName,
            DateTime: firstFlightSegment.Origin.DateTime,
          },
          Destination: {
            AirportCode: firstFlightSegment.Destination.AirportCode,
            CityName: firstFlightSegment.Destination.CityName,
            DateTime: firstFlightSegment.Destination.DateTime,
          },
          Airline: {
            OperatorCode: firstFlightSegment.OperatorCode,
            FlightNumber: firstFlightSegment.FlightNumber,
            PNR: firstFlightSegment.AirlinePNR,
            CabinClass: firstFlightSegment.CabinClass,
          },
          Baggage: {
            CabinBaggage: firstFlightSegment.Attr.CabinBaggage,
          },
        },
      ],
      Pricing: {
        Currency: bookingDetails.Price.Currency,
        TotalDisplayFare: bookingDetails.Price.TotalDisplayFare,
        PriceBreakup: {
          BasicFare: priceBreakup.BasicFare,
          Tax: priceBreakup.Tax,
        },
      },
    };
  }

  async commitBooking(payload: any) {
    try {
      const bookingApiUrl = 'http://test.services.travelomatix.com/webservices/index.php/flight/service/CommitBooking';

      const response = await firstValueFrom(
        this.http.post(bookingApiUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-Username': 'test245274',
            'x-Password': 'test@245',
            'x-DomainKey': 'TMX3372451534825527',
            'x-System': 'test',
          },
        }),
        
      );
    console.log('Raw API Response for CommitBooking:', JSON.stringify(response.data, null, 2));

      return this.formatBookingResponse(response.data);
    } catch (error) {
      console.error('CommitBooking error:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data || error.message);
    }
  }
}