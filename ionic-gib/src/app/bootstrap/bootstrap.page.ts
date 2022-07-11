import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonService } from '../services/common.service';
import { Capacitor, Plugins } from '@capacitor/core';
const { Modals, Filesystem } = Plugins;

import * as c from '../common/constants';
import { getValidatedBootstrapIbGib, updateBootstrapIbGib } from '../common/helper/space';
import { BootstrapIbGib } from '../common/types/space';
import { IbGibSpaceAny } from '../common/witnesses/spaces/space-base-v1';
import { IonicSpace_V1 } from '../common/witnesses/spaces/ionic-space-v1';
import { DynamicFormComponentBase } from '../common/bases/dynamic-form-component-base';
import { DynamicFormComponent } from '../ibgib-forms/dynamic-form/dynamic-form.component';
import { DynamicFormBuilder } from '../common/helper/form';
import { FormItemInfo } from '../ibgib-forms/types/form-items';
import { IBGIB_DELIMITER } from 'ts-gib/dist/V1';
import { Gib } from 'ts-gib/dist/types';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * I have this in a separate class (not ibgib page) for a couple reasons. The
 * main one is that we do not want the thing auto-syncing and updating this
 * behind the scenes.
 */
@Component({
  selector: 'ib-bootstrap',
  templateUrl: './bootstrap.page.html',
  styleUrls: ['./bootstrap.page.scss'],
})
export class BootstrapPage extends DynamicFormComponentBase<any>
  implements OnInit {

  /**
   * log context. Override this property in descending classes.
   *
   * NOTE:
   *   I use very short variable names ONLY when they are all over
   *   the place. This is used all throughout the codebase.
   *   Otherwise, I usually use very long names...often too long! :-)
   */
  protected lc: string = `[${BootstrapPage.name}]`;

  @Input()
  bootstrapIbGib: BootstrapIbGib;

  @Input()
  localSpaces: IonicSpace_V1[] = [];

  @Input()
  defaultSpace: IonicSpace_V1;

  /**
   * If a user selects a new space, this will be set for when submitted...
   * probably not doing this correctly.
   */
  @Input()
  newlySelectedDefaultSpace: IonicSpace_V1;

  @Input()
  defaultSpaceNotFound: boolean;

  @Input()
  newDefaultSpaceSelected: boolean;

  @Input()
  get showSubmit(): boolean {
    return this.newDefaultSpaceSelected;
  }

  @Input()
  platform: string = Capacitor.getPlatform();

  @Input()
  fileOrFolderInfos: FileOrFolderInfo[] = [];

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 850f2df6992f1f931cd3c24c4c32e222)`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Initializes to default space values.
   */
  protected async initializeImpl(): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.bootstrapIbGib =
        await getValidatedBootstrapIbGib({ zeroSpace: this.common.ibgibs.zeroSpace });
      await this.initLocalSpaces();
      await this.initDefaultSpace();
      await this.initFormItems();
      await this.refreshFileFolderInfos();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initLocalSpaces(): Promise<void> {
    const lc = `${this.lc}[${this.initLocalSpaces.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 8825effe62ad45520f7c6739d8669d22)`); }
      this.localSpaces = await this.common.ibgibs.getLocalUserSpaces({
        lock: true,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initDefaultSpace(): Promise<void> {
    const lc = `${this.lc}[${this.initDefaultSpace.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 1de0a1018f3b0aba4905122625f08522)`); }
      const defaultSpaceId = this.bootstrapIbGib.data.defaultSpaceId;

      const filteredSpaces =
        this.localSpaces.filter(x => x.data.uuid === defaultSpaceId);
      if (filteredSpaces.length === 1) {
        // it was found, all is good in the world
        if (logalot) { console.log(`${lc} defaultSpaceId (${defaultSpaceId}) found. (I: 05508c4b3859112443e8ef76d7987722)`); }
        this.defaultSpace = filteredSpaces[0];
      } else {
        if (logalot) { console.log(`${lc} defaultSpaceId (${defaultSpaceId}) was not found in this.localSpaces. (I: a7f0c89e62f2e484bebc7ed51025c722)`); }
        delete this.defaultSpace;
        this.defaultSpaceNotFound = true;
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initFormItems(): Promise<void> {
    const lc = `${this.lc}[${this.initFormItems.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: da88afd88b5d133e377fba68ccffaf22)`); }

      const getSelectText = (x: IonicSpace_V1) => {
        return `${x.data.name} (${x.data.uuid?.slice(0, 10)})`;
      }

      this.formItems = [];
      this.ref.detectChanges();
      this.formItems = new DynamicFormBuilder()
        .forA({ what: 'Bootstrap' })
        .with({})
        .customItem({
          name: 'defaultSpaceId',
          label: 'Default Space',
          dataType: 'select',
          description: 'This is the local space in use (when the app starts).',
          required: true,
          selectOptions: [
            ...this.localSpaces.map(x => getSelectText(x))
          ],
          value: getSelectText(this.defaultSpace),
          onSelect: async (e, info) => {
            this.newDefaultSpaceSelected =
              info.value !== getSelectText(this.defaultSpace);
            this.newlySelectedDefaultSpace =
              this.localSpaces.filter(x => getSelectText(x) === info.value)[0];
          },
        })
        // unfortunately i'm not able to do it this way atm...
        // .customItem({
        //   name: 'spaces',
        //   dataType: 'form',
        //   items: [
        //     ...this.localSpaces.map(space => {
        //       return <FormItemInfo>{
        //         name: 'space',
        //         dataType: 'form',
        //         items: [
        //           {
        //             name: 'name',
        //             dataType: 'text',
        //             description: 'name of the space',
        //             label: 'Name',
        //             regexp: c.SPACE_NAME_REGEXP,
        //           }
        //         ]
        //       };
        //     })
        //   ]
        // })
        .outputItems();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleBackButtonClick(): Promise<void> {
    await this.common.nav.back();
  }

  async handleDynamicSubmit_Validated(form: DynamicFormComponent): Promise<void> {
    const lc = `${this.lc}[${this.handleDynamicSubmit_Validated.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c6539c42ebfa1d197a6a4e035d8f5422)`); }
      // update the selected default
      if (this.newlySelectedDefaultSpace) {
        await updateBootstrapIbGib({
          space: this.newlySelectedDefaultSpace,
          zeroSpace: this.common.ibgibs.zeroSpace,
          setSpaceAsDefault: true,
        });
      }

      // await this.initialize();
      window.location.reload();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  handleDynamicSubmit_ErrorThrown(form: DynamicFormComponent): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async handleClick_AddSpace(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_AddSpace.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 53938b8ea30d7ff55fc4ba9d98c5bb22)`); }
      const newLocalSpace = await this.common.ibgibs.createLocalSpaceAndUpdateBootstrap({
        zeroSpace: this.common.ibgibs.zeroSpace,
        allowCancel: true,
        createBootstrap: false,
      });
      if (!newLocalSpace) {
        await Modals.alert({ title: 'canceled...', message: 'add space canceled.' });
        return; /* <<<< returns early */
      }

      // reinitialize, because we have a new bootstrap with a new space.
      await this.initialize();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  handleFileSelected_Import(event: any): void {
    const lc = `${this.lc}[${this.handleFileSelected_Import.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 505439871216b1945742ec1499cd3122)`); }
      debugger;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_ImportSpace_Web(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_ImportSpace_Web.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d0f5dda9f57adfabfc9ad8f74e121f22)`); }
      debugger;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  @Input()
  currentPath: string;

  async refreshFileFolderInfos(): Promise<void> {
    const lc = `${this.lc}[${this.refreshFileFolderInfos.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: fd403ea9dc642680b138e27d12340a22)`); }
      this.fileOrFolderInfos = [];

      let path = this.currentPath || '';
      let directory = c.IBGIB_BASE_DIR;
      let contents = await Filesystem.readdir({
        path,
        directory: c.IBGIB_BASE_DIR,
      });
      if ((contents?.files?.length || []) === 0) {
        if (logalot) { console.log(`${lc} (contents?.files?.length || []) === 0 ...returning early. (I: 3de075820f26f3834a9d6e8132028722)`); }
        this.fileOrFolderInfos = [];
        return; /* <<<< returns early */
      }
      for (let i = 0; i < contents.files.length; i++) {
        /**
         * could be a file or directory, we don't know yet...
         */
        const name = contents.files[i];
        const status = await Filesystem.stat({ path: path + '/' + name, directory });
        if (logalot) { console.log(`${lc} status: ${JSON.stringify(status, null, 2)} (I: 35c88b340c3c1344d6a89a72ccd5a522)`); }
        if (status.type === 'directory') {
          this.fileOrFolderInfos.push({ name: name, isDirectory: true });
        } else if (
          name.includes(IBGIB_DELIMITER) &&
          name.endsWith('.json') &&
          // has ib ^ gib.json form
          name.split(IBGIB_DELIMITER).length === 2 &&
          // `witness space ${classname} ${name} ${id}`;
          name.split(IBGIB_DELIMITER)[0].startsWith(`witness space`)
        ) {
          let [ib, gib] = name.split(IBGIB_DELIMITER);

          let existingFilter = this.fileOrFolderInfos.filter(x => x.name === ib);
          if (existingFilter.length === 0) {
            this.fileOrFolderInfos.push({ name: ib, isSpace: true, gibs: [gib] });
          } else {
            let existing = existingFilter[0];
            existing.gibs.push(gib);
          }
        } else if (name === `${c.BOOTSTRAP_IBGIB_ADDR}.json`) {
          this.fileOrFolderInfos.push({ name, isBootstrap: true });
        } else {
          if (logalot) { console.log(`${lc} ignoring name: ${name} (I: dca3ebb1dc28d59beef340512e968622)`); }
        }
      }
      if (logalot) { console.log(`${lc} contents: ${contents} (I: cc7d3fa29eabb1088624101f42ec7722)`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClickFileFolderInfo(info: FileOrFolderInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleClickFileFolderInfo.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: a112d422a8efddbd2fd227e56c299622)`); }

      if (info.isDirectory) {
        this.currentPath = this.currentPath ?
          this.currentPath + '/' + info.name :
          info.name;
        this.fileOrFolderInfos = [];
        await this.refreshFileFolderInfos();
      } else {
        debugger;
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}

/**
 * I'm looking for browsing in indexeddb and am interested in just spaces,
 * directories and bootstraps.
 */
interface FileOrFolderInfo {
  /**
   * filename or directory/folder name
   */
  name: string;
  /**
   * true if the info is a directory
   */
  isDirectory?: boolean;
  /**
   * true if the info is a space file, e.g. `witness space IonicSpace_V1 my_space_name 123spaceidabc^30003832eab84b28a732a8e03824a5fb.json`.
   */
  isSpace?: boolean;
  /**
   * true if the file is a bootstrap^gib.json file.
   */
  isBootstrap?: boolean;
  /**
   * If it's a space, then this is a list of the gibs found.
   */
  gibs?: Gib[];
}
