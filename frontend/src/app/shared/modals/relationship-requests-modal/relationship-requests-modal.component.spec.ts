import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationshipRequestsModalComponent } from './relationship-requests-modal.component';

describe('RelationshipRequestsModalComponent', () => {
  let component: RelationshipRequestsModalComponent;
  let fixture: ComponentFixture<RelationshipRequestsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationshipRequestsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationshipRequestsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
