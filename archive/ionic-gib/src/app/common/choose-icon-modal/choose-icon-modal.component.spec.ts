import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { getTestBedConfig_Component } from 'src/karma.global';

import { ChooseIconModalComponent } from './choose-icon-modal.component';

describe('ChooseIconModalComponent', () => {
  let component: ChooseIconModalComponent;
  let fixture: ComponentFixture<ChooseIconModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: ChooseIconModalComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(ChooseIconModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(true);
  }));

  it('should create', () => {
    component.handleCancelClick();
    expect(component).toBeTruthy();
  });
});
