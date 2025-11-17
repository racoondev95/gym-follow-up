import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  currentUser: User | null = null;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  originalFormData: any = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profileService: ProfileService
  ) {
    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      this.profileForm.patchValue({
        email: this.currentUser.email,
        username: this.currentUser.username,
        firstName: this.currentUser.firstName,
        lastName: this.currentUser.lastName
      });
      this.previewUrl = this.currentUser.profilePicturePath 
        ? `${environment.apiUrl.replace('/api', '')}${this.currentUser.profilePicturePath}` 
        : null;
      this.originalFormData = { ...this.profileForm.value, profilePicture: null };
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        this.selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrl = e.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        this.error = 'Please select an image file';
        this.selectedFile = null;
      }
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    if (this.currentUser?.profilePicturePath) {
      this.previewUrl = `${environment.apiUrl.replace('/api', '')}${this.currentUser.profilePicturePath}`;
    } else {
      this.previewUrl = null;
    }
  }

  onSubmit(): void {
    if (this.profileForm.valid) {
      this.loading = true;
      this.error = null;
      this.success = null;

      const formData = new FormData();
      formData.append('email', this.profileForm.value.email);
      formData.append('username', this.profileForm.value.username);
      formData.append('firstName', this.profileForm.value.firstName);
      formData.append('lastName', this.profileForm.value.lastName);
      
      if (this.selectedFile) {
        formData.append('profilePicture', this.selectedFile);
      }

      if (this.currentUser?.id) {
        this.profileService.updateProfile(this.currentUser.id, formData).subscribe({
          next: (user) => {
            this.success = 'Profile updated successfully!';
            this.currentUser = user;
            this.authService.getMe().subscribe(() => {
              this.loadUserProfile();
            });
            this.selectedFile = null;
            this.originalFormData = { ...this.profileForm.value, profilePicture: null };
            this.loading = false;
          },
          error: (err) => {
            this.error = err.error?.error || 'Error updating profile';
            this.loading = false;
          }
        });
      }
    }
  }

  onReset(): void {
    if (this.originalFormData) {
      this.profileForm.patchValue(this.originalFormData);
      this.selectedFile = null;
      if (this.currentUser?.profilePicturePath) {
        this.previewUrl = `http://localhost:3000${this.currentUser.profilePicturePath}`;
      } else {
        this.previewUrl = null;
      }
      this.error = null;
      this.success = null;
    }
  }
}

