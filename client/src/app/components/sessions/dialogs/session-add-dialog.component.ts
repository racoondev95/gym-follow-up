import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SessionsService } from '../../../services/sessions.service';
import { ExercisesService } from '../../../services/exercises.service';
import { AuthService } from '../../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-session-add-dialog',
  templateUrl: './session-add-dialog.component.html',
  styleUrls: ['./session-add-dialog.component.css']
})
export class SessionAddDialogComponent implements OnInit {
  sessionForm: FormGroup;
  exercisesFormArray: FormArray;
  loading = false;
  error: string | null = null;
  showExerciseForm = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SessionAddDialogComponent>,
    private sessionsService: SessionsService,
    private exercisesService: ExercisesService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.sessionForm = this.fb.group({
      name: [''],
      sessionDate: [null, [Validators.required]],
      sessionTime: ['', [Validators.required]],
      exercises: this.fb.array([])
    });
    this.exercisesFormArray = this.sessionForm.get('exercises') as FormArray;
  }

  ngOnInit(): void {
    // Set default date and time to now
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    this.sessionForm.patchValue({
      sessionDate: date,
      sessionTime: time
    });
  }

  addExerciseForm(): void {
    const exerciseForm = this.fb.group({
      name: ['', [Validators.required]],
      numberOfSeries: [''],
      rangeRepsPerSeries: [''],
      weightOnLastSeries: [''],
      repsOnLastSeries: ['']
    });
    this.exercisesFormArray.push(exerciseForm);
    this.showExerciseForm = true;
  }

  removeExerciseForm(index: number): void {
    this.exercisesFormArray.removeAt(index);
    if (this.exercisesFormArray.length === 0) {
      this.showExerciseForm = false;
    }
  }

  onSubmit(): void {
    if (this.sessionForm.valid) {
      this.loading = true;
      this.error = null;

      // Prepare exercises data
      const exercises = this.exercisesFormArray.value.map((exercise: any) => ({
        name: exercise.name,
        numberOfSeries: exercise.numberOfSeries ? parseInt(exercise.numberOfSeries) : undefined,
        rangeRepsPerSeries: exercise.rangeRepsPerSeries || undefined,
        weightOnLastSeries: exercise.weightOnLastSeries ? parseFloat(exercise.weightOnLastSeries) : undefined,
        repsOnLastSeries: exercise.repsOnLastSeries ? parseInt(exercise.repsOnLastSeries) : undefined
      })).filter((exercise: any) => exercise.name); // Only include exercises with a name

      // Combine date and time
      const date = this.sessionForm.value.sessionDate;
      const time = this.sessionForm.value.sessionTime;
      const [hours, minutes] = time.split(':');
      const combinedDate = new Date(date);
      combinedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const sessionData = {
        name: this.sessionForm.value.name || undefined,
        sessionDate: combinedDate.toISOString(),
        exercises: exercises.length > 0 ? exercises : undefined
      };

      this.sessionsService.createSession(sessionData).subscribe({
        next: (session) => {
          this.loading = false;
          const message = exercises.length > 0 
            ? 'Session and exercises created successfully!'
            : 'Session created successfully!';
          this.snackBar.open(message, 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close('created');
        },
        error: (err) => {
          this.error = err.error?.error || 'Error creating session';
          this.snackBar.open(this.error || 'Error creating session', 'Close', {
            duration: 5000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          });
          this.loading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

