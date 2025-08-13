// src/commit-booking/commit-booking.service.ts
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

    return {
      Status: rawResponse?.Status ?? 0,
      Message: rawResponse?.Message ?? '',
      CommitBooking: {
        BookingDetails: {
          BookingId: bookingDetails?.BookingId ?? null,
          PNR: bookingDetails?.PNR ?? null,
          TicketingTimeLimit: bookingDetails?.TicketingTimeLimit ?? null,
          PassengerDetails: (bookingDetails?.PassengerDetails ?? []).map(pax => ({
            PassengerId: pax?.PassengerId ?? null,
            PassengerType: pax?.PassengerType ?? null,
            Title: pax?.Title ?? null,
            FirstName: pax?.FirstName ?? null,
            LastName: pax?.LastName ?? null,
            TicketNumber: pax?.TicketNumber ?? null,
          })),
          JourneyList: {
            FlightDetails: {
              Details: (bookingDetails?.JourneyList?.FlightDetails?.Details ?? []).map(flightArray =>
                flightArray.map(flight => ({
                  Origin: {
                    AirportCode: flight?.Origin?.AirportCode ?? null,
                    CityName: flight?.Origin?.CityName ?? null,
                    AirportName: flight?.Origin?.AirportName ?? null,
                    DateTime: flight?.Origin?.DateTime ?? null,
                    FDTV: flight?.Origin?.FDTV ?? null,
                    Terminal: flight?.Origin?.Terminal ?? null,
                  },
                  Destination: {
                    AirportCode: flight?.Destination?.AirportCode ?? null,
                    CityName: flight?.Destination?.CityName ?? null,
                    AirportName: flight?.Destination?.AirportName ?? null,
                    DateTime: flight?.Destination?.DateTime ?? null,
                    FATV: flight?.Destination?.FATV ?? null,
                    Terminal: flight?.Destination?.Terminal ?? null,
                  },
                  AirlinePNR: flight?.AirlinePNR ?? null,
                  OperatorCode: flight?.OperatorCode ?? null,
                  DisplayOperatorCode: flight?.DisplayOperatorCode ?? null,
                  OperatorName: flight?.OperatorName ?? null,
                  FlightNumber: flight?.FlightNumber ?? null,
                  CabinClass: flight?.CabinClass ?? null,
                  Attr: {
                    Baggage: flight?.Attr?.Baggage ?? null,
                    CabinBaggage: flight?.Attr?.CabinBaggage ?? null,
                    AvailableSeats: flight?.Attr?.AvailableSeats ?? null,
                  },
                }))
              ),
            },
          },
          Price: bookingDetails?.Price ?? null,
          Attr: bookingDetails?.Attr ?? null,
        },
      },
    };
  }

  async commitBooking(payload: any) {
    try {
      // The API's request body is the same as your provided payload,
      // so you can use it directly.
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

      return this.formatBookingResponse(response.data);
    } catch (error) {
      console.error('CommitBooking error:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data || error.message);
    }
  }
}