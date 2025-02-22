import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteMemberModalComponent } from './delete-member-modal.component';

describe('DeleteMemberModalComponent', () => {
  let component: DeleteMemberModalComponent;
  let fixture: ComponentFixture<DeleteMemberModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteMemberModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteMemberModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
