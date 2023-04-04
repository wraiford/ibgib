import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { EncryptionModalFormComponent } from './encryption-modal-form.component';

describe(EncryptionModalFormComponent.name, () => {
  let component: EncryptionModalFormComponent;
  let fixture: ComponentFixture<EncryptionModalFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: EncryptionModalFormComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(EncryptionModalFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
