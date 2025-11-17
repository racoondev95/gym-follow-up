import { Component, OnInit, OnDestroy } from '@angular/core';
import { PwaService } from '../../services/pwa.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pwa-update',
  template: ''
})
export class PwaUpdateComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  constructor(
    private pwaService: PwaService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Subscribe to update availability
    const updateSub = this.pwaService.updateAvailable$.subscribe(available => {
      if (available) {
        this.showUpdateNotification();
      }
    });

    this.subscriptions.add(updateSub);

    // Check for updates on component initialization
    this.pwaService.checkForUpdate();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private showUpdateNotification(): void {
    const snackBarRef = this.snackBar.open(
      'O nouă versiune este disponibilă!',
      'Actualizează',
      {
        duration: 0, // Don't auto-dismiss
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['update-snackbar']
      }
    );

    snackBarRef.onAction().subscribe(() => {
      this.pwaService.activateUpdate();
    });
  }
}

