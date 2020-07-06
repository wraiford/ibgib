import { Injectable, ChangeDetectorRef } from '@angular/core';
import { FilesService } from './files.service';
import { NavController } from '@ionic/angular';
import { IbgibsService } from './ibgibs.service';

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
@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(
    public ibgibs: IbgibsService,
    public files: FilesService,
    public nav: NavController,
  ) {

  }
}
