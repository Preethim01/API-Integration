
import { firstValueFrom } from 'rxjs';
 
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

 
@Injectable()
export class ApiService {
  constructor(private readonly http: HttpService) {}
 
  async searchFlights(payload: any): Promise<any[]> {
    let req = {
      AdultCount: Number(payload.AdultCount),
      ChildCount: Number(payload.ChildCount),
      InfantCount: Number(payload.InfantCount),
      JourneyType: payload.JourneyType,
      PreferredAirlines: payload.PreferredAirlines?.length ? payload.PreferredAirlines : [],
 
      CabinClass: payload.CabinClass,
      Segments: [
        {
          Origin: payload.Segments?.[0]?.Origin,
          Destination: payload.Segments?.[0]?.Destination,
          DepartureDate: payload.Segments?.[0]?.DepartureDate,
        },
      ],
    };
   
    const response = await firstValueFrom(
      this.http.post(
        'http://test.services.travelomatix.com/webservices/index.php/flight/service/Search',
        req,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-Username':'test245274',
            'x-DomainKey':'TMX3372451534825527',
           'x-Password':'test@245',
           'x-system':'test'
 
          },
        }
      )
    );
 
    return response.data
  }
 
 
 
  async fetchFareRules(payload: { ResultToken: string }): Promise<any[]> {
    const req = {
      ResultToken: payload.ResultToken
    };
 
    const response = await firstValueFrom(
      this.http.post(
        'http://test.services.travelomatix.com/webservices/index.php/flight/service/FareRule',
        req,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-Username': 'test245274',
            'x-DomainKey': 'TMX3372451534825527',
            'x-Password': 'test@245',
            'x-system': 'test'
          },
        }
      )
    );
 
    return response.data;
  }
 
 
async FetchFareQuote(payload:any):Promise<any[]>{
 
  const req = {
    ResultToken: payload.ResultToken
  };
 
    const response=await firstValueFrom(
 
        this.http.post('http://test.services.travelomatix.com/webservices/index.php/flight/service/UpdateFareQuote',
        req,{
 
            headers:{
                'Content-Type': 'application/json',
                'x-Username': 'test245274',
            'x-DomainKey': 'TMX3372451534825527',
            'x-Password': 'test@245',
            'x-system': 'test'
            }
        }
       
       
        )
 
 
    )
 
return response.data
 
}
async commitBooking(payload: any): Promise<any[]> {
  const req = {
    AppReference: payload.AppReference,
    SequenceNumber: payload.SequenceNumber,
    ResultToken: payload.ResultToken,
    Passengers: payload.Passengers
  };

  const response = await firstValueFrom(
    this.http.post(
      'http://test.services.travelomatix.com/webservices/index.php/flight/service/CommitBooking',
      req,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-Username': 'test245274',
          'x-DomainKey': 'TMX3372451534825527',
          'x-Password': 'test@245',
          'x-system': 'test',
        },
      }
    )
  );

  return response.data;
}

}