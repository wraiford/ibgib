import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { AngularDelegate, IonicModule, ModalController } from '@ionic/angular';
import { IbGibPageModule } from 'src/app/ibgib/ibgib.module';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { DEFAULT_TEST_IMPORTS, getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';
import { ListViewComponent } from '../list-view/list-view.component';

import { TagListViewComponent } from './tag-list-view.component';

describe('TagListViewComponent', () => {
  let component: TagListViewComponent;
  let fixture: ComponentFixture<TagListViewComponent>;

  beforeEach(waitForAsync(() => {
    // TestBed.configureTestingModule(
    //   getTestBedConfig_Component({ componentType: TagListViewComponent })
    // ).compileComponents();
    TestBed.configureTestingModule(
      getTestBedConfig({
        declarations: [ListViewComponent, TagListViewComponent],
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

    fixture = TestBed.createComponent(TagListViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(true);
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
