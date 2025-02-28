import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarriageRequestModalComponent } from './marriage-request-modal.component';

describe('MarriageRequestModalComponent', () => {
  let component: MarriageRequestModalComponent;
  let fixture: ComponentFixture<MarriageRequestModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarriageRequestModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarriageRequestModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
