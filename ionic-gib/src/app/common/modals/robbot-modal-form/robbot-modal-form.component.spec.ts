import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';

import { RobbotModalFormComponent } from './robbot-modal-form.component';

describe(RobbotModalFormComponent.name, () => {
  let component: RobbotModalFormComponent;
  let fixture: ComponentFixture<RobbotModalFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: RobbotModalFormComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(RobbotModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
