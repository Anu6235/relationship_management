import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarriageConfirmationModalComponent } from './marriage-confirmation-modal.component';

describe('MarriageConfirmationModalComponent', () => {
  let component: MarriageConfirmationModalComponent;
  let fixture: ComponentFixture<MarriageConfirmationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarriageConfirmationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarriageConfirmationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
