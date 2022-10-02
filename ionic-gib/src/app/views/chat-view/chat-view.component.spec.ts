import { ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule, setupTestingRouter } from '@angular/router/testing';
import { AngularDelegate, IonicModule, ModalController } from '@ionic/angular';
import { IbGibPageModule } from 'src/app/ibgib/ibgib.module';
import { IbGibPage } from 'src/app/ibgib/ibgib.page';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { DEFAULT_TEST_IMPORTS, getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';
import { ListViewComponent } from '../list-view/list-view.component';

import { ChatViewComponent } from './chat-view.component';

describe('ChatViewComponent', () => {
  let component: ChatViewComponent;
  let fixture: ComponentFixture<ChatViewComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule(
      getTestBedConfig({
        declarations: [ListViewComponent, ChatViewComponent],
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
    fixture = TestBed.createComponent(ChatViewComponent);
    component = fixture.componentInstance;
    // console.log('component.lc: ' + (<any>component).lc)

    // fixture.whenStable();
  }));

  it('should create', async () => {

    fixture.detectChanges();

    expect(component).toBeTruthy();
  });
});
