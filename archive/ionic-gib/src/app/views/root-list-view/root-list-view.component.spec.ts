// import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
// import { AngularDelegate, ModalController } from '@ionic/angular';
// import { IbGibPageModule } from 'src/app/ibgib/ibgib.module';
// import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
// import { DEFAULT_TEST_IMPORTS, getTestBedConfig, getTestBedConfig_Component } from 'src/karma.global';
// import { ListViewComponent } from '../list-view/list-view.component';

// import { RootListViewComponent } from './root-list-view.component';

// describe('RootListViewComponent', () => {
//   let component: RootListViewComponent;
//   let fixture: ComponentFixture<RootListViewComponent>;

//   beforeEach(waitForAsync(() => {
//     // TestBed.configureTestingModule(
//     //   getTestBedConfig_Component({ componentType: RootListViewComponent })
//     // ).compileComponents();
//     TestBed.configureTestingModule(
//       getTestBedConfig({
//         declarations: [ListViewComponent, RootListViewComponent],
//         imports: [
//           ...DEFAULT_TEST_IMPORTS,
//           IbGibPageModule,
//         ],
//         providers: [
//           AngularDelegate,
//           ModalController,
//           { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
//         ],
//       })
//     )
//       // .overrideComponent(ChatViewComponent, {
//       //   set: { changeDetection: ChangeDetectionStrategy.OnPush }
//       // })
//       .compileComponents();

//     fixture = TestBed.createComponent(RootListViewComponent);
//     component = fixture.componentInstance;
//     fixture.whenStable().then(() => {
//       fixture.detectChanges(true);
//     })

//   }));

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
