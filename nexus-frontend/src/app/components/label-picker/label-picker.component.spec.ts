import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LabelPickerComponent } from './label-picker.component';

describe('LabelPickerComponent', () => {
  let component: LabelPickerComponent;
  let fixture: ComponentFixture<LabelPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LabelPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
