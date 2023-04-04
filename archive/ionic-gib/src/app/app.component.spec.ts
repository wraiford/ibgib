import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, waitForAsync, } from '@angular/core/testing';

import { AngularDelegate, IonicModule, ModalController, Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { ANGULAR_TEST_PROVIDERS, COMMON_TEST_PROVIDERS, getTestBedConfig, getTestServiceWorkerModule, IBGIB_TEST_PROVIDERS, IONIC_TEST_PROVIDERS } from 'src/karma.global';
import { ServiceWorkerModule, SwUpdate } from '@angular/service-worker';
import { UpdatePwaService } from './services/update-pwa.service';

describe('AppComponent', () => {

  let statusBarSpy, splashScreenSpy, platformReadySpy, platformSpy;

  beforeEach(waitForAsync(async () => {
    statusBarSpy = jasmine.createSpyObj('StatusBar', ['styleDefault']);
    splashScreenSpy = jasmine.createSpyObj('SplashScreen', ['hide']);
    platformReadySpy = Promise.resolve();
    platformSpy = jasmine.createSpyObj('Platform', { ready: platformReadySpy });

    const config = getTestBedConfig({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        AngularDelegate,
        SwUpdate,
        UpdatePwaService,
        ...IONIC_TEST_PROVIDERS,
        ...ANGULAR_TEST_PROVIDERS,
        ...IBGIB_TEST_PROVIDERS,
        { provide: StatusBar, useValue: statusBarSpy },
        { provide: SplashScreen, useValue: splashScreenSpy },
        { provide: Platform, useValue: platformSpy },
      ],
      imports: [getTestServiceWorkerModule(), RouterTestingModule.withRoutes([]), IonicModule.forRoot()],
      // IonicModule.forRoot()
    });
    await TestBed.configureTestingModule(config).compileComponents();
    // TestBed.configureTestingModule({
    //   declarations: [AppComponent],
    //   schemas: [CUSTOM_ELEMENTS_SCHEMA],
    //   providers: [
    //     { provide: StatusBar, useValue: statusBarSpy },
    //     { provide: SplashScreen, useValue: splashScreenSpy },
    //     { provide: Platform, useValue: platformSpy },
    //   ],
    //   imports: [ RouterTestingModule.withRoutes([])],
    // }).compileComponents();
  }));

  // it('should create the app', async () => {
  // const fixture = TestBed.createComponent(AppComponent);
  // const app = <AppComponent>fixture.debugElement.componentInstance;
  // expect(app).toBeTruthy();

  // await app.initializeApp();
  // });

  // it('should initialize the app', async () => {
  // const fixture = TestBed.createComponent(AppComponent);
  // expect(platformSpy.ready).toHaveBeenCalled();
  // await platformReadySpy;
  // expect(statusBarSpy.styleDefault).toHaveBeenCalled();
  // expect(splashScreenSpy.hide).toHaveBeenCalled();
  // });

  // it('should have menu tags', async () => {
  //   const fixture = await TestBed.createComponent(AppComponent);
  //   await fixture.detectChanges();
  //   const app = fixture.nativeElement;
  //   const menuItems = app.querySelectorAll('ion-label');
  //   expect(menuItems.length).toEqual(12);
  //   expect(menuItems[0].textContent).toContain('Home');
  //   expect(menuItems[1].textContent).toContain('Favorites');
  // });

  // it('should have urls', async () => {
  //   const fixture = await TestBed.createComponent(AppComponent);
  //   await fixture.detectChanges();
  //   const app = fixture.nativeElement;
  //   const menuItems = app.querySelectorAll('ion-item');
  //   // expect(menuItems.length).toEqual(12);
  //   // expect(menuItems[0].getAttribute('ng-reflect-router-link')).toEqual('/ibgib/Home');
  //   // expect(menuItems[1].getAttribute('ng-reflect-router-link')).toEqual('/ibgib/Favorites');
  // });

});
