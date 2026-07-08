import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns a welcome message or health status.' })
  @ApiResponse({ status: 200, description: 'Health check or welcome message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get(['api', 'api/health'])
  @ApiOperation({ summary: 'API health check', description: 'Health endpoint for gateways and load balancers.' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  getApiHealth(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Post('api/errors')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Report client error', description: 'Logs client-side errors (e.g. from frontend) for debugging.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', description: 'Error message' },
        stack: { type: 'string', description: 'Stack trace' },
        componentStack: { type: 'string', description: 'React component stack' },
        timestamp: { type: 'string', description: 'ISO timestamp' },
        userAgent: { type: 'string', description: 'Browser user agent' },
        url: { type: 'string', description: 'Page URL where error occurred' },
      },
    },
  })
  @ApiResponse({ status: 204, description: 'Error logged successfully' })
  reportError(
    @Body()
    body: {
      error?: string;
      stack?: string;
      componentStack?: string;
      timestamp?: string;
      userAgent?: string;
      url?: string;
    },
  ) {
    console.error('[Client Error]', JSON.stringify(body, null, 2));
    return;
  }
}
