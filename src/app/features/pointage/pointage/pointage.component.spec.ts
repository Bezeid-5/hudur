import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { AttendanceService } from '../../../core/attendance.service';
import { PointageComponent } from './pointage.component';

describe('PointageComponent', () => {
  let component: PointageComponent;
  let fixture: ComponentFixture<PointageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointageComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { user: signal(null), logout: jasmine.createSpy('logout') },
        },
        {
          provide: AttendanceService,
          useValue: {
            todaySessions: signal([]),
            openSession: signal(null),
            error: signal(null),
            checkIn: jasmine.createSpy('checkIn'),
            checkOut: jasmine.createSpy('checkOut'),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
