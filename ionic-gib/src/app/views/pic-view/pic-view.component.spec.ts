import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { getTestBedConfig_Component } from 'src/karma.global';

import { PicViewComponent } from './pic-view.component';

describe('PicViewComponent', () => {
  let component: PicViewComponent;
  let fixture: ComponentFixture<PicViewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({ componentType: PicViewComponent })
    ).compileComponents();

    fixture = TestBed.createComponent(PicViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
