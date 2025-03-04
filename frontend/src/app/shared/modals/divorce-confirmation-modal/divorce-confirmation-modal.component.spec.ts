import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DivorceConfirmationModalComponent } from './divorce-confirmation-modal.component';

describe('DivorceConfirmationModalComponent', () => {
  let component: DivorceConfirmationModalComponent;
  let fixture: ComponentFixture<DivorceConfirmationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DivorceConfirmationModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DivorceConfirmationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
