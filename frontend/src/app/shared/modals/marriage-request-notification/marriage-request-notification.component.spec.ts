import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarriageRequestNotificationComponent } from './marriage-request-notification.component';

describe('MarriageRequestNotificationComponent', () => {
  let component: MarriageRequestNotificationComponent;
  let fixture: ComponentFixture<MarriageRequestNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarriageRequestNotificationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarriageRequestNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
