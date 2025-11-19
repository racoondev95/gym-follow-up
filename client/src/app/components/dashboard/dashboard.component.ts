import { Component, OnInit, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  opened = true;
  currentUser: any = null;
  isMobile = false;
  loading$: Observable<boolean>;
  imageError = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) {
    this.loading$ = this.loadingService.loading$;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.opened = false;
    } else {
      this.opened = true;
    }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngAfterViewInit(): void {
    // Check screen size after view initialization to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.checkScreenSize();
      this.cdr.detectChanges();
    }, 0);
  }

  toggleSidebar(): void {
    this.opened = !this.opened;
  }

  getProfilePictureUrl(): string {
    if (this.currentUser?.profilePicturePath) {
      return `${environment.apiUrl.replace('/api', '')}${this.currentUser.profilePicturePath}`;
    }
    return '';
  }

  onImageError(event: Event): void {
    this.imageError = true;
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

