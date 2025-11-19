import { Component, OnInit } from '@angular/core';
import { SessionsService, Session } from '../../../services/sessions.service';
import { AuthService, User } from '../../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SessionComparisonDialogComponent } from '../../sessions/dialogs/session-comparison-dialog.component';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.css']
})
export class DashboardHomeComponent implements OnInit {
  currentUser: User | null = null;
  sessions: Session[] = [];
  loading = false;

  // Stats
  todaySessions: number = 0;
  weekSessions: number = 0;
  monthSessions: number = 0;

  constructor(
    private sessionsService: SessionsService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading = true;
    this.sessionsService.getSessions().subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    this.todaySessions = this.sessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return sessionDate >= today;
    }).length;

    this.weekSessions = this.sessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return sessionDate >= weekAgo;
    }).length;

    this.monthSessions = this.sessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return sessionDate >= monthAgo;
    }).length;
  }

  getProfilePictureUrl(): string {
    if (this.currentUser?.profilePicturePath) {
      return `http://localhost:3000${this.currentUser.profilePicturePath}`;
    }
    return '';
  }

  openComparisonDialog(): void {
    const dialogRef = this.dialog.open(SessionComparisonDialogComponent, {
      width: '80%',
      maxWidth: '1400px',
      height: '80%',
      maxHeight: '900px',
      data: { sessions: [] }
    });

    dialogRef.afterClosed().subscribe(result => {
      // Dialog closed
    });
  }
}
