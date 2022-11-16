import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { HttpClient, HttpHandler } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { Router, UrlSerializer } from '@angular/router';
import { AngularDelegate, IonicModule } from '@ionic/angular';

import {
    AlertController, LoadingController,
    MenuController, ModalController, NavController,
    Platform
} from '@ionic/angular';

import { CommonService, } from 'src/app/services/common.service';
import { IbgibsService } from 'src/app/services/ibgibs.service';
import { IonicIbgibNavService } from 'src/app/services/ionic-ibgib-nav.service';
import { WitnessFactoriesService } from 'src/app/services/witness-factories.service';
import { InMemoryIbgibCacheService } from 'src/app/services/in-memory-ibgib-cache.service';
import { IonicStorageLatestIbgibCacheService } from 'src/app/services/ionic-storage-latest-ibgib-cache.service';
import { ServiceWorkerModule } from '@angular/service-worker';
import { UntypedFormBuilder } from '@angular/forms';

export const DEFAULT_TEST_IMPORTS = [
    IonicModule.forRoot()
];

export const ROUTER_TEST_PROVIDERS: any[] = [
    Router,
    UrlSerializer,
];

export const ANGULAR_TEST_PROVIDERS: any[] = [
    HttpHandler,
    HttpClient,
    ChangeDetectorRef,
    UntypedFormBuilder,
];
export const IONIC_TEST_PROVIDERS: any[] = [
    NavController, MenuController, LoadingController, AlertController,
    ModalController, Platform,
];
export const IBGIB_TEST_PROVIDERS: any[] = [
    // { provide: 'IbgibNav', useClass: IonicIbgibNavService, }, // doesn't work ?
    { provide: 'IbgibNav', useValue: new IonicIbgibNavService(null), }, // not sure when this will make a difference
    WitnessFactoriesService,
    InMemoryIbgibCacheService,
    { provide: 'IbGibCacheService', useClass: IonicStorageLatestIbgibCacheService },
    IbgibsService,
    CommonService,
];
export const COMMON_TEST_PROVIDERS: any[] = [
    ...ROUTER_TEST_PROVIDERS,
    ...ANGULAR_TEST_PROVIDERS,
    ...IONIC_TEST_PROVIDERS,
    ...IBGIB_TEST_PROVIDERS,
];

export function getTestBedConfig({
    declarations = [],
    imports = DEFAULT_TEST_IMPORTS,
    providers = COMMON_TEST_PROVIDERS,
    schemas,
}: {
    /**
     * put your component type in this array for components
     */
    declarations?: any[],
    imports?: any[],
    providers?: any[],
    schemas?: any[]
} = {}): TestModuleMetadata {
    declarations = declarations ?? [];
    if (providers === null || providers === undefined) { providers = COMMON_TEST_PROVIDERS; }
    if (imports === null || imports === undefined) { imports = DEFAULT_TEST_IMPORTS; }
    return { declarations, imports, providers, schemas };
}
export function getTestBedConfig_Component({
    componentType,
    imports = DEFAULT_TEST_IMPORTS,
    providers = COMMON_TEST_PROVIDERS,
    schemas,
}: {
    /**
     * put your component type in this array for components
     */
    componentType: any,
    imports?: any[],
    providers?: any[],
    schemas?: any[]
}): TestModuleMetadata {
    return getTestBedConfig({ declarations: [componentType], imports, providers, schemas });
}

export interface GlobalInjections {
    menuCtrl: any;
    loadingCtrl: any;
    alertController: any;
    modalController: any;
    platform: any;
    nav: any;
    factories: any;
    cache: any;
    getLatestCache: any;
    ibgibs: any;
    common: any;
}

export function getGlobalInjections(): GlobalInjections {
    return {
        menuCtrl: TestBed.inject(MenuController),
        loadingCtrl: TestBed.inject(LoadingController),
        alertController: TestBed.inject(AlertController),
        modalController: TestBed.inject(ModalController),
        platform: TestBed.inject(Platform),
        nav: TestBed.inject('IbgibNav' as any),
        factories: TestBed.inject(WitnessFactoriesService),
        cache: TestBed.inject(InMemoryIbgibCacheService),
        getLatestCache: TestBed.inject(IonicStorageLatestIbgibCacheService),
        ibgibs: TestBed.inject(IbgibsService),
        common: TestBed.inject(CommonService),
    };
}

export function getTestServiceWorkerModule(): any {
    return ServiceWorkerModule.register('', { enabled: false });
}
