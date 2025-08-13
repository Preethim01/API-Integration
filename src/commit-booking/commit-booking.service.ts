import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CommitBookingService {
  constructor(
    private readonly http: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async commitBookingByRedisToken(tokenOrResultToken: string, passengers: any) {
    try {
      let resultToken = tokenOrResultToken;
      if (!resultToken.includes('_*_')) {
        const cachedToken = await this.cacheManager.get<string>(`${tokenOrResultToken}:providerToken`);
        if (!cachedToken) {
          throw new NotFoundException('Provider ResultToken not found or expired in Redis');
        }
        resultToken = cachedToken;
      }

      const body = {
        ResultToken: resultToken,
        ...passengers
      };

      
      console.log('CommitBooking request:', JSON.stringify(body, null, 2));

      const response = await firstValueFrom(
        this.http.post('PROVIDER_BOOKING_URL', body, {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      
      console.log('Provider raw response:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error) {
      console.error('CommitBooking error:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data || error.message);
    }
  }
}
