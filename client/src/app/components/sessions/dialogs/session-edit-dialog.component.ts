import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionsService } from '../../../services/sessions.service';
import { ExercisesService } from '../../../services/exercises.service';

@Component({
  selector: 'app-session-edit-dialog',
  templateUrl: './session-edit-dialog.component.html',
  styleUrls: ['./session-edit-dialog.component.css']
})
export class SessionEditDialogComponent implements OnInit {
  editForm: FormGroup;
  exercisesFormArray: FormArray;
  originalData: any;
  loading = false;
  error: string | null = null;
  showExerciseForm = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SessionEditDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sessionsService: SessionsService,
    private exercisesService: ExercisesService,
    private snackBar: MatSnackBar
  ) {
    this.editForm = this.fb.group({
      name: [''],
      sessionDate: ['', [Validators.required]],
      exercises: this.fb.array([])
    });
    this.exercisesFormArray = this.editForm.get('exercises') as FormArray;
  }

  ngOnInit(): void {
    // Format date for input (YYYY-MM-DDTHH:mm)
    const date = new Date(this.data.sessionDate);
    const formattedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    
    // Load existing exercises if available
    if (this.data.exercises && Array.isArray(this.data.exercises)) {
      this.data.exercises.forEach((exercise: any) => {
        this.addExerciseForm(exercise);
      });
    }
    
    this.editForm.patchValue({
      name: this.data.name || '',
      sessionDate: formattedDate
    });

    this.originalData = { ...this.editForm.value };
  }

  addExerciseForm(exerciseData?: any): void {
    const exerciseForm = this.fb.group({
      id: [exerciseData?.id || null],
      name: [exerciseData?.name || '', [Validators.required]],
      numberOfSeries: [exerciseData?.numberOfSeries || ''],
      rangeRepsPerSeries: [exerciseData?.rangeRepsPerSeries || ''],
      weightOnLastSeries: [exerciseData?.weightOnLastSeries || ''],
      repsOnLastSeries: [exerciseData?.repsOnLastSeries || '']
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
    if (this.editForm.valid) {
      this.loading = true;
      this.error = null;

      // Prepare exercises data
      const exercises = this.exercisesFormArray.value.map((exercise: any) => ({
        id: exercise.id || undefined,
        name: exercise.name,
        numberOfSeries: exercise.numberOfSeries ? parseInt(exercise.numberOfSeries) : undefined,
        rangeRepsPerSeries: exercise.rangeRepsPerSeries || undefined,
        weightOnLastSeries: exercise.weightOnLastSeries ? parseFloat(exercise.weightOnLastSeries) : undefined,
        repsOnLastSeries: exercise.repsOnLastSeries ? parseInt(exercise.repsOnLastSeries) : undefined
      })).filter((exercise: any) => exercise.name); // Only include exercises with a name

      const sessionData = {
        name: this.editForm.value.name || undefined,
        sessionDate: new Date(this.editForm.value.sessionDate).toISOString(),
        exercises: exercises.length > 0 ? exercises : undefined
      };

      this.sessionsService.updateSession(this.data.id, sessionData).subscribe({
        next: () => {
          this.snackBar.open('Session updated successfully!', 'Close', {
            duration: 3000,
            horizontalPosition: 'end',
            verticalPosition: 'top',
            panelClass: ['success-snackbar']
          });
          this.dialogRef.close('updated');
        },
        error: (err) => {
          this.error = err.error?.error || 'Error updating session';
          this.snackBar.open(this.error || 'Error updating session', 'Close', {
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

  onReset(): void {
    this.editForm.patchValue({
      name: this.originalData.name || '',
      sessionDate: this.originalData.sessionDate
    });
    
    // Reset exercises array
    while (this.exercisesFormArray.length > 0) {
      this.exercisesFormArray.removeAt(0);
    }
    
    // Reload original exercises
    if (this.data.exercises && Array.isArray(this.data.exercises)) {
      this.data.exercises.forEach((exercise: any) => {
        this.addExerciseForm(exercise);
      });
    }
    
    this.error = null;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
