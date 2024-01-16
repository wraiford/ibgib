

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AngularDelegate, IonicModule, ModalController } from '@ionic/angular';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { getTestBedConfig_Component } from 'src/karma.global';

import { AboutUsPage } from './about-us.page';

describe('AboutUsPage', () => {
  let component: AboutUsPage;
  let fixture: ComponentFixture<AboutUsPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig_Component({
        componentType: AboutUsPage,
        imports: [RouterTestingModule,],
        providers: [
          { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
          ModalController,
          AngularDelegate,
        ]
      })
    ).compileComponents();

    fixture = TestBed.createComponent(AboutUsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});




