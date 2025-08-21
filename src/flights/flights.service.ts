import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { HttpService } from '@nestjs/axios';

import { firstValueFrom } from 'rxjs';

import { CACHE_MANAGER } from '@nestjs/cache-manager';

import type { Cache } from 'cache-manager';

const SECRET = 'SECRET'; // 🔐 Replace with a strong secret

@Injectable()
export class FlightsService {
  private baseUrl =
    'http://test.services.travelomatix.com/webservices/index.php/flight/service/';

  private headers = {
    'Content-Type': 'application/json',

    'x-Username': 'test245274',

    'x-Password': 'test@245',

    'x-DomainKey': 'TMX3372451534825527',

    'x-System': 'test',
  };

  constructor(
    private readonly http: HttpService,

    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ----------------- API CALL -----------------

  private async callApi(endpoint: string, payload: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await firstValueFrom(
        this.http.post(url, payload, { headers: this.headers }),
      );

      if (response?.data?.Status !== 1) {
        throw new NotFoundException(
          `API Error: ${response?.data?.Message ?? 'Request failed.'}`,
        );
      }

      return response.data;
    } catch (error: any) {
      console.error(`API call to ${endpoint} failed:`, error.message);

      throw new NotFoundException('Error communicating with flight API.');
    }
  }

  // ----------------- HELPERS -----------------

  private formatLocation(raw: any) {
    if (!raw) return null;

    return {
      AirportCode: raw.AirportCode ?? '',

      CityName: raw.CityName ?? '',

      AirportName: raw.AirportName ?? '',

      DateTime: raw.DateTime ?? '',

      Terminal: raw.Terminal ?? '',

      FDTV: raw.FDTV ?? '',
    };
  }

  private formatFlightSegment(raw: any) {
    if (!raw) return null;

    return {
      Origin: this.formatLocation(raw.Origin),

      Destination: this.formatLocation(raw.Destination),

      OperatorCode: raw.OperatorCode ?? '',

      OperatorName: raw.OperatorName ?? '',

      FlightNumber: raw.FlightNumber ?? '',

      Duration: raw.Duration ? Number(raw.Duration) : 0,

      CabinClass: raw.CabinClass ?? '',

      Attr: {
        Baggage: raw.Attr?.Baggage ?? '',

        CabinBaggage: raw.Attr?.CabinBaggage ?? '',

        AvailableSeats: raw.Attr?.AvailableSeats
          ? Number(raw.Attr?.AvailableSeats)
          : null,
      },

      stop_over: raw.stop_over ?? null,
    };
  }

  private formatPrice(raw: any) {
    if (!raw) return null;

    const priceBreakup = raw.PriceBreakup ?? {};

    const passengerBreakup = raw.PassengerBreakup ?? {};

    return {
      Currency: raw.Currency ?? '',

      TotalDisplayFare: raw.TotalDisplayFare ? Number(raw.TotalDisplayFare) : 0,

      PriceBreakup: {
        BasicFare: priceBreakup.BasicFare ? Number(priceBreakup.BasicFare) : 0,

        Tax: priceBreakup.Tax ? Number(priceBreakup.Tax) : 0,

        AgentCommission: priceBreakup.AgentCommission
          ? Number(priceBreakup.AgentCommission)
          : 0,

        AgentTdsOnCommision: priceBreakup.AgentTdsOnCommision
          ? Number(priceBreakup.AgentTdsOnCommision)
          : 0,
      },

      PassengerBreakup: {
        ADT: {
          BasePrice: passengerBreakup.ADT?.BasePrice
            ? Number(passengerBreakup.ADT.BasePrice)
            : 0,

          Tax: passengerBreakup.ADT?.Tax ? Number(passengerBreakup.ADT.Tax) : 0,

          TotalPrice: passengerBreakup.ADT?.TotalPrice
            ? Number(passengerBreakup.ADT.TotalPrice)
            : 0,

          PassengerCount: passengerBreakup.ADT?.PassengerCount
            ? Number(passengerBreakup.ADT.PassengerCount)
            : 0,
        },
      },
    };
  }

  // ----------------- TOKEN -----------------

  private encryptToken(resultToken: string): string {
    return Buffer.from(`${SECRET}|${resultToken}`).toString('base64');
  }

  private decryptToken(encryptedToken: string): string {
    try {
      const decoded = Buffer.from(encryptedToken, 'base64').toString('utf8');

      const parts = decoded.split('|');

      if (parts[0] !== SECRET) throw new Error('Invalid token');

      return parts[1];
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  // ----------------- SEARCH FLIGHTS -----------------

  public async searchFlights(payload: any) {
    const apiResponse = await this.callApi('Search', payload);

    const journeys: any[] =
      apiResponse?.Search?.FlightDataList?.JourneyList || [];

    const formattedJourneys = await Promise.all(
      journeys.map(async (journey) =>
        Promise.all(
          journey.map(async (flight) => {
            const encryptedToken = this.encryptToken(flight.ResultToken);

            const formattedFlight = {
              FlightDetails: {
                Details: (flight.FlightDetails?.Details ?? []).map(
                  (FlightStops: any[]) =>
                    FlightStops.map(this.formatFlightSegment.bind(this)),
                ),
              },

              Price: this.formatPrice(flight.Price),

              Attr: flight.Attr ?? {},

              token: encryptedToken,
            };

            // Store flight in Redis for 1 hour

            await this.cacheManager.set(encryptedToken, formattedFlight, {
              ttl: 3600,
            } as any);

            return formattedFlight;
          }),
        ),
      ),
    );

    return {
      Status: apiResponse?.Status ?? null,

      Message: apiResponse?.Message ?? '',

      Search: { FlightDataList: { JourneyList: formattedJourneys } },
    };
  }

  // ----------------- FARE QUOTE -----------------

  public async getFareQuote(token: string) {
  

    const resultToken = this.decryptToken(token);

    // 3️⃣ Call farequote API
console.log(resultToken);

    const apiResponse = await this.callApi('UpdateFareQuote', {
      ResultToken: resultToken,
    });
console.log(apiResponse);

    const journey =
      apiResponse?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;

    if (!journey)
      throw new NotFoundException('Missing journey details from API');

    // 4️⃣ Format journey details

    const formattedJourney = {
      FlightDetails: {
        Details: (journey.FlightDetails?.Details ?? []).map(
          (flightArray: any[]) =>
            flightArray.map(this.formatFlightSegment.bind(this)),
        ),
      },

      Price: this.formatPrice(journey.Price),

      Attr: journey.Attr ?? {},

      HoldTicket: journey.HoldTicket ?? false,
    };

    return {
      Status: apiResponse?.Status ?? 0,

      Message: apiResponse?.Message ?? '',

      UpdateFareQuote: {
        FareQuoteDetails: {
          JourneyList: formattedJourney,
        },
      },
    };
  }
}
