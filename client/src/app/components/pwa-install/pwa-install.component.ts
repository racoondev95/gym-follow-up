import { Component, OnInit, OnDestroy } from '@angular/core';
import { PwaService } from '../../services/pwa.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pwa-install',
  templateUrl: './pwa-install.component.html',
  styleUrls: ['./pwa-install.component.css']
})
export class PwaInstallComponent implements OnInit, OnDestroy {
  isInstallable = false;
  showPrompt = false;
  private subscriptions = new Subscription();

  constructor(private pwaService: PwaService) {}

  ngOnInit(): void {
    // Subscribe to installable state
    const installableSub = this.pwaService.installable$.subscribe(installable => {
      this.isInstallable = installable;
      // Show prompt after a delay if installable or iOS
      if ((installable || this.isIOS()) && !this.pwaService.isInstalled()) {
        // Wait 3 seconds before showing prompt
        setTimeout(() => {
          this.showPrompt = true;
        }, 3000);
      } else {
        this.showPrompt = false;
      }
    });

    this.subscriptions.add(installableSub);

    // For iOS, show prompt after delay even if not installable
    if (this.isIOS() && !this.pwaService.isInstalled()) {
      setTimeout(() => {
        if (!sessionStorage.getItem('pwa-install-dismissed')) {
          this.showPrompt = true;
        }
      }, 3000);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async installApp(): Promise<void> {
    const installed = await this.pwaService.promptInstall();
    if (installed) {
      this.showPrompt = false;
    }
  }

  dismissPrompt(): void {
    this.showPrompt = false;
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  }

  shouldShowPrompt(): boolean {
    // Don't show if already dismissed in this session
    if (sessionStorage.getItem('pwa-install-dismissed') === 'true') {
      return false;
    }
    
    // Don't show if already installed
    if (this.pwaService.isInstalled()) {
      return false;
    }

    // Show for installable apps (Chrome, Edge, etc.)
    if (this.showPrompt && this.isInstallable) {
      return true;
    }

    // Show for iOS devices (which don't support beforeinstallprompt)
    if (this.isIOS() && !this.pwaService.isInstalled()) {
      return this.showPrompt;
    }

    return false;
  }

  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  getIOSInstructions(): string {
    if (this.isIOS()) {
      return 'Pentru iOS: Apasă butonul Share și selectează "Adaugă la ecranul de start"';
    }
    return '';
  }
}

