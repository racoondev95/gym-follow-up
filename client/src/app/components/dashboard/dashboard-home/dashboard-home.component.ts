import { Component, OnInit } from '@angular/core';
import { SessionsService, Session } from '../../../services/sessions.service';
import { AuthService, User } from '../../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { SessionComparisonDialogComponent } from '../../sessions/dialogs/session-comparison-dialog.component';
import { ProgressService, ProgressData } from '../../../services/progress.service';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexStroke,
  ApexTitleSubtitle,
  ApexLegend,
  ApexTooltip,
  ApexFill
} from 'ng-apexcharts';

export type ProgressChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  fill: ApexFill;
};

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

  // Progress chart
  progressChartOptions: Partial<ProgressChartOptions>;
  progressLoading = false;

  constructor(
    private sessionsService: SessionsService,
    private authService: AuthService,
    private dialog: MatDialog,
    private progressService: ProgressService
  ) {
    this.progressChartOptions = {
      series: [
        {
          name: 'Intensitate (antrenamente/lună)',
          type: 'column',
          data: []
        },
        {
          name: 'Greutate medie (kg)',
          type: 'area',
          data: []
        }
      ],
      chart: {
        height: 300,
        type: 'area',
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        },
        stacked: false
      },
      stroke: {
        width: [0, 3],
        curve: 'smooth'
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: [],
        title: {
          text: 'Lună'
        }
      },
      yaxis: [
        {
          title: {
            text: 'Număr antrenamente'
          }
        },
        {
          opposite: true,
          title: {
            text: 'Greutate medie (kg)'
          }
        }
      ],
      legend: {
        position: 'top',
        show: true
      },
      tooltip: {
        shared: true,
        intersect: false
      }
    };
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadSessions();
    this.loadProgressData();
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

  loadProgressData(): void {
    this.progressLoading = true;
    this.progressService.getProgressData().subscribe({
      next: (data: ProgressData) => {
        this.progressChartOptions.series = [
          {
            name: 'Intensitate (antrenamente/lună)',
            type: 'column',
            data: data.intensity
          },
          {
            name: 'Greutate medie (kg)',
            type: 'area',
            data: data.averageWeight
          }
        ];
        this.progressChartOptions.xaxis = {
          ...this.progressChartOptions.xaxis,
          categories: data.months
        };
        this.progressLoading = false;
      },
      error: (err) => {
        console.error('Error loading progress data:', err);
        this.progressLoading = false;
      }
    });
  }

  openComparisonDialog(): void {
    const isMobile = window.innerWidth < 768;
    const dialogRef = this.dialog.open(SessionComparisonDialogComponent, {
      width: isMobile ? '100vw' : '80%',
      maxWidth: isMobile ? '100vw' : '1400px',
      height: isMobile ? '100vh' : '80%',
      maxHeight: isMobile ? '100vh' : '900px',
      data: { sessions: [] },
      panelClass: isMobile ? 'fullscreen-dialog' : ''
    });

    dialogRef.afterClosed().subscribe(result => {
      // Dialog closed
    });
  }
}
