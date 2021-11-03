(window["webpackJsonp"] = window["webpackJsonp"] || []).push([["main"],{

/***/ 0:
/*!***************************!*\
  !*** multi ./src/main.ts ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /home/wraiford/ibgib/impl/typescript/webext-gib/src/main.ts */"zUnb");


/***/ }),

/***/ "AytR":
/*!*****************************************!*\
  !*** ./src/environments/environment.ts ***!
  \*****************************************/
/*! exports provided: environment */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "environment", function() { return environment; });
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
const environment = {
    production: false
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.


/***/ }),

/***/ "Bim7":
/*!********************************************!*\
  !*** ./src/app/services/ibgibs.service.ts ***!
  \********************************************/
/*! exports provided: IbgibsService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IbgibsService", function() { return IbgibsService; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "mrSG");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ts-gib/dist/V1 */ "b2WX");
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var ts_gib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ts-gib */ "1ziu");
/* harmony import */ var ts_gib__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(ts_gib__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _capacitor_core__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @capacitor/core */ "gcOT");
/* harmony import */ var _common_constants__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../common/constants */ "XY7g");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ts-gib/dist/helper */ "RXni");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _files_service__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./files.service */ "aXBy");










class IbgibsService {
    constructor(files) {
        this.files = files;
        this.lc = `[${IbgibsService.name}]`;
    }
    /**
     * Gets the apps TagsIbGib.
     *
     * Initializes if asked to, which will create a new TagsIbGib as well
     * as create some initial tags as well.
     *
     * @param initialize initialize (i.e. create) if TagsIbGib not found. Used for initializing app (first run).
     */
    getTagsIbgib({ initialize }) {
        var _a;
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.getTagsIbgib.name}]`;
            try {
                let tagsAddr = (_a = (yield _capacitor_core__WEBPACK_IMPORTED_MODULE_4__["Storage"].get({ key: _common_constants__WEBPACK_IMPORTED_MODULE_5__["TAGS_IBGIB_ADDR_KEY"] }))) === null || _a === void 0 ? void 0 : _a.value;
                if (!tagsAddr) {
                    if (initialize && !this._initializing) {
                        this._initializing = true;
                        try {
                            tagsAddr = yield this.initializeTags();
                        }
                        catch (error) {
                            console.error(`${lc} error initializing: ${error.message}`);
                        }
                        finally {
                            this._initializing = false;
                        }
                    }
                    else {
                        return null;
                    }
                }
                console.log(`tagsAddr: ${tagsAddr}`);
                let resTags = yield this.files.get({ addr: tagsAddr, isMeta: true });
                if (!resTags.success) {
                    throw new Error(resTags.errorMsg);
                }
                if (!resTags.ibGib) {
                    throw new Error(`no ibGib in result`);
                }
                return resTags.ibGib;
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
                return null;
            }
        });
    }
    /**
     * Creates a new tags^gib instance (uniquely reified), as well as default initial
     * tags, e.g. "home", "favorites", etc., and relates these individual tags to
     * the tags ibGib itself.
     *
     * Stores the tags ibGib's addr in storage.
     */
    initializeTags() {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.initializeTags.name}]`;
            try {
                const tagsIbGib = yield this.initializeNewTagsIbGib();
                let tagsAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_6__["getIbGibAddr"])({ ibGib: tagsIbGib });
                yield _capacitor_core__WEBPACK_IMPORTED_MODULE_4__["Storage"].set({ key: _common_constants__WEBPACK_IMPORTED_MODULE_5__["TAGS_IBGIB_ADDR_KEY"], value: tagsAddr });
                // at this point, our tags ibGib has no associated tag ibGibs.
                // add home, favorite tags
                const initialTagDatas = [
                    { tagText: 'home', icon: 'home-outline' },
                    { tagText: 'favorite', icon: 'heart-outline' },
                ];
                for (let tagData of initialTagDatas) {
                    const resCreate = yield this.createTagIbGib(tagData);
                    tagsAddr = resCreate.newTagsAddr;
                    yield _capacitor_core__WEBPACK_IMPORTED_MODULE_4__["Storage"].set({ key: _common_constants__WEBPACK_IMPORTED_MODULE_5__["TAGS_IBGIB_ADDR_KEY"], value: tagsAddr });
                }
                return tagsAddr;
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
                return null;
            }
        });
    }
    initializeNewTagsIbGib() {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.initializeNewTagsIbGib.name}]`;
            try {
                const src = ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Factory_V1"].primitive({ ib: _common_constants__WEBPACK_IMPORTED_MODULE_5__["TAGS_IB"] });
                const resNewTags = yield ts_gib__WEBPACK_IMPORTED_MODULE_3__["V1"].fork({
                    src,
                    destIb: _common_constants__WEBPACK_IMPORTED_MODULE_5__["TAGS_IB"],
                    linkedRel8ns: [ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Rel8n"].past, ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Rel8n"].ancestor],
                    tpj: { uuid: true },
                    dna: true,
                });
                yield this.persistTransformResult({
                    resTransform: resNewTags,
                    isMeta: true
                });
                // for (let ibGib of [newTagsIbGib, ...(intermediateIbGibs || [])]) {
                //   let resPut = await this.files.put({ibGib, isMeta: true});
                //   if (!resPut.success) { throw new Error(resPut.errorMsg || 'error creating new tags ibGib'); }
                // }
                // for (let ibGib of dnas) {
                //   let resPut = await this.files.put({ibGib, isDna: true});
                //   if (!resPut.success) { throw new Error(resPut.errorMsg || 'error creating new tags ibGib'); }
                // }
                // return newTagsIbGib;
                return resNewTags.newIbGib;
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
                throw error;
            }
        });
    }
    /**
     * Tags for this app have the form: tag [tagText]
     *
     * @param tagText e.g. "Favorites"
     *
     * @example
     * For the Favorites tag, the ib would be "tag Favorites"
     */
    tagTextToIb(tagText) {
        const lc = `${this.lc}[${this.tagTextToIb.name}]`;
        if (!tagText) {
            throw new Error(`${lc} tag required.`);
        }
        return `tag ${tagText}`;
    }
    createTagIbGib({ tagText, icon, }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.createTagIbGib.name}]`;
            try {
                if (!tagText) {
                    throw new Error(`${lc} tag text required`);
                }
                const tagIb = this.tagTextToIb(tagText);
                const tagPrimitive = ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Factory_V1"].primitive({ ib: "tag" });
                const resNewTag = yield ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Factory_V1"].firstGen({
                    parentIbGib: tagPrimitive,
                    ib: tagIb,
                    data: { tagText, icon: icon || '' },
                    linkedRel8ns: [ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Rel8n"].past, ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Rel8n"].ancestor],
                    dna: true,
                });
                const { newIbGib: newTagIbGib } = resNewTag;
                yield this.persistTransformResult({ resTransform: resNewTag, isMeta: true });
                const newTagsAddr = yield this.rel8TagToTagsIbGib(newTagIbGib);
                return { newTagIbGib, newTagsAddr };
            }
            catch (error) {
                console.log(`${lc} ${error.message}`);
                throw error;
            }
        });
    }
    /**
     * Convenience function for persisting a transform result, which has
     * a newIbGib and optionally intermediate ibGibs and/or dnas.
     */
    persistTransformResult({ isMeta, resTransform, }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.persistTransformResult.name}]`;
            try {
                const { newIbGib, intermediateIbGibs, dnas } = resTransform;
                const ibGibs = [newIbGib, ...(intermediateIbGibs || [])];
                for (let ibGib of ibGibs) {
                    const resPut = yield this.files.put({ ibGib, isMeta });
                    if (!resPut.success) {
                        throw new Error(`${lc} ${resPut.errorMsg}`);
                    }
                }
                if (dnas) {
                    for (let ibGib of dnas) {
                        const resPut = yield this.files.put({ ibGib, isDna: true });
                        if (!resPut.success) {
                            throw new Error(`${lc} ${resPut.errorMsg}`);
                        }
                    }
                }
            }
            catch (error) {
                console.log(`${lc} ${error.message}`);
                throw error;
            }
        });
    }
    /**
     * Relates the given tag to the TagsIbGib, saves the generated
     * TagsIbGib and updates the settings to point to the new TagsIbGib.
     *
     * @param newTagIbGib to add to Tags
     */
    rel8TagToTagsIbGib(newTagIbGib) {
        var _a;
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.rel8TagToTagsIbGib.name}]`;
            try {
                const newTagAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_6__["getIbGibAddr"])({ ibGib: newTagIbGib });
                // get the tags ibgib with rel8ns to all (local) tags
                let tagsAddr = (_a = (yield _capacitor_core__WEBPACK_IMPORTED_MODULE_4__["Storage"].get({ key: _common_constants__WEBPACK_IMPORTED_MODULE_5__["TAGS_IBGIB_ADDR_KEY"] }))) === null || _a === void 0 ? void 0 : _a.value;
                if (!tagsAddr) {
                    throw new Error(`tagsAddr not found`);
                }
                ;
                let resGetTags = yield this.files.get({ addr: tagsAddr, isMeta: true });
                if (!resGetTags.success) {
                    throw new Error(`couldn't get tags`);
                }
                if (!resGetTags.ibGib) {
                    throw new Error(`resGetTags.ibGib falsy`);
                }
                // rel8 the new tag to the tags index.
                const resTransform = yield ts_gib__WEBPACK_IMPORTED_MODULE_3__["V1"].rel8({
                    src: resGetTags.ibGib,
                    rel8nsToAddByAddr: { [_common_constants__WEBPACK_IMPORTED_MODULE_5__["TAG_REL8N_NAME"]]: [newTagAddr] },
                    dna: true,
                    linkedRel8ns: [ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Rel8n"].past],
                });
                // persist
                yield this.persistTransformResult({ resTransform, isMeta: true });
                // return the new tagS address (not the incoming new tag)
                const { newIbGib: newTagsIbGib } = resTransform;
                tagsAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_6__["getIbGibAddr"])({ ibGib: newTagsIbGib });
                return tagsAddr;
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
                throw error;
            }
        });
    }
}
IbgibsService.ɵfac = function IbgibsService_Factory(t) { return new (t || IbgibsService)(_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵinject"](_files_service__WEBPACK_IMPORTED_MODULE_7__["FilesService"])); };
IbgibsService.ɵprov = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjectable"]({ token: IbgibsService, factory: IbgibsService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](IbgibsService, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"],
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: _files_service__WEBPACK_IMPORTED_MODULE_7__["FilesService"] }]; }, null); })();


/***/ }),

/***/ "OlR4":
/*!********************************************!*\
  !*** ./src/app/services/common.service.ts ***!
  \********************************************/
/*! exports provided: CommonService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CommonService", function() { return CommonService; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _ibgibs_service__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ibgibs.service */ "Bim7");
/* harmony import */ var _files_service__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./files.service */ "aXBy");




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
class CommonService {
    constructor(ibgibs, files, nav) {
        this.ibgibs = ibgibs;
        this.files = files;
        this.nav = nav;
    }
}
CommonService.ɵfac = function CommonService_Factory(t) { return new (t || CommonService)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵinject"](_ibgibs_service__WEBPACK_IMPORTED_MODULE_1__["IbgibsService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵinject"](_files_service__WEBPACK_IMPORTED_MODULE_2__["FilesService"]), _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵinject"]('IbgibNav')); };
CommonService.ɵprov = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineInjectable"]({ token: CommonService, factory: CommonService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](CommonService, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"],
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: _ibgibs_service__WEBPACK_IMPORTED_MODULE_1__["IbgibsService"] }, { type: _files_service__WEBPACK_IMPORTED_MODULE_2__["FilesService"] }, { type: undefined, decorators: [{
                type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Inject"],
                args: ['IbgibNav']
            }] }]; }, null); })();


/***/ }),

/***/ "Sy1n":
/*!**********************************!*\
  !*** ./src/app/app.component.ts ***!
  \**********************************/
/*! exports provided: AppComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppComponent", function() { return AppComponent; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/router */ "tyNb");



console.log(`app component file executed`);
class AppComponent {
    constructor() {
        this.title = 'webext-gib';
        console.log(`app component created`);
    }
}
AppComponent.ɵfac = function AppComponent_Factory(t) { return new (t || AppComponent)(); };
AppComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({ type: AppComponent, selectors: [["ibgib-root"]], decls: 3, vars: 0, template: function AppComponent_Template(rf, ctx) { if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p");
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "app component html");
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelement"](2, "router-outlet");
    } }, directives: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterOutlet"]], styles: ["\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJhcHAuY29tcG9uZW50LnNjc3MifQ== */"] });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](AppComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
                selector: 'ibgib-root',
                templateUrl: './app.component.html',
                styleUrls: ['./app.component.scss']
            }]
    }], function () { return []; }, null); })();


/***/ }),

/***/ "T0Ce":
/*!***********************************************************!*\
  !*** ./src/app/common/action-bar/action-bar.component.ts ***!
  \***********************************************************/
/*! exports provided: ActionBarComponent */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ActionBarComponent", function() { return ActionBarComponent; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "mrSG");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _capacitor_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @capacitor/core */ "gcOT");
/* harmony import */ var _bases_ibgib_component_base__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../bases/ibgib-component-base */ "ZcOJ");
/* harmony import */ var ts_gib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ts-gib */ "1ziu");
/* harmony import */ var ts_gib__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(ts_gib__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ts-gib/dist/helper */ "RXni");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ts-gib/dist/V1 */ "b2WX");
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var src_app_services_common_service__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! src/app/services/common.service */ "OlR4");
/* harmony import */ var _angular_common__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! @angular/common */ "ofXK");










function ActionBarComponent_div_0_ion_button_1_Template(rf, ctx) { if (rf & 1) {
    const _r5 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵgetCurrentView"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "ion-button", 2);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵlistener"]("click", function ActionBarComponent_div_0_ion_button_1_Template_ion_button_click_0_listener($event) { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵrestoreView"](_r5); const item_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]().$implicit; return item_r1.handler($event); });
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelement"](1, "ion-icon", 3);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
} if (rf & 2) {
    const item_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]().$implicit;
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("name", item_r1.icon);
} }
function ActionBarComponent_div_0_ion_button_2_Template(rf, ctx) { if (rf & 1) {
    const _r10 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵgetCurrentView"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "ion-button", 2);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵlistener"]("click", function ActionBarComponent_div_0_ion_button_2_Template_ion_button_click_0_listener() { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵrestoreView"](_r10); const _r8 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵreference"](3); return _r8.click(); });
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelement"](1, "ion-icon", 3);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](2, "input", 4, 5);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵlistener"]("change", function ActionBarComponent_div_0_ion_button_2_Template_input_change_2_listener($event) { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵrestoreView"](_r10); const item_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]().$implicit; return item_r1.filepicked($event); });
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
} if (rf & 2) {
    const item_r1 = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵnextContext"]().$implicit;
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("name", item_r1.icon);
} }
function ActionBarComponent_div_0_Template(rf, ctx) { if (rf & 1) {
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "div");
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtemplate"](1, ActionBarComponent_div_0_ion_button_1_Template, 2, 1, "ion-button", 1);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtemplate"](2, ActionBarComponent_div_0_ion_button_2_Template, 4, 1, "ion-button", 1);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
} if (rf & 2) {
    const item_r1 = ctx.$implicit;
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ngIf", item_r1.type === "button");
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);
    _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ngIf", item_r1.type === "inputfile");
} }
const { Modals } = _capacitor_core__WEBPACK_IMPORTED_MODULE_2__["Plugins"];
class ActionBarComponent extends _bases_ibgib_component_base__WEBPACK_IMPORTED_MODULE_3__["IbgibComponentBase"] {
    constructor(common, ref) {
        super(common, ref);
        this.common = common;
        this.ref = ref;
        this.lc = `[${ActionBarComponent.name}]`;
        /**
         * temporary hack
         */
        this.DEFAULT_ACTIONS = [
            {
                type: 'button',
                text: 'comment',
                icon: 'chatbox-outline',
                handler: (event) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () { return yield this.actionAddComment(event); }),
            },
            {
                type: 'button',
                text: 'camera',
                icon: 'camera-outline',
                handler: (event) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () { return yield this.actionAddPic(event); }),
            },
            {
                type: 'inputfile',
                text: 'image',
                icon: 'image-outline',
                filepicked: (event) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () { return yield this.actionAddImage(event); }),
            },
            {
                type: 'button',
                text: 'tag',
                icon: 'pricetag-outline',
                handler: (event) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () { return yield this.actionTag(event); }),
            },
        ];
        this.items = this.DEFAULT_ACTIONS.concat();
    }
    get addr() { return super.addr; }
    set addr(value) { super.addr = value; }
    ngOnInit() { }
    updateIbGib(addr) {
        const _super = Object.create(null, {
            updateIbGib: { get: () => super.updateIbGib }
        });
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
            console.log(`${lc} updating.`);
            yield _super.updateIbGib.call(this, addr);
            yield this.updateActions();
        });
    }
    updateActions() {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            this.items = this.DEFAULT_ACTIONS.concat(); // dev only
        });
    }
    actionAddComment(event) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.actionAddComment.name}]`;
            try {
                console.log(`${lc} __`);
                const resComment = yield Modals.prompt({
                    title: 'comment',
                    message: 'add text',
                    inputPlaceholder: 'text here',
                });
                console.log(`${lc} 1`);
                if (resComment.cancelled || !resComment.value) {
                    return;
                }
                const text = resComment.value.trim();
                console.log(`${lc} text: ${text}`);
                const data = { text, textTimestamp: Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getTimestamp"])() };
                console.log(`${lc} 2a`);
                // create an ibgib with the filename and ext
                const opts = {
                    parentIbGib: ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_6__["Factory_V1"].primitive({ ib: 'comment' }),
                    ib: `comment ${text.length > 10 ? text.substring(0, 10) : text}`,
                    data,
                    dna: true,
                    tpj: { uuid: true }
                };
                if (this.addr) {
                    opts.rel8ns = { 'comment on': [this.addr] };
                }
                console.log(`${lc} opts: ${Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["pretty"])(opts)}`);
                const resCommentIbGib = yield ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_6__["Factory_V1"].firstGen(opts);
                console.log(`${lc} 2b`);
                yield this.common.ibgibs.persistTransformResult({ resTransform: resCommentIbGib });
                console.log(`${lc} 2c`);
                const { newIbGib: newComment } = resCommentIbGib;
                const newCommentAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])({ ibGib: newComment });
                // need to nav to picture if not in a context, or
                // or if in context need to rel8 to the context.
                console.log(`${lc} 3`);
                let navToAddr;
                if (this.addr) {
                    // if we have a context, rel8 to it
                    if (!this.ibGib) {
                        yield this.loadIbGib();
                    }
                    const rel8nsToAddByAddr = { comment: [newCommentAddr] };
                    const resRel8ToContext = yield ts_gib__WEBPACK_IMPORTED_MODULE_4__["V1"].rel8({ src: this.ibGib, rel8nsToAddByAddr, dna: true });
                    yield this.common.ibgibs.persistTransformResult({ resTransform: resRel8ToContext });
                    const { newIbGib: newContext } = resRel8ToContext;
                    const newContextAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])(newContext);
                    console.log(`${lc} 4`);
                    // nav to either the pic we just added, or the new context "in time"
                    // to which the pic was added.
                    navToAddr = this.isMeta ?
                        Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])({ ibGib: newComment }) :
                        Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])({ ibGib: newContext });
                }
                else {
                    navToAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])({ ibGib: newComment });
                }
                yield this.navTo({ addr: navToAddr });
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
            }
        });
    }
    /**
     * shared pic code between camera and loading image via picking a file.
     */
    doPic({ imageBase64, binHash, filename, ext, }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.doPic.name}]`;
            const resSavePic = yield this.files.put({ binData: imageBase64, binExt: ext });
            // await this.files.put({binData: image.base64String, binExt: ext});
            if (!resSavePic.success) {
                throw new Error(resSavePic.errorMsg || 'error saving pic');
            }
            if (!resSavePic.binHash) {
                throw new Error(resSavePic.errorMsg || 'no bin hash created');
            }
            // todo: do thumbnail also
            // NOTE: This is not the same filename that is saved in the bin folder!
            // This is for when the picture is downloaded outside of the ibGib system
            // or for display purposes.
            const timestamp = (new Date).toUTCString();
            filename = filename || timestamp
                .replace(':', '-')
                .replace(':', '-')
                .replace(',', ''); // temporary eek.
            console.log(`${lc} binHash: ${binHash}`);
            console.log(`${lc} ext: ${ext}`);
            const data = { binHash, ext, filename, timestamp };
            const rel8ns = { 'pic on': [this.addr] };
            // create an ibgib with the filename and ext
            const resPicIbGib = yield ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_6__["Factory_V1"].firstGen({
                parentIbGib: ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_6__["Factory_V1"].primitive({ ib: 'pic' }),
                ib: `pic ${binHash}`,
                data,
                rel8ns,
                dna: true,
                tpj: { uuid: true }
            });
            yield this.common.ibgibs.persistTransformResult({ resTransform: resPicIbGib });
            const { newIbGib: newPic } = resPicIbGib;
            const newPicAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])({ ibGib: newPic });
            // need to nav to picture if not in a context, or
            // or if in context need to rel8 to the context.
            // rel8 to context
            if (!this.ibGib) {
                yield this.loadIbGib();
            }
            const rel8nsToAddByAddr = { pic: [newPicAddr] };
            const resRel8ToContext = yield ts_gib__WEBPACK_IMPORTED_MODULE_4__["V1"].rel8({ src: this.ibGib, rel8nsToAddByAddr, dna: true });
            yield this.common.ibgibs.persistTransformResult({ resTransform: resRel8ToContext });
            const { newIbGib: newContext } = resRel8ToContext;
            const newContextAddr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])(newContext);
            // nav to either the pic we just added, or the new context "in time"
            // to which the pic was added.
            const navToAddr = this.isMeta ?
                Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])({ ibGib: newPic }) :
                Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbGibAddr"])({ ibGib: newContext });
            yield this.navTo({ addr: navToAddr });
        });
    }
    /**
     * Horrifically large function to add a picture,
     * create the ibgib, save, etc.
     *
     * Must refactor this at a later time though.
     */
    actionAddPic(event) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.actionAddPic.name}]`;
            try {
                // get the image from the camera
                const image = yield _capacitor_core__WEBPACK_IMPORTED_MODULE_2__["Camera"].getPhoto({
                    quality: 90,
                    allowEditing: false,
                    resultType: _capacitor_core__WEBPACK_IMPORTED_MODULE_2__["CameraResultType"].Base64,
                });
                // save the image bin data
                // get the hash of the image
                const binHash = yield Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["hash"])({ s: image.base64String });
                const ext = image.format;
                yield this.doPic({ imageBase64: image.base64String, binHash, ext });
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
            }
        });
    }
    getExt(path) {
        const pathPieces = path.split('/');
        const fullFilename = pathPieces[pathPieces.length - 1];
        if (fullFilename.includes('.') && !fullFilename.endsWith('.')) {
            const lastDotIndex = fullFilename.lastIndexOf('.');
            return {
                filename: fullFilename.slice(0, lastDotIndex),
                ext: fullFilename.slice(lastDotIndex + 1),
            };
        }
        else {
            return { filename: fullFilename, ext: "" };
        }
    }
    actionAddImage(event) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            // await Modals.alert({title: 'file', message: `picked a file yo`});
            // thanks https://edupala.com/capacitor-camera-example/
            const file = event.target.files[0];
            const pattern = /image-*/;
            const reader = new FileReader();
            if (!file.type.match(pattern)) {
                console.log('File format not supported');
                return;
            }
            reader.onload = (f) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
                let imageBase64 = reader.result.toString().split('base64,')[1];
                let binHash = yield Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["hash"])({ s: imageBase64 });
                const filenameWithExt = file.name;
                const filenamePieces = filenameWithExt.split('.');
                const filename = filenamePieces.slice(0, filenamePieces.length - 1).join('.');
                const ext = filenamePieces.slice(filenamePieces.length - 1)[0];
                yield this.doPic({ imageBase64, binHash, filename, ext });
            });
            reader.readAsDataURL(file);
        });
    }
    actionTag(event) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.actionTag.name}]`;
            try {
                const tagsIbGib = yield this.common.ibgibs.getTagsIbgib({ initialize: false });
                const tagAddrs = tagsIbGib.rel8ns.tag;
                const tagOptions = tagAddrs.map(addr => {
                    const { ib } = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_5__["getIbAndGib"])({ ibGibAddr: addr });
                    const tag = ib.substring('tag '.length);
                    return { title: tag };
                });
                let resPrompt = yield Modals.showActions({
                    title: 'Select tag',
                    message: 'Select a tag to add this ibGib to',
                    options: [{ title: 'Cancel Tag' }, ...tagOptions]
                });
                if (resPrompt.index > 0) {
                    yield _capacitor_core__WEBPACK_IMPORTED_MODULE_2__["Plugins"].Modals.alert({ title: 'selected', message: tagOptions[resPrompt.index - 1].title });
                }
                else {
                    yield _capacitor_core__WEBPACK_IMPORTED_MODULE_2__["Plugins"].Modals.alert({ title: 'nope', message: 'cancelled' });
                }
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
            }
        });
    }
}
ActionBarComponent.ɵfac = function ActionBarComponent_Factory(t) { return new (t || ActionBarComponent)(_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdirectiveInject"](src_app_services_common_service__WEBPACK_IMPORTED_MODULE_7__["CommonService"]), _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdirectiveInject"](_angular_core__WEBPACK_IMPORTED_MODULE_1__["ChangeDetectorRef"])); };
ActionBarComponent.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineComponent"]({ type: ActionBarComponent, selectors: [["action-bar"]], inputs: { addr: "addr", items: "items" }, features: [_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵInheritDefinitionFeature"]], decls: 1, vars: 1, consts: [[4, "ngFor", "ngForOf"], ["color", "primary", "shape", "round", 3, "click", 4, "ngIf"], ["color", "primary", "shape", "round", 3, "click"], ["slot", "start", 3, "name"], ["type", "file", "hidden", "", 3, "change"], ["inputyo", ""]], template: function ActionBarComponent_Template(rf, ctx) { if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtemplate"](0, ActionBarComponent_div_0_Template, 3, 2, "div", 0);
    } if (rf & 2) {
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("ngForOf", ctx.items);
    } }, directives: [_angular_common__WEBPACK_IMPORTED_MODULE_8__["NgForOf"], _angular_common__WEBPACK_IMPORTED_MODULE_8__["NgIf"]], styles: ["[_nghost-%COMP%] {\n  overflow-x: scroll;\n  overflow-y: none;\n}\n\ninput[_ngcontent-%COMP%] {\n  height: 0px;\n  width: 0px;\n  margin: 0px;\n  padding: 0px;\n}\n\nion-icon[_ngcontent-%COMP%] {\n  margin: 0px;\n}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2FjdGlvbi1iYXIuY29tcG9uZW50LnNjc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFDSSxrQkFBQTtFQUNBLGdCQUFBO0FBQ0o7O0FBRUE7RUFDSSxXQUFBO0VBQ0EsVUFBQTtFQUNBLFdBQUE7RUFDQSxZQUFBO0FBQ0o7O0FBRUE7RUFDSSxXQUFBO0FBQ0oiLCJmaWxlIjoiYWN0aW9uLWJhci5jb21wb25lbnQuc2NzcyIsInNvdXJjZXNDb250ZW50IjpbIjpob3N0IHtcbiAgICBvdmVyZmxvdy14OiBzY3JvbGw7XG4gICAgb3ZlcmZsb3cteTogbm9uZTtcbn1cblxuaW5wdXQge1xuICAgIGhlaWdodDogMHB4O1xuICAgIHdpZHRoOiAwcHg7XG4gICAgbWFyZ2luOiAwcHg7XG4gICAgcGFkZGluZzogMHB4O1xufVxuXG5pb24taWNvbiB7XG4gICAgbWFyZ2luOiAwcHg7XG59XG4iXX0= */"] });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](ActionBarComponent, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"],
        args: [{
                selector: 'action-bar',
                templateUrl: './action-bar.component.html',
                styleUrls: ['./action-bar.component.scss'],
            }]
    }], function () { return [{ type: src_app_services_common_service__WEBPACK_IMPORTED_MODULE_7__["CommonService"] }, { type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["ChangeDetectorRef"] }]; }, { addr: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], items: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }] }); })();


/***/ }),

/***/ "XY7g":
/*!*************************************!*\
  !*** ./src/app/common/constants.ts ***!
  \*************************************/
/*! exports provided: IBGIB_BASE_DIR, IBGIB_FILES_ENCODING, IBGIB_BASE_SUBPATH, IBGIB_IBGIBS_SUBPATH, IBGIB_META_SUBPATH, IBGIB_BIN_SUBPATH, IBGIB_DNA_SUBPATH, TAGS_IB, TAGS_IBGIB_ADDR, TAGS_IBGIB_ADDR_KEY, TAG_REL8N_NAME, TAGGED_REL8N_NAME, DEFAULT_LIST_REL8N_NAMES, DEFAULT_META_IB_STARTS, SPECIAL_URLS */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IBGIB_BASE_DIR", function() { return IBGIB_BASE_DIR; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IBGIB_FILES_ENCODING", function() { return IBGIB_FILES_ENCODING; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IBGIB_BASE_SUBPATH", function() { return IBGIB_BASE_SUBPATH; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IBGIB_IBGIBS_SUBPATH", function() { return IBGIB_IBGIBS_SUBPATH; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IBGIB_META_SUBPATH", function() { return IBGIB_META_SUBPATH; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IBGIB_BIN_SUBPATH", function() { return IBGIB_BIN_SUBPATH; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IBGIB_DNA_SUBPATH", function() { return IBGIB_DNA_SUBPATH; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TAGS_IB", function() { return TAGS_IB; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TAGS_IBGIB_ADDR", function() { return TAGS_IBGIB_ADDR; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TAGS_IBGIB_ADDR_KEY", function() { return TAGS_IBGIB_ADDR_KEY; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TAG_REL8N_NAME", function() { return TAG_REL8N_NAME; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TAGGED_REL8N_NAME", function() { return TAGGED_REL8N_NAME; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DEFAULT_LIST_REL8N_NAMES", function() { return DEFAULT_LIST_REL8N_NAMES; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "DEFAULT_META_IB_STARTS", function() { return DEFAULT_META_IB_STARTS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SPECIAL_URLS", function() { return SPECIAL_URLS; });
/* harmony import */ var _capacitor_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @capacitor/core */ "gcOT");
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ts-gib/dist/V1 */ "b2WX");
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_1__);


const IBGIB_BASE_DIR = _capacitor_core__WEBPACK_IMPORTED_MODULE_0__["FilesystemDirectory"].Documents;
const IBGIB_FILES_ENCODING = _capacitor_core__WEBPACK_IMPORTED_MODULE_0__["FilesystemEncoding"].UTF8;
const IBGIB_BASE_SUBPATH = 'ibgib';
const IBGIB_IBGIBS_SUBPATH = 'ibgibs';
/**
 * contains special ibgibs
 *
 * Use case:
 *   Because some special ibgibs will be changed frequently,
 *   e.g. settings, a separate folder will be useful.
 */
const IBGIB_META_SUBPATH = 'meta';
/**
 * Path for storing binaries (e.g. pics).
 *
 * bins will be stored in the format:
 *   [hash].ext
 *
 * @example
 *   ABC123.jpg
 */
const IBGIB_BIN_SUBPATH = 'bin';
const IBGIB_DNA_SUBPATH = 'dna';
const TAGS_IB = 'tags';
const TAGS_IBGIB_ADDR = `${TAGS_IB}^${ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_1__["GIB"]}`;
const TAGS_IBGIB_ADDR_KEY = `key ${TAGS_IBGIB_ADDR}`;
/**
 * The main tags^gib ibgib uses this rel8n name to keep track of tags.
 */
const TAG_REL8N_NAME = 'tag';
/**
 * A tag ibGib uses this rel8n name for the ibgibs that it targets.
 */
const TAGGED_REL8N_NAME = 'tagged';
/**
 * These rel8n names are shown in a list view by default.
 */
const DEFAULT_LIST_REL8N_NAMES = [
    'pic', 'comment', 'link', 'tag', 'result'
];
const DEFAULT_META_IB_STARTS = [
    'tags', 'tag ', 'settings', 'setting ',
];
const SPECIAL_URLS = [
    'tags', 'home'
];


/***/ }),

/***/ "Y1z+":
/*!****************************************!*\
  !*** ./src/app/page-selector.guard.ts ***!
  \****************************************/
/*! exports provided: PageSelectorGuard */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "PageSelectorGuard", function() { return PageSelectorGuard; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/router */ "tyNb");



const TARGET_QUERY_PARAM_NAME = 'target';
const TARGETS = [
    'sidebar',
    'browser-action',
];
class PageSelectorGuard {
    constructor(router) {
        this.router = router;
    }
    canActivate(next, state) {
        const target = next.queryParams[TARGET_QUERY_PARAM_NAME];
        if (target) {
            if (TARGETS.includes(target)) {
                // redirect to a valid target
                return this.router.navigate(['/' + target], {
                    queryParams: { [TARGET_QUERY_PARAM_NAME]: null, },
                    queryParamsHandling: "merge"
                }).then(() => { return false; });
            }
            else {
                // todo: need to redirect to invalid url
                return false;
            }
        }
        else {
            // no target query param so this guard doesn't apply
            return true;
        }
    }
}
PageSelectorGuard.ɵfac = function PageSelectorGuard_Factory(t) { return new (t || PageSelectorGuard)(_angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵinject"](_angular_router__WEBPACK_IMPORTED_MODULE_1__["Router"])); };
PageSelectorGuard.ɵprov = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineInjectable"]({ token: PageSelectorGuard, factory: PageSelectorGuard.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](PageSelectorGuard, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Injectable"],
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: _angular_router__WEBPACK_IMPORTED_MODULE_1__["Router"] }]; }, null); })();


/***/ }),

/***/ "Y5Rv":
/*!*******************************************************!*\
  !*** ./src/app/browser-action/browser-action.page.ts ***!
  \*******************************************************/
/*! exports provided: BrowserActionPage */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BrowserActionPage", function() { return BrowserActionPage; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "fXoL");


class BrowserActionPage {
    constructor() { }
    ngOnInit() {
    }
}
BrowserActionPage.ɵfac = function BrowserActionPage_Factory(t) { return new (t || BrowserActionPage)(); };
BrowserActionPage.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineComponent"]({ type: BrowserActionPage, selectors: [["ibgib-browser-action"]], decls: 2, vars: 0, template: function BrowserActionPage_Template(rf, ctx) { if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementStart"](0, "p");
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵtext"](1, "browser-action works!");
        _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵelementEnd"]();
    } }, styles: ["\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJicm93c2VyLWFjdGlvbi5wYWdlLnNjc3MifQ== */"] });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](BrowserActionPage, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["Component"],
        args: [{
                selector: 'ibgib-browser-action',
                templateUrl: './browser-action.page.html',
                styleUrls: ['./browser-action.page.scss']
            }]
    }], function () { return []; }, null); })();


/***/ }),

/***/ "ZAI4":
/*!*******************************!*\
  !*** ./src/app/app.module.ts ***!
  \*******************************/
/*! exports provided: AppModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppModule", function() { return AppModule; });
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/platform-browser */ "jhN1");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _app_routing_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./app-routing.module */ "vY5A");
/* harmony import */ var _app_component__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app.component */ "Sy1n");
/* harmony import */ var _browser_action_browser_action_page__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./browser-action/browser-action.page */ "Y5Rv");
/* harmony import */ var _sidebar_sidebar_page__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./sidebar/sidebar.page */ "qK2e");
/* harmony import */ var _services_ng_ibgib_nav_service__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./services/ng-ibgib-nav.service */ "e4ts");
/* harmony import */ var _common_action_bar_action_bar_component__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./common/action-bar/action-bar.component */ "T0Ce");









class AppModule {
}
AppModule.ɵmod = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineNgModule"]({ type: AppModule, bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_3__["AppComponent"]] });
AppModule.ɵinj = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjector"]({ factory: function AppModule_Factory(t) { return new (t || AppModule)(); }, providers: [
        {
            provide: 'IbgibNav',
            useClass: _services_ng_ibgib_nav_service__WEBPACK_IMPORTED_MODULE_6__["NgIbgibNavService"],
        }
    ], imports: [[
            _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__["BrowserModule"],
            _app_routing_module__WEBPACK_IMPORTED_MODULE_2__["AppRoutingModule"]
        ]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵsetNgModuleScope"](AppModule, { declarations: [_app_component__WEBPACK_IMPORTED_MODULE_3__["AppComponent"],
        _common_action_bar_action_bar_component__WEBPACK_IMPORTED_MODULE_7__["ActionBarComponent"],
        _browser_action_browser_action_page__WEBPACK_IMPORTED_MODULE_4__["BrowserActionPage"],
        _sidebar_sidebar_page__WEBPACK_IMPORTED_MODULE_5__["SidebarPage"]], imports: [_angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__["BrowserModule"],
        _app_routing_module__WEBPACK_IMPORTED_MODULE_2__["AppRoutingModule"]] }); })();
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](AppModule, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["NgModule"],
        args: [{
                declarations: [
                    _app_component__WEBPACK_IMPORTED_MODULE_3__["AppComponent"],
                    _common_action_bar_action_bar_component__WEBPACK_IMPORTED_MODULE_7__["ActionBarComponent"],
                    _browser_action_browser_action_page__WEBPACK_IMPORTED_MODULE_4__["BrowserActionPage"],
                    _sidebar_sidebar_page__WEBPACK_IMPORTED_MODULE_5__["SidebarPage"],
                ],
                imports: [
                    _angular_platform_browser__WEBPACK_IMPORTED_MODULE_0__["BrowserModule"],
                    _app_routing_module__WEBPACK_IMPORTED_MODULE_2__["AppRoutingModule"]
                ],
                providers: [
                    {
                        provide: 'IbgibNav',
                        useClass: _services_ng_ibgib_nav_service__WEBPACK_IMPORTED_MODULE_6__["NgIbgibNavService"],
                    }
                ],
                bootstrap: [_app_component__WEBPACK_IMPORTED_MODULE_3__["AppComponent"]]
            }]
    }], null, null); })();


/***/ }),

/***/ "ZcOJ":
/*!******************************************************!*\
  !*** ./src/app/common/bases/ibgib-component-base.ts ***!
  \******************************************************/
/*! exports provided: IbgibComponentBase */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "IbgibComponentBase", function() { return IbgibComponentBase; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "mrSG");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ts-gib/dist/V1 */ "b2WX");
/* harmony import */ var ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var ts_gib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ts-gib */ "1ziu");
/* harmony import */ var ts_gib__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(ts_gib__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ts-gib/dist/helper */ "RXni");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../constants */ "XY7g");
/* harmony import */ var src_app_services_common_service__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! src/app/services/common.service */ "OlR4");









// @Injectable({providedIn: "root"})
class IbgibComponentBase {
    constructor(common, ref) {
        this.common = common;
        this.ref = ref;
        /**
         * log context. Override this property in descending classes.
         *
         * NOTE:
         *   I use very short variable names ONLY when they are all over
         *   the place. This is used all throughout the codebase.
         *   Otherwise, I usually use very long names...often too long! :-)
         */
        this.lc = `[${IbgibComponentBase.name}]`;
    }
    // private _addr: IbGibAddr;
    get addr() { var _a; return (_a = this.item) === null || _a === void 0 ? void 0 : _a.addr; }
    set addr(value) {
        const lc = `${this.lc}[set addr(${value})]`;
        if (this._updatingIbGib) {
            console.log(`${lc} already updatingIbGib`);
            return;
        }
        console.log(`${lc} updating ibgib ${value}`);
        this._updatingIbGib = true;
        this.updateIbGib(value).finally(() => {
            this._updatingIbGib = false;
        });
    }
    get ib() { var _a; return (_a = this.item) === null || _a === void 0 ? void 0 : _a.ib; }
    get gib() { var _a; return (_a = this.item) === null || _a === void 0 ? void 0 : _a.gib; }
    get ibGib() { var _a; return (_a = this.item) === null || _a === void 0 ? void 0 : _a.ibGib; }
    get isMeta() {
        var _a;
        return ((_a = this.item) === null || _a === void 0 ? void 0 : _a.isMeta) || _constants__WEBPACK_IMPORTED_MODULE_5__["DEFAULT_META_IB_STARTS"].some(x => { var _a; return (_a = this.ib) === null || _a === void 0 ? void 0 : _a.startsWith(x); }); // hack
    }
    get files() { return this.common.files; }
    get isTag() { var _a; return ((_a = this.ib) === null || _a === void 0 ? void 0 : _a.startsWith('tag')) || false; }
    get isPic() { var _a; return ((_a = this.ib) === null || _a === void 0 ? void 0 : _a.startsWith('pic')) || false; }
    get isComment() { var _a; return ((_a = this.ib) === null || _a === void 0 ? void 0 : _a.startsWith('comment')) || false; }
    /**
     * Hack because ngSwitchCase doesn't seem to work properly. Probably my fault...hmmm
     *
     * this is used in the fallback case.
     */
    get itemTypes() { return ['pic', 'comment', 'tag']; }
    ngOnInit() { }
    ngOnDestroy() { }
    get title() {
        var _a, _b;
        if ((_a = this.ib) === null || _a === void 0 ? void 0 : _a.startsWith('tag ')) {
            return this.ib.split(' ').slice(1).join(' ');
        }
        else if ((_b = this.ib) === null || _b === void 0 ? void 0 : _b.startsWith('pic ')) {
            return this.ib.split(' ').slice(1).join(' ');
        }
        else {
            return this.ib || 'loading...';
        }
    }
    clearItem() {
        const lc = `${this.lc}[${this.clearItem.name}]`;
        console.log(`${lc} clearing data...`);
        // delete this._addr;
        delete this.item;
        // delete this.ib;
        // delete this.gib;
        // delete this.ibGib;
        // delete this.isMeta;
        console.log(`${lc} data cleared.`);
    }
    updateIbGib(addr) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
            if (addr === this.addr) {
                return;
            }
            this.clearItem();
            if (addr) {
                console.log(`${lc} setting new address`);
                // we have an addr which is different than our previous.
                const { ib, gib } = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__["getIbAndGib"])({ ibGibAddr: addr });
                this.item = {
                    addr,
                    ib,
                    gib,
                };
                if (this.gib === ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["GIB"] && !this.isMeta) {
                    this.item.isMeta = true;
                }
            }
            else {
                console.log(`${lc} no new address`);
            }
        });
    }
    /**
     * Loads the ibGib's full record, using the files service.
     *
     * This is not required for all components!
     *
     * @param force reload the ibGib even if the addr matches the current this.ibGib
     */
    loadIbGib({ item, force, } = {
        item: this.item,
    }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.loadIbGib.name}]`;
            if (!item) {
                const isMeta = this.isMeta;
                item = this.item;
                item.isMeta = isMeta;
            }
            if (item.addr) {
                const { ib, gib } = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__["getIbAndGib"])({ ibGibAddr: item.addr });
                if (!force && item.ibGib && Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__["getIbGibAddr"])({ ibGib: item.ibGib }) === item.addr) {
                    // do nothing, because we already have loaded this address.
                }
                else {
                    if (gib === ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["GIB"]) {
                        // primitive, just build
                        item.ibGib = ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Factory_V1"].primitive({ ib });
                    }
                    else {
                        // try to get from files provider
                        const resGet = yield this.files.get({ addr: item.addr, isMeta: item.isMeta });
                        if (resGet.success) {
                            item.ibGib = resGet.ibGib;
                        }
                        else if (!resGet.success && item.isMeta) {
                            // we've tried to load a meta ibGib that does not exist.
                            item.ibGib = ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Factory_V1"].primitive({ ib });
                        }
                        else {
                            console.error(`${lc} ${resGet.errorMsg || 'unknown error'}`);
                        }
                    }
                }
            }
            else {
                item.ibGib = null;
            }
        });
    }
    /**
     * Creates a primitive ibGib, forks it with the same ib
     * but with a tpj (temporal junction point, aka birthday) to give it
     * uniqueness and returns the fork result, which includes the unique ibGib.
     *
     * Also this will by default use linkedRel8ns for 'past' and 'ancestor'.
     *
     * Perhaps this should be somewhere in the core lib, perhaps in the factory.
     *
     * @param ib primitive ib
     */
    reifyPrimitive({ ib, dna }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const primitive = ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Factory_V1"].primitive({ ib });
            const result = yield ts_gib__WEBPACK_IMPORTED_MODULE_3__["V1"].fork({
                src: primitive,
                dna,
                linkedRel8ns: [ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Rel8n"].past, ts_gib_dist_V1__WEBPACK_IMPORTED_MODULE_2__["Rel8n"].ancestor],
                tpj: { uuid: true, timestamp: true },
            });
            return result;
        });
    }
    navTo({ addr }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            console.log(`navigating to addr: ${addr}`);
            yield this.common.nav.navTo({ addr });
            // await this.common.nav.navigateRoot(['ibgib', addr], {
            //     queryParamsHandling: 'preserve',
            //     animated: true,
            //     animationDirection: 'forward',
            // });
        });
    }
    /**
     * Load the item's other properties, e.g. text or tagText.
     *
     * Does nothing in base implementation.
     */
    loadItem(item) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            item = item || this.item;
            if (!item) {
                return;
            }
            yield this.loadType(item);
            if (item.type === 'pic') {
                yield this.loadPic(item);
            }
            if (item.type === 'comment') {
                yield this.loadComment(item);
            }
        });
    }
    loadType(item) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            item = item || this.item;
            if (this.isTag) {
                this.item.type = 'tag';
            }
            else if (this.isPic) {
                this.item.type = 'pic';
            }
            else if (this.isComment) {
                this.item.type = 'comment';
            }
        });
    }
    loadPic(item) {
        var _a, _b, _c, _d;
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.loadPic.name}]`;
            if (!this.isPic) {
                return;
            }
            if (!((_b = (_a = this.ibGib) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.binHash)) {
                return;
            }
            if (!((_d = (_c = this.ibGib) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.ext)) {
                return;
            }
            const data = this.ibGib.data;
            const resGet = yield this.common.files.get({ binHash: data.binHash, binExt: data.ext });
            this.item.timestamp = data.timestamp;
            // this.item.picSrc = await this.common.files.getFileSrc({binHash: data.binHash, binExt: data.ext});
            console.log(`${lc} src: ${this.item.picSrc}`);
            if (resGet.success && resGet.binData) {
                this.item.picSrc = `data:image/jpeg;base64,${resGet.binData}`;
                setTimeout(() => {
                    this.ref.detectChanges();
                }, 2000);
            }
            else {
                console.error(`${lc} Couldn't get pic. ${resGet.errorMsg}`);
            }
        });
    }
    loadComment(item) {
        var _a, _b;
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.loadComment.name}]`;
            if (!this.isComment) {
                return;
            }
            if (!((_b = (_a = this.ibGib) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.text)) {
                return;
            }
            const data = this.ibGib.data;
            this.item.text = data.text;
            this.item.timestamp = data.textTimestamp || data.timestamp;
        });
    }
}
IbgibComponentBase.ɵfac = function IbgibComponentBase_Factory(t) { return new (t || IbgibComponentBase)(_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵinject"](src_app_services_common_service__WEBPACK_IMPORTED_MODULE_6__["CommonService"]), _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵinject"](_angular_core__WEBPACK_IMPORTED_MODULE_1__["ChangeDetectorRef"])); };
IbgibComponentBase.ɵprov = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjectable"]({ token: IbgibComponentBase, factory: IbgibComponentBase.ɵfac });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](IbgibComponentBase, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"]
    }], function () { return [{ type: src_app_services_common_service__WEBPACK_IMPORTED_MODULE_6__["CommonService"] }, { type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["ChangeDetectorRef"] }]; }, { addr: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], item: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], ib: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], gib: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], ibGib: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], isMeta: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], isTag: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], isPic: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }], isComment: [{
            type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Input"]
        }] }); })();


/***/ }),

/***/ "aXBy":
/*!*******************************************!*\
  !*** ./src/app/services/files.service.ts ***!
  \*******************************************/
/*! exports provided: FilesService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FilesService", function() { return FilesService; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "mrSG");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _capacitor_core__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @capacitor/core */ "gcOT");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ts-gib/dist/helper */ "RXni");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _common_constants__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../common/constants */ "XY7g");
/* harmony import */ var _angular_common_http__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @angular/common/http */ "tk/3");
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! @angular/platform-browser */ "jhN1");








const { Filesystem } = _capacitor_core__WEBPACK_IMPORTED_MODULE_2__["Plugins"];
/**
 * Works with file system/storage to save/load ibgibs.
 *
 * Relies on Capacitor's FileSystem plugin.
 */
class FilesService {
    constructor(http, sanitizer) {
        this.http = http;
        this.sanitizer = sanitizer;
        this.lc = `[${FilesService.name}]`;
        console.log('Hello FilesService Service');
    }
    buildPath({ filename, isMeta, isDna, isBin }) {
        if (isMeta) {
            return `${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"]}/${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_META_SUBPATH"]}/${filename}`;
        }
        else if (isBin) {
            return `${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"]}/${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BIN_SUBPATH"]}/${filename}`;
        }
        else if (isDna) {
            return `${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"]}/${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_DNA_SUBPATH"]}/${filename}`;
        }
        else {
            // regular ibGib
            return `${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"]}/${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_IBGIBS_SUBPATH"]}/${filename}`;
        }
    }
    getFilename({ addr, binHash, binExt }) {
        if (addr) {
            return `${addr}.json`;
        }
        else {
            return binExt ? binHash + '.' + binExt : binHash;
        }
    }
    get({ addr, binHash, binExt, isMeta, isDna, getRawResult, }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.get.name}(${addr})]`;
            if (!addr && !binHash) {
                throw new Error(`${lc} addr or binHash required.`);
            }
            ;
            const { ib, gib } = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_3__["getIbAndGib"])({ ibGibAddr: addr });
            const isBin = !addr;
            const result = {};
            const tryRead = (p) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
                const lcTry = `${lc}[${tryRead.name}]`;
                try {
                    const resRead = yield Filesystem.readFile({
                        path: p,
                        directory: _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_DIR"],
                        encoding: _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_FILES_ENCODING"],
                    });
                    console.log(`${lc} path found: ${p}`);
                    return resRead;
                }
                catch (error) {
                    console.log(`${lc} path not found: ${p}`);
                    return null;
                }
            });
            try {
                let path = "";
                let filename = "";
                let paths = [];
                if (addr) {
                    filename = this.getFilename({ addr });
                    if (isMeta) {
                        // explicitly stating meta, so only look in meta
                        paths = [this.buildPath({ filename, isMeta: true, isDna: false }),];
                    }
                    else if (isDna) {
                        // explicitly stating dna, so only look in dna
                        paths = [this.buildPath({ filename, isMeta: false, isDna: true }),];
                    }
                    else {
                        // could be regular, meta or dna, so we'll search everywhere, but first regular.
                        paths = [
                            this.buildPath({ filename, isMeta: false, isDna: false }),
                            this.buildPath({ filename, isMeta: true, isDna: false }),
                            this.buildPath({ filename, isMeta: false, isDna: true }),
                        ];
                    }
                }
                else {
                    filename = binExt ? binHash + '.' + binExt : binHash;
                    path = this.buildPath({ filename, isDna: false, isMeta: false, isBin: true });
                    paths = [path];
                }
                let resRead = null;
                for (const tryPath of paths) {
                    let x = yield tryRead(tryPath);
                    if (x === null || x === void 0 ? void 0 : x.data) {
                        resRead = x;
                        break;
                    }
                }
                if (!resRead) {
                    throw new Error(`paths not found: ${JSON.stringify(paths)}`);
                }
                if (!isBin) {
                    // ibGib retrieved
                    result.ibGib = JSON.parse(resRead.data);
                }
                else {
                    // bin
                    result.binData = resRead.data;
                }
                if (getRawResult) {
                    result.raw = resRead;
                }
                result.success = true;
            }
            catch (error) {
                const errorMsg = `${lc} ${error.message}`;
                console.error(errorMsg);
                result.errorMsg = errorMsg;
            }
            return result;
        });
    }
    // async getFileSrc({binHash, binExt}: {binHash: string, binExt: string}): Promise<any> {
    //   const lc = `${this.lc}[${this.getFileSrc.name}(${binHash})]`;
    //   let filename = binExt ?
    //     binHash + '.' + binExt :
    //     binHash;
    //   let path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true});
    //   console.log(`${lc} path: ${path}`);
    //   let resGet = await Filesystem.getUri({path, directory: IBGIB_BASE_DIR});
    //   console.log(`${lc} original uri: ${resGet.uri}`);
    //   let uri = Capacitor.convertFileSrc(resGet.uri);
    //   console.log(`${lc} final uri: ${uri}`);
    //   let sanitized = this.sanitizer.bypassSecurityTrustUrl(uri);
    //   return uri;
    //   // return Capacitor.convertFileSrc(IBGIB_BASE_DIR + '/' + path);
    // }
    put({ ibGib, binData, binExt, isMeta, isDna, getRawResult, }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.put.name}]`;
            if (!ibGib && !binData) {
                throw new Error(`${lc} ibGib or binData required.`);
            }
            ;
            let result = {};
            try {
                yield this.ensureDirs();
                let path = "";
                let filename = "";
                let data = "";
                if (ibGib) {
                    const addr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_3__["getIbGibAddr"])({ ibGib });
                    filename = `${addr}.json`;
                    path = this.buildPath({ filename, isMeta, isDna });
                    data = JSON.stringify(ibGib);
                }
                else {
                    const binHash = yield Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_3__["hash"])({ s: binData });
                    filename = binExt ? binHash + '.' + binExt : binHash;
                    path = this.buildPath({ filename, isDna: false, isMeta: false, isBin: true });
                    data = binData;
                    result.binHash = binHash;
                }
                const resWrite = yield Filesystem.writeFile({
                    path,
                    data,
                    directory: _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_DIR"],
                    encoding: _capacitor_core__WEBPACK_IMPORTED_MODULE_2__["FilesystemEncoding"].UTF8
                });
                console.log(`${lc} resWrite.uri: ${resWrite.uri}`);
                result.success = true;
                if (getRawResult) {
                    result.raw = resWrite;
                }
            }
            catch (error) {
                const errorMsg = `${lc} ${error.message}`;
                console.error(errorMsg);
                result.errorMsg = errorMsg;
            }
            return result;
        });
    }
    /**
     * Ensure directories are created on filesystem.
     */
    ensureDirs() {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const directory = _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_DIR"];
            const ensure = (path) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
                const lc = `ensure(path: ${path})`;
                let exists = false;
                try {
                    const result = yield Filesystem.readdir({ path, directory });
                    console.log(`${lc} result.files: ${JSON.stringify(result === null || result === void 0 ? void 0 : result.files)}`);
                    exists = true;
                }
                catch (error) {
                    console.log(`${lc} Did not exist`);
                }
                if (!exists) {
                    console.log(`${lc} creating...`);
                    try {
                        const result = yield Filesystem.mkdir({ path, directory });
                    }
                    catch (error) {
                        console.log(`${lc} Error creating.`);
                    }
                    finally {
                        console.log(`${lc} complete.`);
                    }
                }
            });
            const paths = [
                _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"],
                _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"] + '/' + _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_IBGIBS_SUBPATH"],
                _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"] + '/' + _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_META_SUBPATH"],
                _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"] + '/' + _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BIN_SUBPATH"],
                _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_SUBPATH"] + '/' + _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_DNA_SUBPATH"],
            ];
            for (let path of paths) {
                yield ensure(path);
            }
        });
    }
    delete({ addr, binHash, binExt, isMeta, isDna, getRawResult: getRaw }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.get.name}]`;
            if (!addr && !binHash) {
                throw new Error(`${lc} addr or binHash required.`);
            }
            ;
            const isBin = !addr;
            const result = {};
            try {
                let path = "";
                let filename = "";
                if (addr) {
                    filename = this.getFilename({ addr });
                    path = this.buildPath({ filename, isMeta, isDna });
                }
                else {
                    filename = binExt ? binHash + '.' + binExt : binHash;
                    path = this.buildPath({ filename, isMeta: false, isDna: false, isBin: true });
                }
                console.log(`${lc} path: ${path}, directory: ${_common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_DIR"]}`);
                const resDelete = yield Filesystem.deleteFile({
                    path,
                    directory: _common_constants__WEBPACK_IMPORTED_MODULE_4__["IBGIB_BASE_DIR"],
                });
                console.log(`${lc} deleted`);
                if (getRaw) {
                    result.raw = resDelete;
                }
                result.success = true;
            }
            catch (error) {
                const errorMsg = `${lc} ${error.message}`;
                console.error(errorMsg);
                result.errorMsg = errorMsg;
            }
            return result;
        });
    }
}
FilesService.ɵfac = function FilesService_Factory(t) { return new (t || FilesService)(_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵinject"](_angular_common_http__WEBPACK_IMPORTED_MODULE_5__["HttpClient"]), _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵinject"](_angular_platform_browser__WEBPACK_IMPORTED_MODULE_6__["DomSanitizer"])); };
FilesService.ɵprov = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjectable"]({ token: FilesService, factory: FilesService.ɵfac, providedIn: 'root' });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](FilesService, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"],
        args: [{
                providedIn: 'root'
            }]
    }], function () { return [{ type: _angular_common_http__WEBPACK_IMPORTED_MODULE_5__["HttpClient"] }, { type: _angular_platform_browser__WEBPACK_IMPORTED_MODULE_6__["DomSanitizer"] }]; }, null); })();


/***/ }),

/***/ "e4ts":
/*!**************************************************!*\
  !*** ./src/app/services/ng-ibgib-nav.service.ts ***!
  \**************************************************/
/*! exports provided: NgIbgibNavService */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "NgIbgibNavService", function() { return NgIbgibNavService; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "mrSG");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @angular/router */ "tyNb");




class NgIbgibNavService {
    constructor(router) {
        this.router = router;
        this.lc = `[${NgIbgibNavService.name}]`;
    }
    navTo({ addr }) {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.navTo.name}(${addr || 'undefined|null'})]`;
            console.log(`${lc} called`);
            try {
                yield this.router.navigate(['ibgib', addr], {
                    queryParamsHandling: 'preserve',
                });
            }
            catch (error) {
                console.error(`${lc} ${error.message}`);
            }
        });
    }
}
NgIbgibNavService.ɵfac = function NgIbgibNavService_Factory(t) { return new (t || NgIbgibNavService)(_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵinject"](_angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"])); };
NgIbgibNavService.ɵprov = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineInjectable"]({ token: NgIbgibNavService, factory: NgIbgibNavService.ɵfac });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](NgIbgibNavService, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Injectable"]
    }], function () { return [{ type: _angular_router__WEBPACK_IMPORTED_MODULE_2__["Router"] }]; }, null); })();


/***/ }),

/***/ "qK2e":
/*!*****************************************!*\
  !*** ./src/app/sidebar/sidebar.page.ts ***!
  \*****************************************/
/*! exports provided: SidebarPage */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SidebarPage", function() { return SidebarPage; });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "mrSG");
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _common_bases_ibgib_component_base__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../common/bases/ibgib-component-base */ "ZcOJ");
/* harmony import */ var _common_constants__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../common/constants */ "XY7g");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ts-gib/dist/helper */ "RXni");
/* harmony import */ var ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _capacitor_core__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @capacitor/core */ "gcOT");
/* harmony import */ var _services_common_service__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../services/common.service */ "OlR4");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! @angular/router */ "tyNb");
/* harmony import */ var _common_action_bar_action_bar_component__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../common/action-bar/action-bar.component */ "T0Ce");










const { Filesystem } = _capacitor_core__WEBPACK_IMPORTED_MODULE_5__["Plugins"];
class SidebarPage extends _common_bases_ibgib_component_base__WEBPACK_IMPORTED_MODULE_2__["IbgibComponentBase"] {
    constructor(common, ref, activatedRoute) {
        super(common, ref);
        this.common = common;
        this.ref = ref;
        this.activatedRoute = activatedRoute;
        this.lc = `[${SidebarPage.name}]`;
    }
    ngOnInit() {
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            // this.folder = this.activatedRoute.snapshot.paramMap.get('addr');
            console.log('yo');
            this.subscribeParamMap();
        });
    }
    ngOnDestroy() {
        this.unsubscribeParamMap();
    }
    updateIbGib(addr) {
        const _super = Object.create(null, {
            updateIbGib: { get: () => super.updateIbGib }
        });
        return Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
            console.log(`${lc} updating...`);
            try {
                yield _super.updateIbGib.call(this, addr);
                yield this.loadIbGib();
                console.log(`${lc} ibGib: ${Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__["pretty"])(this.ibGib)}`);
                yield this.loadItem();
            }
            catch (error) {
                console.error(`${lc} error: ${error.message}`);
                this.clearItem();
            }
            finally {
                this.ref.detectChanges();
                console.log(`${lc} updated.`);
            }
        });
    }
    subscribeParamMap() {
        let lc = `${this.lc}[${this.subscribeParamMap.name}]`;
        this.activatedRoute.paramMap.subscribe((map) => Object(tslib__WEBPACK_IMPORTED_MODULE_0__["__awaiter"])(this, void 0, void 0, function* () {
            let addr = map.get('addr');
            lc = `${lc}[${addr}]`;
            console.log(`${lc} new addr`);
            if (!_common_constants__WEBPACK_IMPORTED_MODULE_3__["SPECIAL_URLS"].includes((addr || "").toLowerCase()) && encodeURI(addr).includes('%5E')) {
                // normal handling for a normal ibGib is to update the page's ibgib
                // and load everything.
                console.log(`new paramMap. addr: ${addr}`);
                if (addr !== this.addr) {
                    this.updateIbGib(addr);
                }
                else {
                    // do nothing, it's the same as the current addr
                }
                // } else if (addr === 'something') { // example for future special cases
            }
            else {
                // default special non-ibgib handler, go to the tags ibGib
                console.log(`${lc} special url entered, navTo to tags ibGib`);
                const tags = yield this.common.ibgibs.getTagsIbgib({ initialize: true });
                addr = Object(ts_gib_dist_helper__WEBPACK_IMPORTED_MODULE_4__["getIbGibAddr"])({ ibGib: tags });
                yield this.navTo({ addr });
            }
        }));
    }
    unsubscribeParamMap() {
        if (this.paramMapSub) {
            this.paramMapSub.unsubscribe();
            delete this.paramMapSub;
        }
    }
}
SidebarPage.ɵfac = function SidebarPage_Factory(t) { return new (t || SidebarPage)(_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdirectiveInject"](_services_common_service__WEBPACK_IMPORTED_MODULE_6__["CommonService"]), _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdirectiveInject"](_angular_core__WEBPACK_IMPORTED_MODULE_1__["ChangeDetectorRef"]), _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdirectiveInject"](_angular_router__WEBPACK_IMPORTED_MODULE_7__["ActivatedRoute"])); };
SidebarPage.ɵcmp = _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵdefineComponent"]({ type: SidebarPage, selectors: [["ibgib-sidebar"]], features: [_angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵInheritDefinitionFeature"]], decls: 5, vars: 2, consts: [[3, "addr"]], template: function SidebarPage_Template(rf, ctx) { if (rf & 1) {
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](0, "p");
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](1, "this is sidebar");
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementStart"](2, "p");
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtext"](3);
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelementEnd"]();
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵelement"](4, "action-bar", 0);
    } if (rf & 2) {
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](3);
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵtextInterpolate1"]("addr: ", ctx.addr || "falsy", "");
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵadvance"](1);
        _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵɵproperty"]("addr", ctx.addr);
    } }, directives: [_common_action_bar_action_bar_component__WEBPACK_IMPORTED_MODULE_8__["ActionBarComponent"]], styles: ["\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IiIsImZpbGUiOiJzaWRlYmFyLnBhZ2Uuc2NzcyJ9 */"], changeDetection: 0 });
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_1__["ɵsetClassMetadata"](SidebarPage, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["Component"],
        args: [{
                selector: 'ibgib-sidebar',
                templateUrl: './sidebar.page.html',
                styleUrls: ['./sidebar.page.scss'],
                changeDetection: _angular_core__WEBPACK_IMPORTED_MODULE_1__["ChangeDetectionStrategy"].OnPush,
            }]
    }], function () { return [{ type: _services_common_service__WEBPACK_IMPORTED_MODULE_6__["CommonService"] }, { type: _angular_core__WEBPACK_IMPORTED_MODULE_1__["ChangeDetectorRef"] }, { type: _angular_router__WEBPACK_IMPORTED_MODULE_7__["ActivatedRoute"] }]; }, null); })();


/***/ }),

/***/ "vY5A":
/*!***************************************!*\
  !*** ./src/app/app-routing.module.ts ***!
  \***************************************/
/*! exports provided: AppRoutingModule */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "AppRoutingModule", function() { return AppRoutingModule; });
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _angular_router__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @angular/router */ "tyNb");
/* harmony import */ var _page_selector_guard__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./page-selector.guard */ "Y1z+");
/* harmony import */ var _sidebar_sidebar_page__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./sidebar/sidebar.page */ "qK2e");






const routes = [
    // {
    //   path: '',
    //   component: BrowserActionPage,
    //   pathMatch: "full",
    // },
    // {
    //   path: 'browser-action',
    //   component: BrowserActionPage,
    // },
    {
        path: 'sidebar',
        redirectTo: 'ibgib/ib^gib',
    },
    {
        path: '',
        redirectTo: 'ibgib/ib^gib',
        pathMatch: 'full'
    },
    {
        path: 'ibgib/:addr',
        component: _sidebar_sidebar_page__WEBPACK_IMPORTED_MODULE_3__["SidebarPage"],
    },
    {
        path: '**',
        component: _sidebar_sidebar_page__WEBPACK_IMPORTED_MODULE_3__["SidebarPage"],
        canActivate: [_page_selector_guard__WEBPACK_IMPORTED_MODULE_2__["PageSelectorGuard"]],
    }
];
class AppRoutingModule {
}
AppRoutingModule.ɵmod = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineNgModule"]({ type: AppRoutingModule });
AppRoutingModule.ɵinj = _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵdefineInjector"]({ factory: function AppRoutingModule_Factory(t) { return new (t || AppRoutingModule)(); }, imports: [[_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"].forRoot(routes)], _angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]] });
(function () { (typeof ngJitMode === "undefined" || ngJitMode) && _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵɵsetNgModuleScope"](AppRoutingModule, { imports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]], exports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]] }); })();
/*@__PURE__*/ (function () { _angular_core__WEBPACK_IMPORTED_MODULE_0__["ɵsetClassMetadata"](AppRoutingModule, [{
        type: _angular_core__WEBPACK_IMPORTED_MODULE_0__["NgModule"],
        args: [{
                imports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"].forRoot(routes)],
                exports: [_angular_router__WEBPACK_IMPORTED_MODULE_1__["RouterModule"]]
            }]
    }], null, null); })();


/***/ }),

/***/ "zUnb":
/*!*********************!*\
  !*** ./src/main.ts ***!
  \*********************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _angular_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @angular/core */ "fXoL");
/* harmony import */ var _environments_environment__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./environments/environment */ "AytR");
/* harmony import */ var _app_app_module__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./app/app.module */ "ZAI4");
/* harmony import */ var _angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @angular/platform-browser */ "jhN1");




console.log(`main.ts executed.`);
if (_environments_environment__WEBPACK_IMPORTED_MODULE_1__["environment"].production) {
    Object(_angular_core__WEBPACK_IMPORTED_MODULE_0__["enableProdMode"])();
}
_angular_platform_browser__WEBPACK_IMPORTED_MODULE_3__["platformBrowser"]().bootstrapModule(_app_app_module__WEBPACK_IMPORTED_MODULE_2__["AppModule"])
    .catch(err => console.error(err));


/***/ }),

/***/ "zn8P":
/*!******************************************************!*\
  !*** ./$$_lazy_route_resource lazy namespace object ***!
  \******************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function webpackEmptyAsyncContext(req) {
	// Here Promise.resolve().then() is used instead of new Promise() to prevent
	// uncaught exception popping up in devtools
	return Promise.resolve().then(function() {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	});
}
webpackEmptyAsyncContext.keys = function() { return []; };
webpackEmptyAsyncContext.resolve = webpackEmptyAsyncContext;
module.exports = webpackEmptyAsyncContext;
webpackEmptyAsyncContext.id = "zn8P";

/***/ })

},[[0,"runtime","vendor"]]]);
//# sourceMappingURL=main.js.map