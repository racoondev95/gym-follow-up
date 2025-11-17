import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  constructor(private loadingService: LoadingService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Show loading for API requests (not for assets)
    if (request.url.includes('/api/')) {
      this.loadingService.show();
    }

    return next.handle(request).pipe(
      finalize(() => {
        if (request.url.includes('/api/')) {
          this.loadingService.hide();
        }
      })
    );
  }
}

