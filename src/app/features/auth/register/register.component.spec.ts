import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../../core/auth.service';
import { UserProfileService } from '../../../core/user-profile.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { register: jasmine.createSpy('register') } },
      ],
    })
    .overrideComponent(RegisterComponent, {
      set: {
        providers: [
          { provide: UserProfileService, useValue: { createEmployeeProfile: jasmine.createSpy('createEmployeeProfile') } },
        ],
      },
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
