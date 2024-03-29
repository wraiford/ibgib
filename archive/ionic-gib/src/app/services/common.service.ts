import { AlertController, LoadingController, MenuController, ModalController, Platform, } from '@ionic/angular';
import { Injectable, Inject, } from '@angular/core';

import { Gib, IbGibAddr } from 'ts-gib';

import { IbgibsService } from './ibgibs.service';
import { WitnessFactoriesService } from './witness-factories.service';
import { InMemoryIbgibCacheService } from './in-memory-ibgib-cache.service';
import { IbGibItem } from '../common/types/ux';
import { IonicStorageLatestIbgibCacheService } from './ionic-storage-latest-ibgib-cache.service';

export interface NavInfo {
  /** The ibgib address we're going to.  */
  toAddr?: IbGibAddr,
  /**
   * tjpGib of the toAddr.
   *
   * if not provided, will get from incoming `toAddr`.
   *
   * ## notes
   *
   * When we navigate, sometimes it's just to update an ibgib
   * within its own timeline. In this case, unless we're paused, we
   * don't want to push the new address to the navigation stack,
   * rather we want to replace the prior navigation info with the
   * updated address.
   */
  toAddr_TjpGib?: Gib;
  /** The starting ibgib address from which we're navigating away.  */
  fromAddr?: IbGibAddr,
  /**
   * tjpGib of the fromAddr.
   *
   * if not provided, will get from incoming `fromAddr`.
   *
   * ## notes
   *
   * When we navigate, sometimes it's just to update an ibgib
   * within its own timeline. In this case, unless we're paused, we
   * don't want to push the new address to the navigation stack,
   * rather we want to replace the prior navigation info with the
   * updated address.
   */
  fromAddr_TjpGib?: Gib;
  /**
   * Use this instead of setting window.location
   */
  toRawLocation?: string[];
  /**
   * Use this instead of setting window.location
   */
  fromRawLocation?: string[];
  /** New query params for the navigation. */
  queryParams?: { [key: string]: any },
  /** How to reconcile existing query params with the new ones. */
  queryParamsHandling?: 'merge' | 'preserve' | '',
  /** If true, then this navigation is opening a modal dialog. */
  isModal?: boolean;
  /**
   * If true, will navigate even if `toAddr === fromAddr`.
   */
  force?: boolean;
  /**
   * explicitly skip the navigation stack
   */
  skipStack?: boolean;
  /**
   * If applicable, this is the app's id in the url
   */
  appId?: string;
  /**
   * If applicable, this is the app's classname in the url
   */
  appClassname?: string;
}

export interface IbgibNav {
  go(info: NavInfo): Promise<void>;
  back(): Promise<void>;
  // backstackChanged$: Observable<NavInfo[]>;
}

/**
 * Contains common singleton services that will be included in the
 * IbgibComponentBase class.
 *
 * Refactoring and adding services in base classes is inefficient
 * without this kind of shared service provider, because to add/remove a service
 * you have to add/remove it also in every single descending class.
 * This gets _extremely_ unwieldy as the architecture grows.
 *
 * Some things do not go here that is specific to the descendant class,
 * e.g., ChangeDetectorRef.
 */
@Injectable({ providedIn: 'root' })
export class CommonService {

  constructor(
    public ibgibs: IbgibsService,
    // public files: FilesService,
    public modalController: ModalController,
    @Inject('IbgibNav') public nav: IbgibNav,
    public platform: Platform,
    public factories: WitnessFactoriesService,
    public alertController: AlertController,
    public cache: InMemoryIbgibCacheService,
    public getLatestCache: IonicStorageLatestIbgibCacheService,
    public menuCtrl: MenuController,
    public loadingCtrl: LoadingController,
  ) {

  }

}
