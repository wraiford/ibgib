import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AngularDelegate, ModalController } from '@ionic/angular';
import { IbGibPageModule } from 'src/app/ibgib/ibgib.module';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { DEFAULT_TEST_IMPORTS, getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';

import { ListViewComponent } from './list-view.component';

describe('ListViewComponent', () => {
  let component: ListViewComponent;
  let fixture: ComponentFixture<ListViewComponent>;

  beforeEach(waitForAsync(() => {
    // TestBed.configureTestingModule(
    //   getTestBedConfig_Component({ componentType: ListViewComponent })
    // ).compileComponents();
    TestBed.configureTestingModule(
      getTestBedConfig({
        declarations: [ListViewComponent, ListViewComponent],
        imports: [
          ...DEFAULT_TEST_IMPORTS,
          IbGibPageModule,
        ],
        providers: [
          AngularDelegate,
          ModalController,
          { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
        ],
      })
    )
      // .overrideComponent(ChatViewComponent, {
      //   set: { changeDetection: ChangeDetectionStrategy.OnPush }
      // })
      .compileComponents();

    fixture = TestBed.createComponent(ListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
