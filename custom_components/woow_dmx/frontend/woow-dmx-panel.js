/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=globalThis,e=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),s=new WeakMap;let o=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const r=this.t;if(e&&void 0===t){const e=void 0!==r&&1===r.length;e&&(t=s.get(r)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&s.set(r,t))}return t}toString(){return this.cssText}};const i=e?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const r of t.cssRules)e+=r.cssText;return(t=>new o("string"==typeof t?t:t+"",void 0,r))(e)})(t):t,{is:a,defineProperty:n,getOwnPropertyDescriptor:l,getOwnPropertyNames:d,getOwnPropertySymbols:c,getPrototypeOf:p}=Object,h=globalThis,u=h.trustedTypes,_=u?u.emptyScript:"",g=h.reactiveElementPolyfillSupport,f=(t,e)=>t,m={toAttribute(t,e){switch(e){case Boolean:t=t?_:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let r=t;switch(e){case Boolean:r=null!==t;break;case Number:r=null===t?null:Number(t);break;case Object:case Array:try{r=JSON.parse(t)}catch(t){r=null}}return r}},b=(t,e)=>!a(t,e),v={attribute:!0,type:String,converter:m,reflect:!1,useDefault:!1,hasChanged:b};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),h.litPropertyMetadata??=new WeakMap;let y=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=v){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const r=Symbol(),s=this.getPropertyDescriptor(t,r,e);void 0!==s&&n(this.prototype,t,s)}}static getPropertyDescriptor(t,e,r){const{get:s,set:o}=l(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const i=s?.call(this);o?.call(this,e),this.requestUpdate(t,i,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??v}static _$Ei(){if(this.hasOwnProperty(f("elementProperties")))return;const t=p(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(f("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(f("properties"))){const t=this.properties,e=[...d(t),...c(t)];for(const r of e)this.createProperty(r,t[r])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,r]of e)this.elementProperties.set(t,r)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const r=this._$Eu(t,e);void 0!==r&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const r=new Set(t.flat(1/0).reverse());for(const t of r)e.unshift(i(t))}else void 0!==t&&e.push(i(t));return e}static _$Eu(t,e){const r=e.attribute;return!1===r?void 0:"string"==typeof r?r:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const r of e.keys())this.hasOwnProperty(r)&&(t.set(r,this[r]),delete this[r]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const r=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((r,s)=>{if(e)r.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of s){const s=document.createElement("style"),o=t.litNonce;void 0!==o&&s.setAttribute("nonce",o),s.textContent=e.cssText,r.appendChild(s)}})(r,this.constructor.elementStyles),r}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,r){this._$AK(t,r)}_$ET(t,e){const r=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,r);if(void 0!==s&&!0===r.reflect){const o=(void 0!==r.converter?.toAttribute?r.converter:m).toAttribute(e,r.type);this._$Em=t,null==o?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(t,e){const r=this.constructor,s=r._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=r.getPropertyOptions(s),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:m;this._$Em=s;const i=o.fromAttribute(e,t.type);this[s]=i??this._$Ej?.get(s)??i,this._$Em=null}}requestUpdate(t,e,r,s=!1,o){if(void 0!==t){const i=this.constructor;if(!1===s&&(o=this[t]),r??=i.getPropertyOptions(t),!((r.hasChanged??b)(o,e)||r.useDefault&&r.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(i._$Eu(t,r))))return;this.C(t,e,r)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:r,reflect:s,wrapped:o},i){r&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,i??e??this[t]),!0!==o||void 0!==i)||(this._$AL.has(t)||(this.hasUpdated||r||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,r]of t){const{wrapped:t}=r,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,r,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[f("elementProperties")]=new Map,y[f("finalized")]=new Map,g?.({ReactiveElement:y}),(h.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x=globalThis,w=t=>t,$=x.trustedTypes,A=$?$.createPolicy("lit-html",{createHTML:t=>t}):void 0,S="$lit$",C=`lit$${Math.random().toFixed(9).slice(2)}$`,E="?"+C,k=`<${E}>`,M=document,D=()=>M.createComment(""),F=t=>null===t||"object"!=typeof t&&"function"!=typeof t,z=Array.isArray,H="[ \t\n\f\r]",N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,L=/-->/g,I=/>/g,P=RegExp(`>|${H}(?:([^\\s"'>=/]+)(${H}*=${H}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),U=/'/g,R=/"/g,T=/^(?:script|style|textarea|title)$/i,B=(t=>(e,...r)=>({_$litType$:t,strings:e,values:r}))(1),O=Symbol.for("lit-noChange"),Y=Symbol.for("lit-nothing"),X=new WeakMap,W=M.createTreeWalker(M,129);function K(t,e){if(!z(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==A?A.createHTML(e):e}const j=(t,e)=>{const r=t.length-1,s=[];let o,i=2===e?"<svg>":3===e?"<math>":"",a=N;for(let e=0;e<r;e++){const r=t[e];let n,l,d=-1,c=0;for(;c<r.length&&(a.lastIndex=c,l=a.exec(r),null!==l);)c=a.lastIndex,a===N?"!--"===l[1]?a=L:void 0!==l[1]?a=I:void 0!==l[2]?(T.test(l[2])&&(o=RegExp("</"+l[2],"g")),a=P):void 0!==l[3]&&(a=P):a===P?">"===l[0]?(a=o??N,d=-1):void 0===l[1]?d=-2:(d=a.lastIndex-l[2].length,n=l[1],a=void 0===l[3]?P:'"'===l[3]?R:U):a===R||a===U?a=P:a===L||a===I?a=N:(a=P,o=void 0);const p=a===P&&t[e+1].startsWith("/>")?" ":"";i+=a===N?r+k:d>=0?(s.push(n),r.slice(0,d)+S+r.slice(d)+C+p):r+C+(-2===d?e:p)}return[K(t,i+(t[r]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]};class G{constructor({strings:t,_$litType$:e},r){let s;this.parts=[];let o=0,i=0;const a=t.length-1,n=this.parts,[l,d]=j(t,e);if(this.el=G.createElement(l,r),W.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=W.nextNode())&&n.length<a;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(S)){const e=d[i++],r=s.getAttribute(t).split(C),a=/([.?@])?(.*)/.exec(e);n.push({type:1,index:o,name:a[2],strings:r,ctor:"."===a[1]?Q:"?"===a[1]?tt:"@"===a[1]?et:Z}),s.removeAttribute(t)}else t.startsWith(C)&&(n.push({type:6,index:o}),s.removeAttribute(t));if(T.test(s.tagName)){const t=s.textContent.split(C),e=t.length-1;if(e>0){s.textContent=$?$.emptyScript:"";for(let r=0;r<e;r++)s.append(t[r],D()),W.nextNode(),n.push({type:2,index:++o});s.append(t[e],D())}}}else if(8===s.nodeType)if(s.data===E)n.push({type:2,index:o});else{let t=-1;for(;-1!==(t=s.data.indexOf(C,t+1));)n.push({type:7,index:o}),t+=C.length-1}o++}}static createElement(t,e){const r=M.createElement("template");return r.innerHTML=t,r}}function q(t,e,r=t,s){if(e===O)return e;let o=void 0!==s?r._$Co?.[s]:r._$Cl;const i=F(e)?void 0:e._$litDirective$;return o?.constructor!==i&&(o?._$AO?.(!1),void 0===i?o=void 0:(o=new i(t),o._$AT(t,r,s)),void 0!==s?(r._$Co??=[])[s]=o:r._$Cl=o),void 0!==o&&(e=q(t,o._$AS(t,e.values),o,s)),e}class V{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:r}=this._$AD,s=(t?.creationScope??M).importNode(e,!0);W.currentNode=s;let o=W.nextNode(),i=0,a=0,n=r[0];for(;void 0!==n;){if(i===n.index){let e;2===n.type?e=new J(o,o.nextSibling,this,t):1===n.type?e=new n.ctor(o,n.name,n.strings,this,t):6===n.type&&(e=new rt(o,this,t)),this._$AV.push(e),n=r[++a]}i!==n?.index&&(o=W.nextNode(),i++)}return W.currentNode=M,s}p(t){let e=0;for(const r of this._$AV)void 0!==r&&(void 0!==r.strings?(r._$AI(t,r,e),e+=r.strings.length-2):r._$AI(t[e])),e++}}class J{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,r,s){this.type=2,this._$AH=Y,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=r,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=q(this,t,e),F(t)?t===Y||null==t||""===t?(this._$AH!==Y&&this._$AR(),this._$AH=Y):t!==this._$AH&&t!==O&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>z(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==Y&&F(this._$AH)?this._$AA.nextSibling.data=t:this.T(M.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:r}=t,s="number"==typeof r?this._$AC(t):(void 0===r.el&&(r.el=G.createElement(K(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new V(s,this),r=t.u(this.options);t.p(e),this.T(r),this._$AH=t}}_$AC(t){let e=X.get(t.strings);return void 0===e&&X.set(t.strings,e=new G(t)),e}k(t){z(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let r,s=0;for(const o of t)s===e.length?e.push(r=new J(this.O(D()),this.O(D()),this,this.options)):r=e[s],r._$AI(o),s++;s<e.length&&(this._$AR(r&&r._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=w(t).nextSibling;w(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class Z{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,r,s,o){this.type=1,this._$AH=Y,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=o,r.length>2||""!==r[0]||""!==r[1]?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=Y}_$AI(t,e=this,r,s){const o=this.strings;let i=!1;if(void 0===o)t=q(this,t,e,0),i=!F(t)||t!==this._$AH&&t!==O,i&&(this._$AH=t);else{const s=t;let a,n;for(t=o[0],a=0;a<o.length-1;a++)n=q(this,s[r+a],e,a),n===O&&(n=this._$AH[a]),i||=!F(n)||n!==this._$AH[a],n===Y?t=Y:t!==Y&&(t+=(n??"")+o[a+1]),this._$AH[a]=n}i&&!s&&this.j(t)}j(t){t===Y?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Q extends Z{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===Y?void 0:t}}class tt extends Z{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==Y)}}class et extends Z{constructor(t,e,r,s,o){super(t,e,r,s,o),this.type=5}_$AI(t,e=this){if((t=q(this,t,e,0)??Y)===O)return;const r=this._$AH,s=t===Y&&r!==Y||t.capture!==r.capture||t.once!==r.once||t.passive!==r.passive,o=t!==Y&&(r===Y||s);s&&this.element.removeEventListener(this.name,this,r),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,r){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(t){q(this,t)}}const st=x.litHtmlPolyfillSupport;st?.(G,J),(x.litHtmlVersions??=[]).push("3.3.2");const ot=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let it=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,r)=>{const s=r?.renderBefore??e;let o=s._$litPart$;if(void 0===o){const t=r?.renderBefore??null;s._$litPart$=o=new J(e.insertBefore(D(),t),t,void 0,r??{})}return o._$AI(t),o})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return O}};it._$litElement$=!0,it.finalized=!0,ot.litElementHydrateSupport?.({LitElement:it});const at=ot.litElementPolyfillSupport;at?.({LitElement:it}),(ot.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const nt=2;class lt{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,r){this._$Ct=t,this._$AM=e,this._$Ci=r}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class dt extends lt{constructor(t){if(super(t),this.it=Y,t.type!==nt)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===Y||null==t)return this._t=void 0,this.it=t;if(t===O)return t;if("string"!=typeof t)throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const e=[t];return e.raw=e,this._t={_$litType$:this.constructor.resultType,strings:e,values:[]}}}dt.directiveName="unsafeHTML",dt.resultType=1;const ct=(t=>(...e)=>({_$litDirective$:t,values:e}))(dt),pt=((t,...e)=>{const s=1===t.length?t[0]:e.reduce((e,r,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+t[s+1],t[0]);return new o(s,t,r)})`
  /* ============================================
     HA Theme Variable Mapping
     ============================================ */
  :host {
    /* Background colors */
    --bg-base: var(--primary-background-color, #0F1114);
    --bg-surface: var(--card-background-color, #181B20);
    --bg-elevated: var(--secondary-background-color, #1F2329);
    --bg-input: var(--input-fill-color, var(--secondary-background-color, #14171B));

    /* Border colors */
    --border-subtle: var(--divider-color, rgba(255,255,255,0.06));
    --border-default: var(--divider-color, rgba(255,255,255,0.10));
    --border-strong: rgba(255,255,255,0.16);

    /* Text colors */
    --text-primary: var(--primary-text-color, #E8EAED);
    --text-secondary: var(--secondary-text-color, #9AA0A6);
    --text-muted: var(--disabled-text-color, #5F6368);
    --text-inverse: var(--text-primary-color, #FFFFFF);

    /* Status colors */
    --status-success: var(--success-color, #34A853);
    --status-warning: var(--warning-color, #FBBC04);
    --status-danger: var(--error-color, #EA4335);
    --status-info: var(--info-color, #4285F4);

    /* Protocol / accent colors */
    --protocol-primary: var(--accent-color, var(--primary-color, #009ac7));
    --protocol-primary-dark: var(--primary-color, #0288d1);
    --protocol-glow: color-mix(in srgb, var(--accent-color, var(--primary-color, #009ac7)) 15%, transparent);
    --protocol-glow-strong: color-mix(in srgb, var(--accent-color, var(--primary-color, #009ac7)) 25%, transparent);
    --protocol-gradient: linear-gradient(135deg, var(--primary-color, #009ac7), var(--accent-color, var(--primary-color, #0288d1)));

    /* Typography */
    --font-display: var(--ha-font-family, 'Roboto', system-ui, sans-serif);
    --font-mono: 'JetBrains Mono', 'Fira Code', var(--ha-font-family-code, monospace);

    /* Spacing */
    --space-xs: 4px;
    --space-sm: 8px;
    --space-md: 16px;
    --space-lg: 24px;
    --space-xl: 40px;
    --space-2xl: 64px;

    /* Radii */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;

    /* Shadows */
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3);

    /* Host base styles (replaces html/body) */
    display: block;
    font-family: var(--font-display);
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--bg-base);
    color: var(--text-primary);
    line-height: 1.6;
  }

  /* ============================================
     Reset
     ============================================ */
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* ============================================
     Base Elements
     ============================================ */
  a {
    color: var(--protocol-primary);
    text-decoration: none;
    transition: color 0.2s ease;
  }
  a:hover {
    color: var(--protocol-primary-dark);
  }
  code {
    font-family: var(--font-mono);
    font-size: 13px;
    background: var(--bg-input);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
  }

  /* ============================================
     Layout Container
     ============================================ */
  .panel-container {
    max-width: 920px;
    margin: 0 auto;
    padding: 0 var(--space-lg);
    padding-bottom: var(--space-2xl);
  }

  /* ============================================
     Top Bar
     ============================================ */
  .top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-lg);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .protocol-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    background: var(--protocol-glow);
    border: 1px solid var(--protocol-primary);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--protocol-primary);
  }
  .protocol-pill .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--protocol-primary);
    flex-shrink: 0;
  }
  .top-bar-brand {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }
  .top-bar-brand span {
    color: var(--text-secondary);
    font-weight: 600;
  }

  /* ============================================
     Hero Section
     ============================================ */
  .hero {
    position: relative;
    background: var(--protocol-gradient);
    padding: var(--space-2xl) var(--space-xl);
    text-align: center;
    overflow: hidden;
    margin-bottom: var(--space-xl);
  }
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px),
      repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.04) 39px, rgba(255,255,255,0.04) 40px);
    animation: gridShift 30s linear infinite;
    pointer-events: none;
  }
  @keyframes gridShift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(40px, 40px); }
  }
  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 120%, rgba(0,0,0,0.3) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-content {
    position: relative;
    z-index: 1;
  }
  .hero-icon {
    font-size: 48px;
    margin-bottom: var(--space-md);
    display: block;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
  }
  .hero h1 {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 700;
    color: #FFFFFF;
    margin-bottom: var(--space-sm);
    letter-spacing: -0.01em;
  }
  .hero p {
    font-size: 15px;
    color: rgba(255,255,255,0.85);
    max-width: 520px;
    margin: 0 auto;
    line-height: 1.7;
  }

  /* ============================================
     Step Cards with Connecting Line
     ============================================ */
  .steps-container {
    position: relative;
    padding-left: 44px;
    margin-bottom: var(--space-xl);
  }
  .steps-container::before {
    content: '';
    position: absolute;
    left: 17px;
    top: 20px;
    bottom: 20px;
    width: 2px;
    background: linear-gradient(to bottom, var(--protocol-primary), var(--protocol-primary-dark), var(--border-default));
    border-radius: 1px;
  }
  .step-card {
    position: relative;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-left: 2px solid var(--protocol-primary);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    margin-bottom: var(--space-md);
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .step-card:hover {
    transform: scale(1.005);
    box-shadow: var(--shadow-md);
  }
  .step-number {
    position: absolute;
    left: -44px;
    top: var(--space-lg);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--protocol-primary);
    color: #FFFFFF;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 4px var(--bg-base), 0 0 0 5px var(--protocol-primary);
    z-index: 1;
  }
  .step-card h2 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .step-card h2 .icon {
    font-size: 22px;
    flex-shrink: 0;
  }
  .step-card p {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
    margin-bottom: var(--space-sm);
  }
  .step-card ul, .step-card ol {
    padding-left: 20px;
    margin-top: var(--space-sm);
  }
  .step-card li {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
    margin-bottom: var(--space-xs);
  }
  .step-card li strong {
    color: var(--text-primary);
  }

  /* ============================================
     Buttons
     ============================================ */
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
    text-align: center;
    line-height: 1;
  }
  .btn-filled {
    background: var(--protocol-primary);
    color: #FFFFFF;
  }
  .btn-filled:hover {
    background: var(--protocol-primary-dark);
    color: #FFFFFF;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-ghost {
    background: transparent;
    color: var(--protocol-primary);
    border: 1px solid var(--protocol-primary);
  }
  .btn-ghost:hover {
    background: var(--protocol-glow);
    color: var(--protocol-primary);
    transform: translateY(-1px);
  }
  .btn-danger {
    background: var(--status-danger);
    color: #FFFFFF;
    padding: 12px 28px;
    font-weight: 700;
  }
  .btn-danger:hover {
    background: #C62828;
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  .btn-danger:disabled, .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .btn-group {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    margin-top: var(--space-md);
  }
  .btn-arrow::after {
    content: '\u2192';
    font-size: 14px;
  }

  /* ============================================
     Sub-steps
     ============================================ */
  .sub-steps {
    margin-top: var(--space-md);
  }
  .sub-step {
    display: flex;
    gap: 12px;
    margin-bottom: var(--space-md);
    align-items: flex-start;
  }
  .sub-step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--protocol-glow-strong);
    color: var(--protocol-primary);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .sub-step-content {
    flex: 1;
  }
  .sub-step-content strong {
    display: block;
    font-size: 14px;
    color: var(--text-primary);
    margin-bottom: 2px;
    font-weight: 600;
  }
  .sub-step-content span, .sub-step-content p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.7;
  }

  /* ============================================
     Warning / Info Boxes (Callouts)
     ============================================ */
  .callout {
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    margin: var(--space-md) 0;
    border: 1px solid;
  }
  .callout-warning {
    background: rgba(251, 188, 4, 0.08);
    border-color: rgba(251, 188, 4, 0.3);
  }
  .callout-danger {
    background: rgba(234, 67, 53, 0.08);
    border-color: rgba(234, 67, 53, 0.3);
  }
  .callout-info {
    background: var(--protocol-glow);
    border-color: rgba(27, 143, 191, 0.3);
  }
  .callout-success {
    background: rgba(52, 168, 83, 0.08);
    border-color: rgba(52, 168, 83, 0.3);
  }
  .callout-title {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: var(--space-xs);
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-primary);
  }
  .callout p {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.7;
  }
  .callout ul {
    padding-left: 18px;
    margin-top: var(--space-sm);
  }
  .callout li {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: var(--space-xs);
  }

  /* ============================================
     Code Block
     ============================================ */
  .code-block {
    background: var(--bg-input);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    margin: var(--space-md) 0;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.7;
    overflow-x: auto;
    color: var(--text-primary);
    white-space: pre;
  }

  /* ============================================
     YAML Editor Section
     ============================================ */
  .editor-section {
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-xl);
    box-shadow: var(--shadow-md);
    overflow: hidden;
    position: relative;
  }
  .editor-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 60px;
    background: var(--protocol-primary);
    border-radius: 0 0 4px 0;
    z-index: 2;
  }
  .editor-header {
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-default);
    padding: 14px var(--space-lg);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .editor-header-title {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .ws-badge {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .ws-badge.connected {
    background: rgba(52, 168, 83, 0.15);
    color: var(--status-success);
    border: 1px solid rgba(52, 168, 83, 0.3);
  }
  .ws-badge.disconnected {
    background: rgba(234, 67, 53, 0.15);
    color: var(--status-danger);
    border: 1px solid rgba(234, 67, 53, 0.3);
  }
  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
    flex-wrap: wrap;
  }
  .editor-toolbar select {
    flex: 1;
    min-width: 160px;
    padding: 7px 10px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-input);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 12px;
    outline: none;
    transition: border-color 0.2s ease;
  }
  .editor-toolbar select:focus {
    border-color: var(--protocol-primary);
  }
  .editor-toolbar button {
    padding: 7px 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }
  .editor-toolbar button:hover {
    border-color: var(--protocol-primary);
    color: var(--protocol-primary);
    background: var(--protocol-glow);
  }
  .editor-textarea {
    display: block;
    width: 100%;
    min-height: 400px;
    padding: var(--space-md);
    background: var(--bg-input);
    color: var(--text-primary);
    border: none;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1.7;
    resize: vertical;
    outline: none;
    tab-size: 2;
  }
  .editor-textarea::placeholder {
    color: var(--text-muted);
  }
  .editor-textarea:focus {
    box-shadow: inset 0 0 0 2px var(--protocol-glow-strong);
  }
  .editor-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
    flex-wrap: wrap;
    gap: var(--space-sm);
  }
  .editor-status {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-muted);
    flex: 1;
    min-width: 100px;
  }
  .editor-footer-buttons {
    display: flex;
    gap: var(--space-sm);
  }
  .btn-editor {
    padding: 8px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-default);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-editor:hover {
    border-color: var(--protocol-primary);
    color: var(--protocol-primary);
    background: var(--protocol-glow);
  }
  .btn-save {
    padding: 8px 20px;
    border-radius: var(--radius-sm);
    border: none;
    background: var(--status-success);
    color: #FFFFFF;
    font-family: var(--font-display);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
  }
  .btn-save:hover {
    background: #2E7D32;
    transform: translateY(-1px);
  }
  .btn-save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  /* ============================================
     Restart HA Section / Card
     ============================================ */
  .card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-left: 2px solid var(--protocol-primary);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
    margin-bottom: var(--space-lg);
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .card:hover {
    transform: scale(1.005);
    box-shadow: var(--shadow-md);
  }
  .card h2 {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  .card p {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1.8;
  }
  .restart-section {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-wrap: wrap;
    margin-top: var(--space-md);
  }
  .checkbox-confirm {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    user-select: none;
  }
  .checkbox-confirm input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--protocol-primary);
  }
  .restart-status {
    margin-top: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    min-height: 20px;
    color: var(--text-secondary);
  }

  /* ============================================
     Footer
     ============================================ */
  .panel-footer {
    text-align: center;
    padding: var(--space-xl) 0 var(--space-lg);
    border-top: 1px solid var(--border-subtle);
    margin-top: var(--space-xl);
  }
  .panel-footer p {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0.04em;
  }
  .panel-footer a {
    color: var(--protocol-primary);
    font-weight: 600;
  }

  /* ============================================
     Section Divider
     ============================================ */
  .section-divider {
    border: none;
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-xl) 0;
  }

  /* ============================================
     Responsive
     ============================================ */
  @media (max-width: 640px) {
    .panel-container { padding: 0 var(--space-md); }
    .hero { padding: var(--space-xl) var(--space-md); }
    .hero h1 { font-size: 24px; }
    .hero p { font-size: 13px; }
    .steps-container { padding-left: 36px; }
    .steps-container::before { left: 13px; }
    .step-number { left: -36px; width: 28px; height: 28px; font-size: 12px; }
    .step-card, .card { padding: var(--space-md); }
    .editor-textarea { min-height: 300px; font-size: 12px; }
    .top-bar { padding: var(--space-sm) var(--space-md); }
  }
`;class ht extends it{static get properties(){return{hass:{type:Object},panel:{type:Object},narrow:{type:Boolean},route:{type:Object},_files:{type:Array,state:!0},_currentFile:{type:String,state:!0},_editorContent:{type:String,state:!0},_editorDirty:{type:Boolean,state:!0},_fontSize:{type:Number,state:!0},_wsConnected:{type:Boolean,state:!0},_restartConfirmed:{type:Boolean,state:!0},_restartStatus:{type:String,state:!0},_restartStatusColor:{type:String,state:!0},_editorStatus:{type:String,state:!0},_editorStatusColor:{type:String,state:!0}}}static get styles(){return pt}constructor(){super(),this._files=[],this._currentFile="",this._editorContent="",this._editorDirty=!1,this._fontSize=14,this._wsConnected=!1,this._restartConfirmed=!1,this._restartStatus="",this._restartStatusColor="",this._editorStatus="",this._editorStatusColor="",this._originalContent="",this._hassReady=!1;const t={en:{editor_title:"✏️ YAML Configuration Editor",editor_select_placeholder:"-- Select File --",editor_refresh:"🔄 Refresh",editor_refresh_title:"Refresh file list",editor_font_smaller:"Decrease font size",editor_font_larger:"Increase font size",editor_ready:"Ready",editor_new_file:"+ New File",editor_save:"💾 Save",ws_connected:"● Connected",ws_disconnected:"● Disconnected",ws_not_connected:"WebSocket not connected",loading_files:"Loading file list...",found_files:"Found {0} YAML files",load_failed:"Failed to load file list: {0}",loading_file:"Loading {0}...",loaded_file:"Loaded: {0}",file_load_failed:"Load failed: {0}",select_or_new:"Please select or create a file first",confirm_save:"Are you sure you want to save {0}?",saving_file:"Saving {0}...",saved_file:"✓ Saved: {0}",save_failed:"Save failed: {0}",new_file_status:"New file: {0} (not saved yet)",unsaved_switch:"Current changes are not saved. Switch file anyway?",cache_restored:"Restored unsaved edits",cache_restored_file:"Restored unsaved edits: {0}",restart_title:"🔄 Restart Home Assistant",restart_warning_title:"⚠️ Important Warning",restart_warning_desc:"Restarting Home Assistant will <strong>temporarily interrupt all automations, device connections, and services</strong>. Please confirm the following before proceeding:",restart_li1:"All YAML configurations have been saved correctly with proper formatting",restart_li2:"No critical automations are currently running",restart_li3:"Household members have been notified of temporary system unavailability",restart_li4:"It is recommended to restart during off-peak hours",restart_tip_title:"💡 Tip",restart_confirm_label:"I confirm settings are saved and understand restart will temporarily interrupt services",restart_btn:"🔄 Restart Home Assistant",sending_restart:"Sending restart command...",restart_sent:"Restart command sent! Home Assistant is restarting, please wait 1-3 minutes...",restart_failed:"Unable to send restart command. Please go to Settings → System → Restart to restart manually. ({0})",request_timeout:"Request timeout"},"zh-Hant":{editor_title:"✏️ YAML 設定檔編輯器",editor_select_placeholder:"-- 選擇檔案 --",editor_refresh:"🔄 重新整理",editor_refresh_title:"重新整理檔案清單",editor_font_smaller:"縮小字體",editor_font_larger:"放大字體",editor_ready:"準備就緒",editor_new_file:"+ 新增檔案",editor_save:"💾 儲存",ws_connected:"● 已連線",ws_disconnected:"● 未連線",ws_not_connected:"WebSocket 未連線",loading_files:"正在載入檔案清單...",found_files:"找到 {0} 個 YAML 檔案",load_failed:"載入檔案清單失敗：{0}",loading_file:"正在載入 {0}...",loaded_file:"已載入：{0}",file_load_failed:"載入失敗：{0}",select_or_new:"請先選擇或新增檔案",confirm_save:"確定要儲存 {0} 嗎？",saving_file:"正在儲存 {0}...",saved_file:"✓ 已儲存：{0}",save_failed:"儲存失敗：{0}",new_file_status:"新檔案：{0}（尚未儲存）",unsaved_switch:"目前的變更尚未儲存，確定要切換檔案嗎？",cache_restored:"已恢復未儲存的編輯內容",cache_restored_file:"已恢復未儲存的編輯內容：{0}",restart_title:"🔄 重新啟動 Home Assistant",restart_warning_title:"⚠️ 重要警告",restart_warning_desc:"重新啟動 Home Assistant 將會<strong>暫時中斷所有自動化、裝置連線與服務</strong>。請確認以下事項後再執行：",restart_li1:"所有 YAML 設定已正確儲存，且格式無誤",restart_li2:"目前沒有關鍵的自動化正在執行中",restart_li3:"已通知家中成員系統將短暫無法使用",restart_li4:"建議在非尖峰時段執行重啟操作",restart_tip_title:"💡 提示",restart_confirm_label:"我確認已儲存設定，並了解重啟將暫時中斷服務",restart_btn:"🔄 重新啟動 Home Assistant",sending_restart:"正在發送重啟指令...",restart_sent:"重啟指令已送出！Home Assistant 正在重新啟動中，請稍候約 1-3 分鐘...",restart_failed:"無法發送重啟指令。請至 設定 → 系統 → 重新啟動 手動執行。({0})",request_timeout:"請求逾時"}},e=this.constructor.protocolTranslations;this._translations={en:{...t.en,...e.en},"zh-Hant":{...t["zh-Hant"],...e["zh-Hant"]}},this._handleKeydown=this._onGlobalKeydown.bind(this),this._handleBeforeUnload=this._onBeforeUnload.bind(this)}get _cfg(){return this.constructor.protocolConfig}get _language(){const t=(this.hass?.language||"en").toLowerCase();return"zh-hant"===t||"zh-tw"===t||"zh-hk"===t||t.startsWith("zh")?"zh-Hant":"en"}_t(t,...e){let r=(this._translations[this._language]||this._translations.en)[t]||this._translations.en[t]||t;return e.forEach((t,e)=>{r=r.replace(`{${e}}`,t)}),r}connectedCallback(){super.connectedCallback(),this._restoreFontSize(),this._restoreCache(),window.addEventListener("keydown",this._handleKeydown),window.addEventListener("beforeunload",this._handleBeforeUnload)}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("keydown",this._handleKeydown),window.removeEventListener("beforeunload",this._handleBeforeUnload)}updated(t){super.updated(t),t.has("hass")&&this.hass&&!this._hassReady&&(this._hassReady=!0,this._wsConnected=!0,this._editorStatus=this._t("editor_ready"),this._refreshFileList()),t.has("hass")&&this.hass&&(this._wsConnected=!1!==this.hass.connected)}async _callWS(t){if(!this.hass)throw new Error(this._t("ws_not_connected"));return this.hass.callWS(t)}async _refreshFileList(){try{this._editorStatus=this._t("loading_files"),this._editorStatusColor="";const t=await this._callWS({type:this._cfg.wsType,action:"list",ext:"yaml",depth:10});this._files=t.files||[],this._editorStatus=this._t("found_files",this._files.length)}catch(t){this._editorStatus=this._t("load_failed",t.message||t)}}async _loadFile(t){if(!t)return this._currentFile="",this._editorContent="",this._originalContent="",this._editorDirty=!1,this._editorStatus=this._t("editor_ready"),void(this._editorStatusColor="");if(!this._editorDirty||!this._currentFile||confirm(this._t("unsaved_switch")))try{this._editorStatus=this._t("loading_file",t),this._editorStatusColor="";const e=await this._callWS({type:this._cfg.wsType,action:"load",path:t});this._editorContent=e.content,this._originalContent=e.content,this._currentFile=e.path||t,this._editorDirty=!1,this._editorStatus=this._t("loaded_file",this._currentFile),this._cacheState()}catch(t){this._editorStatus=this._t("file_load_failed",t.message||t),this._editorStatusColor="var(--status-danger)"}}async _saveFile(){if(this._currentFile){if(confirm(this._t("confirm_save",this._currentFile))){this._editorStatus=this._t("saving_file",this._currentFile),this._editorStatusColor="";try{await this._callWS({type:this._cfg.wsType,action:"save",path:this._currentFile,content:this._editorContent}),this._originalContent=this._editorContent,this._editorDirty=!1,this._editorStatusColor="var(--status-success)",this._editorStatus=this._t("saved_file",this._currentFile),this._cacheState(),setTimeout(()=>{this._editorStatusColor=""},4e3)}catch(t){this._editorStatusColor="var(--status-danger)",this._editorStatus=this._t("save_failed",t.message||t),setTimeout(()=>{this._editorStatusColor=""},5e3)}}}else this._editorStatus=this._t("select_or_new")}_newFile(){const t=prompt(this._t("new_file_prompt"),this._cfg.defaultNewFile);if(!t)return;let e=t.replace(/\.\./g,"").trim();e.endsWith(".yaml")||e.endsWith(".yml")||(e+=".yaml"),this._files.includes(e)||(this._files=[...this._files,e]),this._currentFile=e,this._editorContent="",this._originalContent="",this._editorDirty=!0,this._editorStatus=this._t("new_file_status",e),this._editorStatusColor=""}_changeFontSize(t){this._fontSize=Math.max(10,Math.min(24,this._fontSize+t));try{localStorage.setItem(`${this._cfg.localStoragePrefix}_fontsize`,this._fontSize)}catch(t){}}_restoreFontSize(){try{const t=localStorage.getItem(`${this._cfg.localStoragePrefix}_fontsize`);t&&(this._fontSize=parseInt(t,10)||14)}catch(t){}}_cacheState(){try{localStorage.setItem(`${this._cfg.localStoragePrefix}_cache`,JSON.stringify({file:this._currentFile,content:this._editorContent,dirty:this._editorDirty,ts:Date.now()}))}catch(t){}}_restoreCache(){try{const t=localStorage.getItem(`${this._cfg.localStoragePrefix}_cache`);if(!t)return;const e=JSON.parse(t);e.dirty&&e.content&&Date.now()-e.ts<36e5&&(this._editorContent=e.content,this._currentFile=e.file||"",this._editorDirty=!0,this._editorStatus=e.file?this._t("cache_restored_file",e.file):this._t("cache_restored"))}catch(t){}}_onGlobalKeydown(t){(t.ctrlKey||t.metaKey)&&"s"===t.key&&(t.preventDefault(),this._currentFile&&this._saveFile())}_onBeforeUnload(t){this._editorDirty&&(t.preventDefault(),t.returnValue="")}_onEditorInput(t){this._editorContent=t.target.value,this._editorDirty=this._editorContent!==this._originalContent,this._cacheState()}_onEditorKeydown(t){if("Tab"===t.key){t.preventDefault();const e=t.target,r=e.selectionStart,s=e.selectionEnd,o=e.value;e.value=o.substring(0,r)+"  "+o.substring(s),e.selectionStart=e.selectionEnd=r+2,this._editorContent=e.value,this._editorDirty=!0,this._cacheState()}}_onFileSelect(t){this._loadFile(t.target.value)}_toggleRestart(t){this._restartConfirmed=t.target.checked}async _restartHA(){this._restartConfirmed=!1,this._restartStatusColor="var(--status-warning)",this._restartStatus=this._t("sending_restart");try{await this.hass.callService("homeassistant","restart"),this._restartStatusColor="var(--status-success)",this._restartStatus=this._t("restart_sent")}catch(t){this._restartStatusColor="var(--status-danger)",this._restartStatus=this._t("restart_failed",t.message||t)}}render(){const t=this._cfg,e=(t,...e)=>this._t(t,...e),r=t=>ct(this._t(t));return B`
      <!-- Top Bar -->
      <div class="top-bar">
        <div class="protocol-pill">
          <span class="dot"></span>
          ${t.protocolLabel} SETUP
        </div>
        <div class="top-bar-brand">
          <span>Woow Tech</span> &middot; v${t.version}
        </div>
      </div>

      <!-- Hero -->
      <div class="hero">
        <div class="hero-content">
          <span class="hero-icon">${t.heroIcon}</span>
          <h1>${e("hero_title")}</h1>
          <p>${e("hero_subtitle")}</p>
        </div>
      </div>

      <div class="panel-container">
        <!-- Step Cards -->
        <div class="steps-container">
          ${this._renderStep1(e,r,t)}
          ${this._renderStep2(e,r,t)}
          ${this._renderStep3(e,r,t)}
        </div>

        <hr class="section-divider" />

        <!-- YAML Editor -->
        ${this._renderEditor(e,r)}

        <hr class="section-divider" />

        <!-- Restart HA -->
        ${this._renderRestart(e,r)}

        <!-- Footer -->
        <div class="panel-footer">
          <p>${r("footer")}</p>
        </div>
      </div>
    `}_renderStep1(t,e,r){return B`
      <div class="step-card">
        <div class="step-number">1</div>
        <h2>${e("step1_title")}</h2>
        <p>${t("step1_desc")}</p>
        <ul>
          ${r.step1ListItems.map(t=>B`<li>${e(t)}</li>`)}
        </ul>
        <div class="btn-group">
          <a
            class="btn btn-filled btn-arrow"
            href=${r.officialDocsUrl}
            target="_blank"
            rel="noopener"
          >
            ${t("step1_btn")}
          </a>
        </div>
      </div>
    `}_renderStep2(t,e,r){return B`
      <div class="step-card">
        <div class="step-number">2</div>
        <h2>${e("step2_title")}</h2>
        <p>${t("step2_desc1")}</p>
        <p>${e("step2_desc2")}</p>
        <div class="btn-group">
          <a
            class="btn btn-ghost btn-arrow"
            href=${r.woowAiUrl}
            target="_blank"
            rel="noopener"
          >
            ${t("step2_btn")}
          </a>
        </div>
      </div>
    `}_renderStep3(t,e,r){return B`
      <div class="step-card">
        <div class="step-number">3</div>
        <h2>${e("step3_title")}</h2>
        <p>${t("step3_desc")}</p>

        <div class="sub-steps">
          ${r.subSteps.map((r,s)=>B`
              <div class="sub-step">
                <span class="sub-step-number">${s+1}</span>
                <div class="sub-step-content">
                  <strong>${t(r.titleKey)}</strong>
                  ${r.descIsHtml?B`<span>${e(r.descKey)}</span>`:B`<span>${t(r.descKey)}</span>`}
                  ${r.extraKey?r.extraIsHtml?B`<p style="padding-left:8px;margin-top:4px;">
                          ${e(r.extraKey)}
                        </p>`:B`<p>${t(r.extraKey)}</p>`:""}
                </div>
              </div>
            `)}
        </div>

        <p style="margin-top:16px;">${e("yaml_example_label")}</p>

        <div class="callout callout-${r.calloutType}">
          <div class="callout-title">${e("callout_ui_title")}</div>
          <p>${e("callout_ui_desc")}</p>
        </div>

        <div class="code-block">${r.yamlExample}</div>

        <div class="callout callout-success">
          <p>${e("callout_done")}</p>
        </div>
      </div>
    `}_renderEditor(t,e){return B`
      <div class="editor-section">
        <div class="editor-header">
          <div class="editor-header-title">${e("editor_title")}</div>
          <span
            class="ws-badge ${this._wsConnected?"connected":"disconnected"}"
          >
            ${this._wsConnected?t("ws_connected"):t("ws_disconnected")}
          </span>
        </div>

        <div class="editor-toolbar">
          <select @change=${this._onFileSelect}>
            <option value="">${t("editor_select_placeholder")}</option>
            ${this._files.map(t=>B`<option value=${t} ?selected=${t===this._currentFile}>
                  ${t}
                </option>`)}
          </select>
          <button @click=${this._refreshFileList} title=${t("editor_refresh_title")}>
            ${t("editor_refresh")}
          </button>
          <button @click=${()=>this._changeFontSize(-1)} title=${t("editor_font_smaller")}>
            A-
          </button>
          <button @click=${()=>this._changeFontSize(1)} title=${t("editor_font_larger")}>
            A+
          </button>
        </div>

        <textarea
          class="editor-textarea"
          .value=${this._editorContent}
          @input=${this._onEditorInput}
          @keydown=${this._onEditorKeydown}
          style="font-size:${this._fontSize}px"
          placeholder=${t("editor_placeholder")}
          spellcheck="false"
        ></textarea>

        <div class="editor-footer">
          <span
            class="editor-status"
            style="color:${this._editorStatusColor||"inherit"}"
          >
            ${this._editorStatus||t("editor_ready")}
          </span>
          <div class="editor-footer-buttons">
            <button class="btn-editor" @click=${this._newFile}>
              ${t("editor_new_file")}
            </button>
            <button
              class="btn-save"
              ?disabled=${!this._currentFile}
              @click=${this._saveFile}
            >
              ${t("editor_save")}
            </button>
          </div>
        </div>
      </div>
    `}_renderRestart(t,e){return B`
      <div class="card">
        <h2>${e("restart_title")}</h2>
        <p>${e("restart_desc")}</p>

        <div class="callout callout-danger">
          <div class="callout-title">${e("restart_warning_title")}</div>
          <p>${e("restart_warning_desc")}</p>
          <ul>
            <li>${t("restart_li1")}</li>
            <li>${t("restart_li2")}</li>
            <li>${t("restart_li3")}</li>
            <li>${t("restart_li4")}</li>
          </ul>
        </div>

        <div class="callout callout-info">
          <div class="callout-title">${e("restart_tip_title")}</div>
          <p>${e("restart_tip_desc")}</p>
        </div>

        <div class="restart-section">
          <label class="checkbox-confirm">
            <input
              type="checkbox"
              .checked=${this._restartConfirmed}
              @change=${this._toggleRestart}
            />
            <span>${t("restart_confirm_label")}</span>
          </label>
        </div>
        <div class="restart-section">
          <button
            class="btn btn-danger"
            ?disabled=${!this._restartConfirmed}
            @click=${this._restartHA}
          >
            ${t("restart_btn")}
          </button>
        </div>
        ${this._restartStatus?B`<div
              class="restart-status"
              style="color:${this._restartStatusColor||"inherit"}"
            >
              ${this._restartStatus}
            </div>`:""}
      </div>
    `}}const ut={domain:"woow_dmx",wsType:"woow_dmx/ws",configSubdir:"dmx",protocolLabel:"DMX",heroIcon:"💡",officialDocsUrl:"https://github.com/Breina/ha-artnet-led",woowAiUrl:"https://aiot.woowtech.io/blog",defaultNewFile:"dmx_config.yaml",localStoragePrefix:"woow_dmx",version:"2.1.0",calloutType:"warning",step1ListItems:["step1_li1","step1_li2","step1_li3","step1_li4"],subSteps:[{titleKey:"sub1_title",descKey:"sub1_desc"},{titleKey:"sub2_title",descKey:"sub2_desc",descIsHtml:!0},{titleKey:"sub3_title",descKey:"sub3_desc",descIsHtml:!0,extraKey:"sub3_list",extraIsHtml:!0},{titleKey:"sub4_title",descKey:"sub4_desc",descIsHtml:!0},{titleKey:"sub5_title",descKey:"sub5_desc",descIsHtml:!0},{titleKey:"sub6_title",descKey:"sub6_desc",descIsHtml:!0},{titleKey:"sub7_title",descKey:"sub7_desc",descIsHtml:!0}],yamlExample:'# configuration.yaml -- Art-Net DMX 燈具設定\nlight:\n  - platform: artnet_led\n    host: 192.168.1.100\n    port: 6454\n    universes:\n      0:\n        send_partial_universe: true\n        devices:\n          - channel: 1\n            name: "客廳主燈"\n            type: dimmer\n            transition: 1\n\n          - channel: 2\n            name: "RGB 燈條"\n            type: rgb\n            transition: 1'},_t={en:{hero_title:"DMX Setup Guide",hero_subtitle:"Complete Art-Net DMX lighting YAML configuration with official docs + AI assistant",step1_title:'<span class="icon">📖</span> Read Art-Net LED Official Documentation',step1_desc:"ha-artnet-led provides comprehensive Art-Net DMX integration documentation covering all configuration parameters. Before starting, review the official docs to understand the Art-Net/DMX integration architecture, including:",step1_li1:"<strong>Connection Settings</strong> -- Art-Net DMX node IP address and Universe configuration",step1_li2:"<strong>Channel Mapping</strong> -- DMX channel assignment and mapping methods",step1_li3:"<strong>Fixture Types</strong> -- Supported fixture types (dimmer, rgb, rgbw, color_temp, rgbww, binary, fixed)",step1_li4:"<strong>YAML Examples</strong> -- Configuration examples and parameter descriptions for various fixtures",step1_btn:"Go to Art-Net LED Official Docs",step2_title:'<span class="icon">🤖</span> Use Woow AI Assistant for Configuration',step2_desc1:"After reading the official docs, use our AI assistant to get DMX YAML configurations tailored to your specific fixtures. The AI can generate precise configurations based on your fixture type, DMX channel layout, Universe number, and other details.",step2_desc2:"<strong>How to use:</strong> Combine the parameter requirements from the official docs with your actual fixture information, and ask the AI assistant to get ready-to-use YAML configurations.",step2_btn:"Go to Woow AI Assistant",step3_title:'<span class="icon">📝</span> Complete Setup Tutorial',step3_desc:"Follow these steps to complete Art-Net DMX YAML configuration from scratch using official docs and AI assistant:",sub1_title:"Confirm Art-Net Hardware Info",sub1_desc:"Note your DMX node IP address, Universe number, and DMX channel assignments for each fixture.",sub2_title:"Browse Official Documentation",sub2_desc:'Visit <a href="https://github.com/Breina/ha-artnet-led" target="_blank" rel="noopener">ha-artnet-led GitHub Documentation</a> to understand the YAML structure and parameter meanings. Focus on the fixture types you need (e.g., dimmer, rgb, rgbw, color_temp, etc.) and channel configuration.',sub3_title:"Ask the AI Assistant",sub3_desc:'Visit <a href="https://aiot.woowtech.io/blog" target="_blank" rel="noopener">Woow AI Assistant</a> and provide the following information for configuration suggestions:',sub3_list:"‣ Fixture type (dimmer, RGB, RGBW, color temperature lights, etc.)<br />‣ DMX channel numbers (e.g., channel 1, 2, 3...)<br />‣ Universe number and Art-Net node IP",sub4_title:"Install Art-Net LED Integration",sub4_desc:'Install via <a href="https://hacs.xyz/" target="_blank" rel="noopener">HACS</a> by searching for "Art-Net LED", or manually copy the <code>artnet_led</code> custom component to the <code>custom_components/</code> directory.',sub5_title:"Use the Editor Below to Write YAML Configuration",sub5_desc:"Paste the AI-generated YAML configuration into the <strong>built-in YAML editor</strong> below to directly edit <code>configuration.yaml</code> or other config files, without installing any additional packages.",sub6_title:"Restart Home Assistant",sub6_desc:"After saving, restart Home Assistant to load the new Art-Net DMX configuration. Use the restart button below or go to <em>Settings → System → Restart</em>.",sub7_title:"Verify Devices and Entities",sub7_desc:"After restarting, go to <em>Settings → Devices & Services</em> to confirm Art-Net LED fixtures loaded correctly. You can also check new fixture entity states in <em>Developer Tools → States</em>.",yaml_example_label:"<strong>YAML Configuration Example (Art-Net DMX Fixtures):</strong>",callout_ui_title:"💡 Note: Art-Net LED is a third-party integration",callout_ui_desc:"Art-Net LED is a third-party integration that needs to be installed via HACS or manually placed in the <code>custom_components/</code> directory.<br />After installation, all fixture configurations are defined via YAML in <code>configuration.yaml</code>.",callout_done:"<strong>Done!</strong> By following the steps above, you have successfully completed the Art-Net DMX fixture YAML configuration using official documentation and AI assistant collaboration. After the settings take effect, you can control and manage DMX fixtures in Home Assistant.",editor_placeholder:"Select a file above to start editing, or paste AI-generated YAML configuration...",restart_desc:"After modifying <code>configuration.yaml</code>, you must restart Home Assistant for changes to take effect. New Art-Net DMX fixture entities will appear after restart.",restart_tip_desc:'If you only modified automations or scripts, try using the "Reload YAML" function in <em>Settings → System → Reload</em>, which doesn\'t require a full restart. However, adding or modifying Art-Net DMX fixtures usually requires a complete restart.',new_file_prompt:"Enter new file name (saved in config/dmx/ directory):",footer:'Woow DMX Setup Guide v2.1.0 — Powered by <a href="https://aiot.woowtech.io/blog" target="_blank" rel="noopener">Woow Tech</a>'},"zh-Hant":{hero_title:"DMX 設定指南",hero_subtitle:"透過官方文檔 + AI 助手，輕鬆完成 Art-Net DMX 燈具 YAML 設定",step1_title:'<span class="icon">📖</span> 閱讀 Art-Net LED 官方設定文檔',step1_desc:"ha-artnet-led 提供了完整的 Art-Net DMX 整合文檔，涵蓋所有設定參數的說明。建議在開始設定前，先瀏覽官方文檔了解 Art-Net/DMX 整合的基本架構，包含：",step1_li1:"<strong>連線設定</strong> -- Art-Net DMX node IP 位址與 Universe 設定",step1_li2:"<strong>Channel Mapping</strong> -- DMX 通道的對應與分配方式",step1_li3:"<strong>Fixture Types</strong> -- 支援的燈具類型（dimmer, rgb, rgbw, color_temp, rgbww, binary, fixed）",step1_li4:"<strong>YAML 設定範例</strong> -- 各種燈具的設定範例與參數說明",step1_btn:"前往 Art-Net LED 官方文檔",step2_title:'<span class="icon">🤖</span> 使用 Woow AI 助手取得設定參數',step2_desc1:"閱讀官方文檔後，您可以透過我們提供的 AI 助手來取得針對您特定燈具的 DMX YAML 設定。AI 助手能根據您的燈具類型、DMX 通道配置、Universe 編號等資訊，生成精確的設定內容。",step2_desc2:"<strong>使用方式：</strong>將您從官方文檔中了解到的參數需求，搭配您的實際燈具資訊，向 AI 助手詢問，即可獲得可直接使用的 YAML 設定。",step2_btn:"前往 Woow AI 助手",step3_title:'<span class="icon">📝</span> 完整設定流程教學',step3_desc:"以下是從零開始，透過官方文檔搭配 AI 助手完成 Art-Net DMX YAML 設定的完整步驟：",sub1_title:"確認 Art-Net 硬體資訊",sub1_desc:"記下您的 DMX node IP 位址、Universe 編號，以及每個燈具對應的 DMX 通道分配。",sub2_title:"瀏覽官方文檔",sub2_desc:'前往 <a href="https://github.com/Breina/ha-artnet-led" target="_blank" rel="noopener">ha-artnet-led GitHub 文檔</a>，了解 YAML 設定的結構和各參數的意義。重點關注您需要的燈具類型（如 dimmer、rgb、rgbw、color_temp 等）及通道設定。',sub3_title:"向 AI 助手提問",sub3_desc:'前往 <a href="https://aiot.woowtech.io/blog" target="_blank" rel="noopener">Woow AI 助手</a>，提供以下資訊以獲得設定建議：',sub3_list:"‣ 燈具類型（dimmer、RGB、RGBW、色溫燈等）<br />‣ DMX 通道編號（如 channel 1, 2, 3...）<br />‣ Universe 編號與 Art-Net node IP",sub4_title:"安裝 Art-Net LED 整合",sub4_desc:'透過 <a href="https://hacs.xyz/" target="_blank" rel="noopener">HACS</a> 搜尋「Art-Net LED」安裝，或手動將 <code>artnet_led</code> 自訂元件複製至 <code>custom_components/</code> 目錄。',sub5_title:"使用下方編輯器寫入 YAML 設定",sub5_desc:"將 AI 助手產生的 YAML 設定，透過下方的<strong>內建 YAML 編輯器</strong>直接編輯 <code>configuration.yaml</code> 或其他設定檔，無需額外安裝任何套件。",sub6_title:"重新啟動 Home Assistant",sub6_desc:"儲存設定後，需要重新啟動 Home Assistant 以載入新的 Art-Net DMX 設定。請使用下方的重啟按鈕或至 <em>設定 → 系統 → 重新啟動</em>。",sub7_title:"驗證裝置與實體",sub7_desc:"重啟後，前往 <em>設定 → 裝置與服務</em> 確認 Art-Net LED 燈具已正確載入。您也可以在 <em>開發者工具 → 狀態</em> 中查看新建立的燈具實體狀態。",yaml_example_label:"<strong>YAML 設定範例（以 Art-Net DMX 燈具為例）：</strong>",callout_ui_title:"💡 注意：Art-Net LED 為第三方整合",callout_ui_desc:"Art-Net LED 為第三方整合，需透過 HACS 或手動安裝至 <code>custom_components/</code> 目錄。<br />安裝完成後，所有燈具設定均透過 <code>configuration.yaml</code> 中的 YAML 定義。",callout_done:"<strong>完成！</strong>透過以上步驟，您已成功透過官方文檔參考與 AI 助手協作，完成了 Art-Net DMX 燈具的 YAML 設定。設定生效後，您就可以在 Home Assistant 中控制和管理 DMX 燈具了。",editor_placeholder:"選擇上方檔案開始編輯，或直接貼上 AI 產出的 YAML 設定...",restart_desc:"修改 <code>configuration.yaml</code> 後，必須重新啟動 Home Assistant 才能使設定生效。新增的 Art-Net DMX 燈具實體將在重啟後出現。",restart_tip_desc:"如果只是修改了自動化或腳本，可以嘗試使用 <em>設定 → 系統 → 重新載入</em> 中的「重新載入 YAML」功能，這不需要完全重啟系統。但 Art-Net DMX 燈具的新增或修改，通常需要完整重啟。",new_file_prompt:"請輸入新檔案名稱（儲存於 config/dmx/ 目錄下）：",footer:'Woow DMX Setup Guide v2.1.0 — Powered by <a href="https://aiot.woowtech.io/blog" target="_blank" rel="noopener">Woow Tech</a>'}};customElements.define("woow-dmx-panel",class extends ht{static get protocolConfig(){return ut}static get protocolTranslations(){return _t}});
