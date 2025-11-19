import { Component, OnInit, Inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SessionsService } from '../../../services/sessions.service';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

interface Exercise {
  id?: number;
  name: string;
  numberOfSeries?: number;
  rangeRepsPerSeries?: string;
  weightOnLastSeries?: number;
  repsOnLastSeries?: number;
}

interface SessionWithExercises {
  id: number;
  name?: string;
  sessionDate: string;
  exercises: Exercise[];
}

interface ExerciseComparison {
  exercise: Exercise;
  previousWeight?: number;
  currentWeight?: number;
  weightDifference?: number;
}

@Component({
  selector: 'app-session-comparison-dialog',
  templateUrl: './session-comparison-dialog.component.html',
  styleUrls: ['./session-comparison-dialog.component.css']
})
export class SessionComparisonDialogComponent implements OnInit {
  sessions: SessionWithExercises[] = [];
  
  // Left side (previous session)
  leftSearchControl = new FormControl('');
  leftFilteredSessions: Observable<SessionWithExercises[]>;
  leftSelectedSession: SessionWithExercises | null = null;
  leftLoading = false;
  
  // Right side (current session)
  rightSearchControl = new FormControl('');
  rightFilteredSessions: Observable<SessionWithExercises[]>;
  rightSelectedSession: SessionWithExercises | null = null;
  rightLoading = false;
  
  // Comparison data
  exerciseComparisons: ExerciseComparison[] = [];
  hasComparableExercises: boolean = false;
  
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<SessionComparisonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { sessions: SessionWithExercises[] },
    private sessionsService: SessionsService
  ) {
    this.sessions = data.sessions || [];
    
    // Setup filtered sessions for left side
    this.leftFilteredSessions = this.leftSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterSessions(value || '', this.sessions))
    );
    
    // Setup filtered sessions for right side
    this.rightFilteredSessions = this.rightSearchControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterSessions(value || '', this.sessions))
    );
  }

  ngOnInit(): void {
    this.loadAllSessions();
  }

  loadAllSessions(): void {
    this.loading = true;
    this.sessionsService.getSessions().subscribe({
      next: (sessions) => {
        // Load exercises for each session
        const loadPromises = sessions.map(session => 
          this.sessionsService.getSessionWithExercises(session.id).toPromise()
        );
        
        Promise.all(loadPromises).then(sessionsWithExercises => {
          this.sessions = sessionsWithExercises.filter(s => s !== null) as SessionWithExercises[];
          this.loading = false;
        }).catch(err => {
          console.error('Error loading sessions with exercises:', err);
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Error loading sessions:', err);
        this.loading = false;
      }
    });
  }

  private _filterSessions(value: string, sessions: SessionWithExercises[]): SessionWithExercises[] {
    const filterValue = value.toLowerCase();
    return sessions.filter(session => {
      const nameMatch = session.name?.toLowerCase().includes(filterValue) || false;
      const dateMatch = new Date(session.sessionDate).toLocaleDateString().toLowerCase().includes(filterValue);
      return nameMatch || dateMatch;
    });
  }

  onLeftSessionSelected(session: SessionWithExercises): void {
    this.leftSelectedSession = session;
    this.updateComparison();
  }

  onRightSessionSelected(session: SessionWithExercises): void {
    this.rightSelectedSession = session;
    this.updateComparison();
  }

  updateComparison(): void {
    if (!this.leftSelectedSession || !this.rightSelectedSession) {
      this.exerciseComparisons = [];
      this.hasComparableExercises = false;
      return;
    }

    const previousExercises = this.leftSelectedSession.exercises || [];
    const currentExercises = this.rightSelectedSession.exercises || [];

    // Create a map of previous exercises by name
    const previousExercisesMap = new Map<string, Exercise>();
    previousExercises.forEach(ex => {
      const name = ex.name.toLowerCase().trim();
      if (!previousExercisesMap.has(name) || 
          (ex.weightOnLastSeries && (!previousExercisesMap.get(name)?.weightOnLastSeries || 
           ex.weightOnLastSeries > (previousExercisesMap.get(name)?.weightOnLastSeries || 0)))) {
        previousExercisesMap.set(name, ex);
      }
    });

    // Build comparison array
    this.exerciseComparisons = currentExercises.map(currentEx => {
      const exerciseName = currentEx.name.toLowerCase().trim();
      const previousEx = previousExercisesMap.get(exerciseName);
      
      const comparison: ExerciseComparison = {
        exercise: currentEx,
        currentWeight: currentEx.weightOnLastSeries,
        previousWeight: previousEx?.weightOnLastSeries
      };

      if (comparison.currentWeight && comparison.previousWeight) {
        comparison.weightDifference = comparison.currentWeight - comparison.previousWeight;
      } else if (comparison.currentWeight && !comparison.previousWeight) {
        comparison.weightDifference = comparison.currentWeight;
      }

      return comparison;
    });

    // Check if there are any comparable exercises (exercises with the same name in both sessions)
    this.hasComparableExercises = this.exerciseComparisons.some(comp => {
      const exerciseName = comp.exercise.name.toLowerCase().trim();
      return previousExercisesMap.has(exerciseName);
    });
  }

  getWeightDifferenceText(comparison: ExerciseComparison): string {
    if (comparison.weightDifference === undefined || comparison.weightDifference === null) {
      return '';
    }
    
    // Convert to number if it's not already
    const diff = typeof comparison.weightDifference === 'number' 
      ? comparison.weightDifference 
      : parseFloat(comparison.weightDifference as any);
    
    // Check if it's a valid number
    if (isNaN(diff)) {
      return '';
    }
    
    if (diff > 0) {
      return `+${diff.toFixed(2)} kg`;
    } else if (diff < 0) {
      return `${diff.toFixed(2)} kg`;
    } else {
      return 'No change';
    }
  }

  hasWeightDifference(comparison: ExerciseComparison): boolean {
    return comparison.weightDifference !== undefined && 
           comparison.weightDifference !== null && 
           comparison.weightDifference !== 0;
  }

  isWeightIncrease(comparison: ExerciseComparison): boolean {
    return comparison.weightDifference !== undefined && 
           comparison.weightDifference !== null && 
           comparison.weightDifference > 0;
  }

  isWeightDecrease(comparison: ExerciseComparison): boolean {
    return comparison.weightDifference !== undefined && 
           comparison.weightDifference !== null && 
           comparison.weightDifference < 0;
  }

  formatSessionDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

