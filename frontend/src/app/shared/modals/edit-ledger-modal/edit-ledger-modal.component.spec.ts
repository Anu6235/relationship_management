import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLedgerModalComponent } from './edit-ledger-modal.component';

describe('EditLedgerModalComponent', () => {
  let component: EditLedgerModalComponent;
  let fixture: ComponentFixture<EditLedgerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditLedgerModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditLedgerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
