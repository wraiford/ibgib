import { ComponentFixture, TestBed } from '@angular/core/testing';
import { getTestBedConfig_Component } from 'src/karma.global';

import { ActionBarComponent } from './action-bar.component';

describe('ActionBarComponent', () => {
  let component: ActionBarComponent;
  let fixture: ComponentFixture<ActionBarComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: ActionBarComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(ActionBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
