import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditMemberFormComponent } from './edit-member-form.component';

describe('EditMemberFormComponent', () => {
  let component: EditMemberFormComponent;
  let fixture: ComponentFixture<EditMemberFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditMemberFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditMemberFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
