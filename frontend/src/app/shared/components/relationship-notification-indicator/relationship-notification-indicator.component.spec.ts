import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationshipNotificationIndicatorComponent } from './relationship-notification-indicator.component';

describe('RelationshipNotificationIndicatorComponent', () => {
  let component: RelationshipNotificationIndicatorComponent;
  let fixture: ComponentFixture<RelationshipNotificationIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationshipNotificationIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationshipNotificationIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
