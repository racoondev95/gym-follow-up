import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionsService } from '../../../services/sessions.service';

@Component({
  selector: 'app-session-delete-dialog',
  templateUrl: './session-delete-dialog.component.html',
  styleUrls: ['./session-delete-dialog.component.css']
})
export class SessionDeleteDialogComponent {
  loading = false;
  error: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<SessionDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sessionsService: SessionsService,
    private snackBar: MatSnackBar
  ) {}

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onDelete(): void {
    this.loading = true;
    this.error = null;

    this.sessionsService.deleteSession(this.data.id).subscribe({
      next: () => {
        this.snackBar.open('Session deleted successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.dialogRef.close('deleted');
      },
      error: (err) => {
        this.error = err.error?.error || 'Error deleting session';
        this.snackBar.open(this.error || 'Error deleting session', 'Close', {
          duration: 5000,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

