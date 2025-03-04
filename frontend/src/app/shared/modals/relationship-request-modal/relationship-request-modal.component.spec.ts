import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationshipRequestModalComponent } from './relationship-request-modal.component';

describe('RelationshipRequestModalComponent', () => {
  let component: RelationshipRequestModalComponent;
  let fixture: ComponentFixture<RelationshipRequestModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationshipRequestModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationshipRequestModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
