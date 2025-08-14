import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';

@Injectable()
export class FareQuoteService {
  constructor(private readonly http: HttpService) {}

  formatFareQuote(raw: any, customToken: string, providerResultToken: string) {
    const journey = raw?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;
    const price = journey?.Price ?? null;

    return {
      Status: raw?.Status ?? 0,
      Message: raw?.Message ?? '',
      UpdateFareQuote: {
        FareQuoteDetails: {
          JourneyList: {
            FlightDetails: {
              Details: (journey?.FlightDetails?.Details ?? []).map((flightArray: any[]) =>
                flightArray.map((flight: any) => ({
                  Origin: {
                    AirportCode: flight?.Origin?.AirportCode ?? null,
                    CityName: flight?.Origin?.CityName ?? null,
                    AirportName: flight?.Origin?.AirportName ?? null,
                    DateTime: flight?.Origin?.DateTime ?? null,
                    Terminal: flight?.Origin?.Terminal ?? null,
                    FDTV: flight?.Origin?.FDTV ?? null,
                  },
                  Destination: {
                    AirportCode: flight?.Destination?.AirportCode ?? null,
                    CityName: flight?.Destination?.CityName ?? null,
                    AirportName: flight?.Destination?.AirportName ?? null,
                    DateTime: flight?.Destination?.DateTime ?? null,
                    Terminal: flight?.Destination?.Terminal ?? null,
                    FDTV: flight?.Destination?.FDTV ?? null,
                  },
                  OperatorCode: flight?.OperatorCode ?? null,
                  DisplayOperatorCode: flight?.DisplayOperatorCode ?? null,
                  ValidatingAirline: flight?.ValidatingAirline ?? null,
                  OperatorName: flight?.OperatorName ?? null,
                  FlightNumber: flight?.FlightNumber ?? null,
                  CabinClass: flight?.CabinClass ?? null,
                  Operatedbyairline: flight?.Operatedbyairline ?? null,
                  Operatedbyairlinename: flight?.Operatedbyairlinename ?? null,
                  Duration: flight?.Duration ?? null,
                  Attr: {
                    Baggage: flight?.Attr?.Baggage ?? null,
                    CabinBaggage: flight?.Attr?.CabinBaggage ?? null,
                  },
                  stop_over: flight?.stop_over ?? null,
                })),
              ),
            },
            Price: {
              Currency: price?.Currency ?? null,
              TotalDisplayFare: price?.TotalDisplayFare ?? null,
              PriceBreakup: {
                BasicFare: price?.PriceBreakup?.BasicFare ?? null,
                Tax: price?.PriceBreakup?.Tax ?? null,
                AgentCommission: price?.PriceBreakup?.AgentCommission ?? null,
                AgentTdsOnCommision: price?.PriceBreakup?.AgentTdsOnCommision ?? null,
              },
              PassengerBreakup: price?.PassengerBreakup ?? {},
            },
            ResultToken: providerResultToken,
            Attr: {
              IsRefundable: journey?.Attr?.IsRefundable ?? null,
              AirlineRemark: journey?.Attr?.AirlineRemark ?? null,
              FareType: journey?.Attr?.FareType ?? null,
              IsLCC: journey?.Attr?.IsLCC ?? null,
              ExtraBaggage: journey?.Attr?.ExtraBaggage ?? null,
              conditions: journey?.Attr?.conditions ?? null,
            },
            HoldTicket: journey?.HoldTicket ?? false,
          },
        },
      },
      customToken,
    };
  }

  async FetchFareQuoteFromApi(apiResultToken: string) {
    try {
      const apiRes = await firstValueFrom(
        this.http.post(
          'http://test.services.travelomatix.com/webservices/index.php/flight/service/UpdateFareQuote',
          { ResultToken: apiResultToken },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-Username': 'test245274',
              'x-Password': 'test@245',
              'x-DomainKey': 'TMX3372451534825527',
              'x-System': 'test',
            },
          },
        ),
      );

      // Check if the response data is valid before proceeding
      if (!apiRes || !apiRes.data) {
        console.error('API response is empty or invalid.');
        throw new Error('API response is empty or invalid.');
      }

      // Add a log to see the raw API response
      console.log('Raw API Response:', JSON.stringify(apiRes.data, null, 2));

      const providerResultToken = apiRes.data?.UpdateFareQuote?.FareQuoteDetails?.JourneyList?.ResultToken;
      const customToken = uuidv4();
      const formatted = this.formatFareQuote(apiRes.data, customToken, providerResultToken);

      return {
        ...formatted,
        ProviderResultToken: providerResultToken,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error('Axios error fetching fare quote:', error.response?.data || error.message);
      } else {
        console.error('General error fetching fare quote:', error.message);
      }
      throw error;
    }
  }
}