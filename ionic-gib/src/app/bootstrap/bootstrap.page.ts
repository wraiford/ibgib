import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonService } from '../services/common.service';
import { Capacitor, Plugins } from '@capacitor/core';
const { Modals, Filesystem } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IBGIB_DELIMITER } from 'ts-gib/dist/V1';

import * as c from '../common/constants';
import { getInfoFromSpaceIb, getValidatedBootstrapIbGib, updateBootstrapIbGib } from '../common/helper/space';
import { BootstrapIbGib } from '../common/types/space';
import { IonicSpace_V1, validateIonicSpace_V1Intrinsically } from '../common/witnesses/spaces/ionic-space-v1';
import { DynamicFormComponentBase } from '../common/bases/dynamic-form-component-base';
import { DynamicFormComponent } from '../ibgib-forms/dynamic-form/dynamic-form.component';
import { DynamicFormBuilder } from '../common/helper/form';

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
  browseInfos: IndexedDBBrowseInfo[] = [];

  @Input()
  refreshingBrowseInfos: boolean;

  @Input()
  get spacesAreSelectedToImport(): boolean { return this.browseInfos.some(x => !!x.selected); }

  @Input()
  isBusy: boolean;

  @Input()
  selectedSpaceToImport: IndexedDBBrowseInfo;

  @Input()
  currentPath: string;

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
      await this.refreshBrowseInfos();
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
      this.isBusy = true;
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
      this.isBusy = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_ImportSpace_Web(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_ImportSpace_Web.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d0f5dda9f57adfabfc9ad8f74e121f22)`); }

      const resConfirmImport = await Modals.confirm({
        title: `attach ${this.browseInfos.filter(x => x.selected).length === 1 ? 'space' : 'spaces'} to bootstrap?`,
        message: `Importing these spaces will attach them to the bootstrap so that they will be available as local spaces.

        ATOW this only does some light verification of the space ibGibs themselves and does not confirm that all constituent ibgibs are present in the space.

        This assumes that the directory structure is intact.

        NOTE! When you want to use this space as your local space, you must select it as your default space in a separate step. This step only imports it.

        Do you wish to proceed with the import?`,
        okButtonTitle: 'YES, import',
        cancelButtonTitle: 'NO, cancel'
      });
      if (!resConfirmImport.value) {
        await Modals.alert({ title: 'canceled...', message: 'import canceled. ' })
        return; /* <<<< returns early */
      }

      const spaceInfos = this.browseInfos.filter(x => x.selected);
      let importCount = 0;
      this.isBusy = true;
      for (let i = 0; i < spaceInfos.length; i++) {
        const info = spaceInfos[i];
        if (!info.isSpace) {
          debugger;
          throw new Error(`(UNEXPECTED) !spaceInfo.isSpace..? only spaces expected to be selected. (E: 783a3f8e3ecbca10c4e592097ed6ec22)`);
        }

        if (!this.bootstrapIbGib.data.spaceIds.includes(info.spaceId)) {
          await this.importSpace({ info });
          importCount++;
        } else {
          await Modals.alert({ title: 'space already imported', message: `The space (${info.name}) has already been imported. Skipping... (full info: ${h.pretty(info)})` });
        }
      }

      if (importCount > 0) {
        await Modals.alert({ title: `import complete`, message: `We imported ${importCount} ${importCount > 1 ? 'spaces' : 'space'}. We will now reload the page.` })
        window.location.reload();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.isBusy = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async refreshBrowseInfos(): Promise<void> {
    const lc = `${this.lc}[${this.refreshBrowseInfos.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: fd403ea9dc642680b138e27d12340a22)`); }
      this.browseInfos = [];
      this.refreshingBrowseInfos = true;

      let path = this.currentPath || '';
      let directory = c.IBGIB_BASE_DIR;
      let contents = await Filesystem.readdir({
        path,
        directory: c.IBGIB_BASE_DIR,
      });
      if ((contents?.files?.length || []) === 0) {
        if (logalot) { console.log(`${lc} (contents?.files?.length || []) === 0 ...returning early. (I: 3de075820f26f3834a9d6e8132028722)`); }
        this.browseInfos = [];
        return; /* <<<< returns early */
      }

      // add navigate up/back directory if we're not at the root
      if (path) {
        this.browseInfos.push({ name: '..', isDirectory: true, path, });
      }

      // add fileFolder infos for each folder, space and bootstrap file found.
      for (let i = 0; i < contents.files.length; i++) {
        /**
         * could be a file or directory, we don't know yet...
         */
        const name = contents.files[i];
        const status = await Filesystem.stat({ path: path + '/' + name, directory });
        if (logalot) { console.log(`${lc} status: ${JSON.stringify(status, null, 2)} (I: 35c88b340c3c1344d6a89a72ccd5a522)`); }
        if (status.type === 'directory') {
          this.browseInfos.push({ name: name, path, isDirectory: true });
        } else if (
          name.includes(IBGIB_DELIMITER) &&
          name.endsWith('.json') &&
          // has ib ^ gib.json form
          name.split(IBGIB_DELIMITER).length === 2 &&
          // `witness space ${classname} ${name} ${id}`;
          name.split(IBGIB_DELIMITER)[0].startsWith(`witness space`)
        ) {
          // it's a local space ibgib
          const [spaceIb, spaceGib] = name.split(IBGIB_DELIMITER);
          const { spaceId } = getInfoFromSpaceIb({ spaceIb });
          // check to see if we already have this space's timeline
          let existingFilter = this.browseInfos.filter(x => x.spaceId === spaceId);
          if (existingFilter.length === 0) {
            // first frame in ibgib timeline that we've found
            // for spaces, we use the spaceId as the name
            this.browseInfos.push({
              name: spaceId,
              path,
              label: spaceIb,
              isSpace: true,
              spaceFilenames: [name],
              spaceId,
            });
          } else {
            // already have this space, add this gib to it.
            const existing = existingFilter[0];
            existing.spaceFilenames.push(name);
          }
        } else if (name === `${c.BOOTSTRAP_IBGIB_ADDR}.json`) {
          this.browseInfos.push({ name, path, isBootstrap: true });
        } else {
          if (logalot) { console.log(`${lc} ignoring name: ${name} (path: ${path}) (I: dca3ebb1dc28d59beef340512e968622)`); }
        }
      }
      if (logalot) { console.log(`${lc} contents: ${contents} (I: cc7d3fa29eabb1088624101f42ec7722)`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.refreshingBrowseInfos = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClickFileFolderInfo(info: IndexedDBBrowseInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleClickFileFolderInfo.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: a112d422a8efddbd2fd227e56c299622)`); }

      if (info.isDirectory) {
        if (info.name === '..') {
          if (this.currentPath) {
            const pieces = this.currentPath.split('/');
            pieces.pop();
            this.currentPath = pieces.join('/');
          } else {
            console.warn(`${lc} (UNEXPECTED) back (..) dir clicked, but currentPath is falsy? (W: 1ae39dc2bc4046dc96eb0915245a2ccd)`)
          }
        } else {
          this.currentPath = this.currentPath ?
            this.currentPath + '/' + info.name :
            info.name;
        }
        this.browseInfos = [];
        await this.refreshBrowseInfos();
      } else if (info.isSpace) {
        info.selected = !info.selected;
        // await this.importSpace({ info });
      } else if (info.isBootstrap) {
        // display spaces contained in bootstrap
      } else {
        throw new Error(`(UNEXPECTED) unknown info type...not a space, not a directory, not a bootstrap... (E: e8dcf8358ddd97129e35b04ab88f6b22)`);
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Atow, this is assuming that the entire space is already in an expected
   * location, i.e., it's in the ibgib base directory
   * (DOCUMENTS/ibgib/[spacename]), and it's just "disconnected" from the
   * bootstrap^gib.json.
   *
   * So, again atow, this loads the space ibgibs, validates them intrinsically,
   * finds the local one and adds its address to the bootstrap.
   */
  async importSpace({ info }: { info: IndexedDBBrowseInfo }): Promise<void> {
    const lc = `${this.lc}[${this.importSpace.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 6bc53280884981a2ee2fded833d73d22)`); }
      const zeroSpace = this.common.ibgibs.zeroSpace;

      const ibGibs: IonicSpace_V1[] = [];
      let totalValidationErrors: string[];

      // load all the files, verifying each ibgib intrinsically
      for (let i = 0; i < info.spaceFilenames.length; i++) {
        const spaceFilename = info.spaceFilenames[i];
        const addr = spaceFilename.substring(0, spaceFilename.length - '.json'.length);
        const resGet = await this.common.ibgibs.get({
          addr,
          space: zeroSpace,
          isMeta: true
        });
        if (!resGet) { throw new Error(`(UNEXPECTED) resGet falsy (E: 3950b9546587f5e22a6d89847e9c9822)`); }
        if (!resGet.success) { throw new Error(`resGet.success is falsy (E: 23dcfa06d525ee441942a918e8964722)`); }
        if (resGet.ibGibs?.length !== 1) { throw new Error(`resGet.ibGibs?.length !== 1 (E: c8b7724fa4efc28a73eb4f2424462f22)`); }

        let ibGib = <IonicSpace_V1>resGet.ibGibs[0];
        if (logalot) { console.log(`${lc} got ibGib (${addr}) (I: f5dcd62f4cc4f0395faac0b44a2c9c22)`); }

        // default space validation
        const validationErrors = (await validateIonicSpace_V1Intrinsically({ space: ibGib })) ?? [];

        // do some custom space validation
        const otherAddrsWithSameN = ibGibs.filter(x => x.data.n === ibGib.data.n).map(x => h.getIbGibAddr({ ibGib: x }));
        if (otherAddrsWithSameN.length > 0) {
          validationErrors.push(`duplicate ibGib.data.n (${ibGib.data.n}). addr: ${addr}. otherAddrs:\n${otherAddrsWithSameN.join('\n')}`);
        }

        if (validationErrors?.length > 0) { throw new Error(`info has validation errors. name: ${info.name}. spaceFilename: ${spaceFilename}. validationErrors: (${validationErrors.join('|')}) (E: 1ec3cd8dcd8bc294014d46fd8d623122)`); }
        ibGibs.push(ibGib);
      }

      // still validating!... validate ibGibs as a whole

      // sort ascending, where [data.n=undefined, data.n=0, data.n=1 ... data.n=latest]
      // and then do some more validation
      ibGibs.sort((a, b) => (a.data.n ?? -1) < (b.data.n ?? -1) ? -1 : 1);
      if (logalot) {
        ibGibs.forEach(x => {
          console.log(`${lc} ${h.pretty(x)} (I: e2f5d518ec624c6a9d0df2544570a5c0)`);
          console.log(`${lc} ${h.pretty(x.data)} (I: db1bc4b2f17e47ceb7ffd7bd1e95b304)`);
        });
      }
      let latestSpaceIbGib: IonicSpace_V1 = ibGibs[ibGibs.length - 1];
      if (logalot) { console.log(`${lc} latestSpaceIbGib.data.n: ${latestSpaceIbGib.data.n} (I: d1e4313dfc5e1b597fe04f2743eb8f22)`); }

      // ensure no missing n counter values, i.e. no gaps.
      if (latestSpaceIbGib.data.n !== undefined && latestSpaceIbGib.data.n !== ibGibs.length - 2) {
        debugger;
        throw new Error(`unexpected number of space ibGibs found. The latest is n=${latestSpaceIbGib.data.n} but the ibGibs.length === ${ibGibs.length}. We expect the latest n to equal the length - 2, because it's 0-indexed, as well as the very first space has an undefined data.n. (E: 700b4d237c883054cde6ce8b2b851822)`);
      }

      // (except the first one which is expected to be undefined)
      for (let j = 0; j < ibGibs.length; j++) {
        const spaceIbGib = ibGibs[j];

        // ensure no duplicate n counter values.
        const nFiltered = ibGibs.filter(x => x.data.n === spaceIbGib.data.n);
        if (nFiltered.length !== 1) {
          debugger;
          throw new Error(`duplicate spaceIbGib.data.n (${spaceIbGib.data.n}) in space (${spaceIbGib.data.uuid}) (E: c8fb8d3b218398283a2410f272d1eb22)`);
        }

        // todo: validate import space - ensure past rel8n points to n-1.
      }

      // all validation passed

      // attach to the bootstrap
      await updateBootstrapIbGib({ space: latestSpaceIbGib, zeroSpace });
    } catch (error) {
      debugger;
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
interface IndexedDBBrowseInfo {
  /**
   * filename or directory/folder name
   */
  name: string;
  label?: string;
  /**
   * path in which the file/folder was found
   */
  path: string;
  /**
   * true if the info is a directory
   */
  isDirectory?: boolean;
  /**
   * true if the info is a space file, e.g. `witness space IonicSpace_V1 my_space_name 123spaceidabc^30003832eab84b28a732a8e03824a5fb.json`.
   */
  isSpace?: boolean;
  /**
   * If the info is a space, this is its uuid.
   */
  spaceId?: string;
  /**
   * true if the file is a bootstrap^gib.json file.
   */
  isBootstrap?: boolean;
  /**
   * we group all space ibgib frames into a single browse info.
   *
   * The thing is that a space's ib may change if the space's name changes.
   */
  spaceFilenames?: string[];
  /**
   * if the info is a space, this indicates if the space is selected or not.
   */
  selected?: boolean;
}
