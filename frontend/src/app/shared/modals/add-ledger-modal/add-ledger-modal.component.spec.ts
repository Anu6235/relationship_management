import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLedgerModalComponent } from './add-ledger-modal.component';

describe('AddLedgerModalComponent', () => {
  let component: AddLedgerModalComponent;
  let fixture: ComponentFixture<AddLedgerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddLedgerModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddLedgerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
