import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { FormControl } from '@angular/forms';
import { SessionsService, Session } from '../../services/sessions.service';
import { AuthService } from '../../services/auth.service';
import { SessionViewDialogComponent } from './dialogs/session-view-dialog.component';
import { SessionEditDialogComponent } from './dialogs/session-edit-dialog.component';
import { SessionDeleteDialogComponent } from './dialogs/session-delete-dialog.component';
import { SessionAddDialogComponent } from './dialogs/session-add-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.component.html',
  styleUrls: ['./sessions.component.css']
})
export class SessionsComponent implements OnInit {
  displayedColumns: string[] = ['id', 'name', 'sessionDate', 'exerciseCount', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<Session>([]);
  allSessions: Session[] = [];
  filteredSessions: Session[] = [];
  searchControl = new FormControl('');
  loading = false;
  error: string | null = null;

  // Pagination
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 25, 50];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private sessionsService: SessionsService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilter();
    });
  }

  loadSessions(): void {
    this.loading = true;
    this.error = null;
    this.sessionsService.getSessions().subscribe({
      next: (sessions) => {
        this.allSessions = sessions;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error loading sessions';
        this.loading = false;
        console.error(err);
      }
    });
  }

  applyFilter(): void {
    const filterValue = this.searchControl.value?.toLowerCase().trim() || '';
    
    if (!filterValue) {
      this.filteredSessions = [...this.allSessions];
    } else {
      this.filteredSessions = this.allSessions.filter(session => {
        // Search in all properties
        const nameMatch = (session.name || '').toLowerCase().includes(filterValue);
        const idMatch = session.id.toString().includes(filterValue);
        const dateMatch = new Date(session.sessionDate).toLocaleDateString().toLowerCase().includes(filterValue) ||
                         new Date(session.sessionDate).toISOString().toLowerCase().includes(filterValue);
        const createdAtMatch = new Date(session.createdAt).toLocaleDateString().toLowerCase().includes(filterValue) ||
                               new Date(session.createdAt).toISOString().toLowerCase().includes(filterValue);
        const exerciseCountMatch = (session.exerciseCount?.toString() || '').includes(filterValue);
        
        return nameMatch || idMatch || dateMatch || createdAtMatch || exerciseCountMatch;
      });
    }

    // Reset to first page when filtering
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.updatePaginatedData();
  }

  updatePaginatedData(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = this.filteredSessions.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedData();
  }

  getTotalItems(): number {
    return this.filteredSessions.length;
  }

  openViewDialog(session: Session): void {
    this.sessionsService.getSessionWithExercises(session.id).subscribe({
      next: (sessionData) => {
        const dialogRef = this.dialog.open(SessionViewDialogComponent, {
          width: '600px',
          data: sessionData
        });
      },
      error: (err) => {
        console.error('Error loading session details:', err);
      }
    });
  }

  openEditDialog(session: Session): void {
    this.sessionsService.getSessionWithExercises(session.id).subscribe({
      next: (sessionData) => {
        const dialogRef = this.dialog.open(SessionEditDialogComponent, {
          width: '700px',
          maxHeight: '90vh',
          data: sessionData
        });

        dialogRef.afterClosed().subscribe(result => {
          if (result === 'updated') {
            this.loadSessions();
          }
        });
      },
      error: (err) => {
        console.error('Error loading session details:', err);
        this.snackBar.open('Error loading session details', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  openDeleteDialog(session: Session): void {
    const dialogRef = this.dialog.open(SessionDeleteDialogComponent, {
      width: '400px',
      data: session
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'deleted') {
        this.loadSessions();
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  openAddDialog(): void {
    const dialogRef = this.dialog.open(SessionAddDialogComponent, {
      width: '700px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'created') {
        this.loadSessions();
      }
    });
  }
}

