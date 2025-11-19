import { Component, OnInit } from '@angular/core';
import { ProgressService, ProgressData } from '../../services/progress.service';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexStroke,
  ApexTitleSubtitle,
  ApexLegend,
  ApexTooltip,
  ApexFill
} from 'ng-apexcharts';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  title: ApexTitleSubtitle;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  fill: ApexFill;
};

@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: ['./progress.component.css']
})
export class ProgressComponent implements OnInit {
  public chartOptions: Partial<ChartOptions>;
  loading = false;
  error: string | null = null;

  constructor(private progressService: ProgressService) {
    this.chartOptions = {
      series: [
        {
          name: 'Intensitate (antrenamente/lună)',
          type: 'column',
          data: []
        },
        {
          name: 'Greutate medie (kg)',
          type: 'line',
          data: []
        }
      ],
      chart: {
        height: 400,
        type: 'area',
        toolbar: {
          show: true
        },
        zoom: {
          enabled: true
        },
        stacked: false
      },
      stroke: {
        width: [0, 3],
        curve: 'smooth'
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        }
      },
      dataLabels: {
        enabled: true,
        enabledOnSeries: [1]
      },
      xaxis: {
        categories: [],
        title: {
          text: 'Lună'
        }
      },
      yaxis: [
        {
          title: {
            text: 'Număr antrenamente'
          }
        },
        {
          opposite: true,
          title: {
            text: 'Greutate medie (kg)'
          }
        }
      ],
      title: {
        text: 'Progress - Intensitate și Greutate Medie',
        align: 'left'
      },
      legend: {
        position: 'top'
      },
      tooltip: {
        shared: true,
        intersect: false
      }
    };
  }

  ngOnInit(): void {
    this.loadProgressData();
  }

  loadProgressData(): void {
    this.loading = true;
    this.error = null;

    this.progressService.getProgressData().subscribe({
      next: (data: ProgressData) => {
        this.chartOptions.series = [
          {
            name: 'Intensitate (antrenamente/lună)',
            type: 'column',
            data: data.intensity
          },
          {
            name: 'Greutate medie (kg)',
            type: 'area',
            data: data.averageWeight
          }
        ];
        this.chartOptions.xaxis = {
          ...this.chartOptions.xaxis,
          categories: data.months
        };
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading progress data:', err);
        this.error = 'Eroare la încărcarea datelor de progres';
        this.loading = false;
      }
    });
  }
}

