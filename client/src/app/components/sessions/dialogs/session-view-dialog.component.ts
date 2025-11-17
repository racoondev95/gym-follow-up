import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-session-view-dialog',
  templateUrl: './session-view-dialog.component.html',
  styleUrls: ['./session-view-dialog.component.css']
})
export class SessionViewDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SessionViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
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

  close(): void {
    this.dialogRef.close();
  }
}

