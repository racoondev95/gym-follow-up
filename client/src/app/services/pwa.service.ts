import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { BehaviorSubject, Observable, filter } from 'rxjs';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: BeforeInstallPromptEvent | null = null;
  private installableSubject = new BehaviorSubject<boolean>(false);
  public installable$: Observable<boolean> = this.installableSubject.asObservable();
  
  private updateAvailableSubject = new BehaviorSubject<boolean>(false);
  public updateAvailable$: Observable<boolean> = this.updateAvailableSubject.asObservable();

  constructor(private swUpdate: SwUpdate) {
    this.initializePwa();
    this.initializeUpdateCheck();
  }

  private initializePwa(): void {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.promptEvent = e as BeforeInstallPromptEvent;
      this.installableSubject.next(true);
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.promptEvent = null;
      this.installableSubject.next(false);
    });

    // Check if app is already installed
    if (this.isInstalled()) {
      this.installableSubject.next(false);
    }
  }

  async promptInstall(): Promise<boolean> {
    if (!this.promptEvent) {
      return false;
    }

    try {
      // Show the install prompt
      await this.promptEvent.prompt();
      
      // Wait for the user to respond
      const choiceResult = await this.promptEvent.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        this.promptEvent = null;
        this.installableSubject.next(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  isInstalled(): boolean {
    // Check if running as standalone (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check for iOS standalone mode
    if ((window.navigator as any).standalone === true) {
      return true;
    }

    return false;
  }

  isInstallable(): boolean {
    return this.promptEvent !== null;
  }

  getPromptEvent(): BeforeInstallPromptEvent | null {
    return this.promptEvent;
  }

  private initializeUpdateCheck(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker is not enabled');
      return;
    }

    // Listen for version updates
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
      )
      .subscribe(() => {
        console.log('New version available');
        this.updateAvailableSubject.next(true);
      });

    // Check for updates on initialization
    this.checkForUpdate();

    // Check for updates periodically (every 6 hours)
    setInterval(() => {
      this.checkForUpdate();
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds
  }

  async activateUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }

    try {
      await this.swUpdate.activateUpdate();
      this.updateAvailableSubject.next(false);
      // Reload the page to use the new version
      window.location.reload();
      return true;
    } catch (error) {
      console.error('Error activating update:', error);
      return false;
    }
  }

  checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return Promise.resolve(false);
    }

    return this.swUpdate.checkForUpdate().then(() => {
      return true;
    }).catch(err => {
      console.error('Error checking for updates:', err);
      return false;
    });
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailableSubject.value;
  }
}

