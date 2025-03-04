import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombinedConfirmationModalComponent } from './combined-confirmation-modal.component';

describe('CombinedConfirmationModalComponent', () => {
  let component: CombinedConfirmationModalComponent;
  let fixture: ComponentFixture<CombinedConfirmationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CombinedConfirmationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CombinedConfirmationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
