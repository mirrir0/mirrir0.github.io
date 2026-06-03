import{r as e,b as N,i as M,j as s,T as ne,C as se,c as J}from"./index-D0jlDZob.js";/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ie=(...i)=>i.filter((r,l,c)=>!!r&&r.trim()!==""&&c.indexOf(r)===l).join(" ").trim();/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const he=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe=i=>i.replace(/^([A-Z])|[\s-_]+(\w)/g,(r,l,c)=>c?c.toUpperCase():l.toLowerCase());/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q=i=>{const r=pe(i);return r.charAt(0).toUpperCase()+r.slice(1)};/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var U={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const me=i=>{for(const r in i)if(r.startsWith("aria-")||r==="role"||r==="title")return!0;return!1},xe=e.createContext({}),ke=()=>e.useContext(xe),ge=e.forwardRef(({color:i,size:r,strokeWidth:l,absoluteStrokeWidth:c,className:k="",children:v,iconNode:d,...f},m)=>{const{size:g=24,strokeWidth:b=2,absoluteStrokeWidth:u=!1,color:T="currentColor",className:o=""}=ke()??{},w=c??u?Number(l??b)*24/Number(r??g):l??b;return e.createElement("svg",{ref:m,...U,width:r??g??U.width,height:r??g??U.height,stroke:i??T,strokeWidth:w,className:ie("lucide",o,k),...!v&&!me(f)&&{"aria-hidden":"true"},...f},[...d.map(([C,j])=>e.createElement(C,j)),...Array.isArray(v)?v:[v]])});/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ce=(i,r)=>{const l=e.forwardRef(({className:c,...k},v)=>e.createElement(ge,{ref:v,iconNode:r,className:ie(`lucide-${he(Q(i))}`,`lucide-${i}`,c),...k}));return l.displayName=Q(i),l};/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ve=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],ye=ce("chevron-left",ve);/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],be=ce("x",Re),_=8,F=200,Ce=.25,Ee=40,ee=300,Y=300,we=48,oe={position:"absolute",top:0,width:we,height:24,zIndex:2,pointerEvents:"none"},Te={...oe,left:0,background:"linear-gradient(to right, var(--muted), transparent)"},je={...oe,right:0,background:"linear-gradient(to left, var(--muted), transparent)"};function Ie(){const i=N(n=>n.items),r=N(n=>n.loading),l=e.useRef(null),[c,k]=e.useState(0);e.useLayoutEffect(()=>{const n=l.current;if(!n)return;const h=new ResizeObserver(a=>{for(const x of a)k(x.contentRect.width)});return h.observe(n),k(n.clientWidth),()=>h.disconnect()},[]);const[,v]=e.useState(0),d=e.useCallback(()=>v(n=>n+1),[]),f=e.useRef([]),m=e.useRef(0),g=e.useRef(new Map),b=e.useRef(new Set),u=e.useRef(new Set),T=e.useRef(new Map),o=e.useRef([]),w=e.useRef(new Map),C=e.useCallback(n=>(w.current.get(n)??F)+_,[]),j=e.useCallback(n=>{let h=0;for(const a of n)h+=C(a);return h},[C]);e.useEffect(()=>{const n=new Set(i.map(t=>t.id)),h=b.current,a=g.current,x=f.current;for(const t of i)a.set(t.id,t);for(const t of i)!h.has(t.id)&&!M(t)&&(x.includes(t.id)||x.splice(m.current,0,t.id));for(const t of i)if(M(t)&&h.has(t.id)){const R=o.current.indexOf(t.id);if(R!==-1&&!u.current.has(t.id)){u.current.add(t.id);const p=setTimeout(()=>{u.current.delete(t.id),o.current=o.current.filter(E=>E!==t.id),f.current=f.current.filter(E=>E!==t.id),d()},ee);T.current.set(t.id,p)}R===-1&&!u.current.has(t.id)&&(f.current=x.filter(p=>p!==t.id))}for(const t of h)if(!n.has(t)){f.current=x.filter(p=>p!==t),o.current=o.current.filter(p=>p!==t),a.delete(t);const R=T.current.get(t);R&&(clearTimeout(R),T.current.delete(t)),u.current.delete(t)}b.current=n,d()},[i,d]);const I=e.useRef(null),y=e.useRef(0),G=e.useRef(0),L=e.useRef(null),O=e.useRef(0),B=e.useRef(!1),q=f.current.length>0&&!r;e.useEffect(()=>{if(!q||c<=0)return;if(o.current.length===0){const a=c,x=f.current,t=x.length;let R=m.current;const p=[];let E=0;for(let S=0;S<t;S++){const D=x[R%t];R++;const A=g.current.get(D);if(!(!A||M(A)||u.current.has(D))&&(p.push(D),E+=F+_,E>=a+(F+_)*2))break}o.current=p,m.current=R%t,d()}if(o.current.length>0){const a=j(o.current);a>0&&(y.current=(y.current%a+a)%a)}const n=()=>{I.current&&(I.current.style.transform=`translate3d(${-y.current}px, 0, 0)`)};n();const h=a=>{L.current===null&&(L.current=a);const x=Math.min(a-L.current,50)/1e3;L.current=a;const t=B.current?0:Ee,R=1-Math.exp(-x/Ce);G.current+=(t-G.current)*R,y.current+=G.current*x;const p=o.current,E=f.current,S=E.length,D=c;let A=!1;for(;p.length>0;){const P=p[0],$=C(P);if(y.current<$)break;p.shift(),y.current-=$,A=!0}if(S>0){let P=j(p),$=0;for(;P-y.current<D+(F+_)*2&&$<S*2;){$++;const fe=m.current%S,z=E[fe];m.current=(m.current+1)%S;const V=g.current.get(z);!V||M(V)||u.current.has(z)||p.includes(z)||(p.push(z),P+=F+_,A=!0)}}A?d():n(),O.current=requestAnimationFrame(h)};return L.current=null,O.current=requestAnimationFrame(h),()=>{cancelAnimationFrame(O.current),O.current=0}},[q,c,d]),e.useLayoutEffect(()=>{const n=I.current;if(n){for(const h of n.children){const a=h,x=a.dataset.tickerId;x&&w.current.set(x,a.offsetWidth)}n.style.transform=`translate3d(${-y.current}px, 0, 0)`}});const W=!(f.current.length===0&&!r)&&!r,[ae,K]=e.useState(W);e.useEffect(()=>{if(W){K(!0);return}const n=setTimeout(()=>K(!1),Y);return()=>clearTimeout(n)},[W]);const le=e.useCallback(()=>{B.current=!0},[]),ue=e.useCallback(()=>{B.current=!1},[]),X=ae?o.current:[],de={height:W?24:0,minHeight:0,maxHeight:W?24:0,width:"100%",overflow:"hidden",position:"relative",background:"var(--muted)",flexShrink:0,transition:`height ${Y}ms ease, max-height ${Y}ms ease`};return s.jsxs("div",{ref:l,className:"ticker-outer",style:de,"aria-label":"Activity ticker","aria-live":"off",onMouseEnter:le,onMouseLeave:ue,children:[s.jsx(ne,{}),s.jsx("style",{children:`
        .ticker-chip-exiting {
          opacity: 0;
          transition: opacity ${ee}ms ease;
          pointer-events: none;
        }
        .ticker-track {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: ${_}px;
          will-change: transform;
          user-select: none;
          position: relative;
          z-index: 0;
          height: 24px;
        }
      `}),X.length>0&&s.jsxs(s.Fragment,{children:[s.jsx("div",{style:Te,"aria-hidden":!0}),s.jsx("div",{style:je,"aria-hidden":!0})]}),s.jsx("div",{ref:I,className:"ticker-track",children:X.map(n=>{const h=g.current.get(n);if(!h)return null;const a=u.current.has(n);return s.jsx("span",{"data-ticker-id":n,style:{display:"inline-flex",alignItems:"center"},children:s.jsx(se,{item:h,exiting:a})},n)})})]})}const te=6e3,Z=400,re=24,H=500,Se=150;function Ae(){const i=N(o=>o.items);N(o=>o.loading);const r=e.useMemo(()=>i.filter(o=>!M(o)),[i]),l=e.useRef(0),[c,k]=e.useState(null),[v,d]=e.useState("idle"),f=e.useRef(!1),m=e.useRef(null),g=e.useRef(()=>{}),b=e.useCallback(()=>{f.current=!0},[]),u=e.useCallback(()=>{f.current=!1,m.current&&clearInterval(m.current),m.current=setInterval(()=>g.current(),te)},[]);if(e.useEffect(()=>{if(r.length===0){k(null),d("idle");return}l.current>=r.length&&(l.current=0),k(r[l.current]),d("idle");let o,w,C;const j=()=>{o&&clearTimeout(o),w&&clearTimeout(w),C&&clearTimeout(C)},I=()=>{f.current||(j(),d("exiting"),o=setTimeout(()=>{l.current=(l.current+1)%r.length,k(r[l.current]),d("gap"),w=setTimeout(()=>{d("entering"),C=setTimeout(()=>{d("idle")},H)},Se)},H))};g.current=I;const y=setInterval(I,te);return m.current=y,()=>{clearInterval(y),m.current=null,j()}},[r]),c==null)return s.jsx("span",{className:"ticker-chip",children:s.jsx("span",{className:"ticker-name",style:{opacity:.5},children:"no activity"})});const T=(()=>{switch(v){case"exiting":return"ticker-chip-exit";case"gap":return"ticker-chip-hidden";case"entering":return"ticker-chip-enter";default:return}})();return s.jsx("span",{className:T,style:{display:"inline-flex",alignItems:"center",minWidth:0,overflow:"hidden"},onMouseEnter:b,onMouseLeave:u,children:s.jsx(se,{item:c,exiting:!1})},c.id)}function Ne({initialExpanded:i=!1}){const r=N(u=>u.items),l=N(u=>u.loading),[c,k]=e.useState(i),[v,d]=e.useState(!1),m=e.useMemo(()=>r.some(u=>!M(u)),[r])||l;e.useEffect(()=>{if(c){d(!0);return}const u=setTimeout(()=>d(!1),Z);return()=>clearTimeout(u)},[c]);const g=e.useCallback(()=>k(!0),[]),b=e.useCallback(()=>k(!1),[]);return s.jsx("div",{className:"ticker-flipper",style:{flex:"1 1 0%",minWidth:0,position:"relative",height:24},children:m&&s.jsxs(s.Fragment,{children:[s.jsx(ne,{}),s.jsx("style",{children:`
            .ticker-flipper-collapsed .ticker-chip {
              border-color: var(--border);
            }
            @keyframes ticker-chip-enter {
              from { opacity: 0; transform: translateY(5px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes ticker-chip-exit {
              from { opacity: 1; transform: translateY(0); }
              to   { opacity: 0; transform: translateY(-5px); }
            }
            .ticker-chip-enter {
              animation: ticker-chip-enter ${H}ms ease-out;
            }
            .ticker-chip-exit {
              animation: ticker-chip-exit ${H}ms ease-in forwards;
            }
            .ticker-chip-hidden {
              opacity: 0;
            }
            .ticker-flipper-btn {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: ${re}px;
              height: ${re}px;
              flex-shrink: 0;
              cursor: pointer;
              border: none;
              background: transparent;
              color: var(--muted-foreground);
              padding: 0;
            }
            .ticker-flipper-btn:hover {
              color: var(--foreground);
            }
            .ticker-flipper-collapsed .ticker-chip {
              flex-shrink: 1;
              min-width: 0;
            }
          `}),s.jsxs("div",{className:J("ticker-flipper-collapsed absolute inset-0 flex items-center justify-end transition-opacity min-w-0 overflow-hidden",c?"opacity-0 pointer-events-none":"opacity-100"),style:{transitionDuration:`${Z}ms`},"aria-hidden":c,children:[s.jsx(Ae,{}),s.jsx("button",{className:"ticker-flipper-btn",onClick:g,"aria-label":"Expand ticker",title:"Expand ticker",children:s.jsx(ye,{size:14})})]}),s.jsxs("div",{className:J("absolute inset-0 flex items-center transition-opacity",c?"opacity-100":"opacity-0 pointer-events-none"),style:{transitionDuration:`${Z}ms`},"aria-hidden":!c,children:[s.jsx("div",{className:"flex-1 min-w-0 overflow-hidden",style:{height:24},children:v&&s.jsx(Ie,{})}),s.jsx("button",{className:"ticker-flipper-btn",onClick:b,"aria-label":"Minimize ticker",title:"Minimize ticker",children:s.jsx(be,{size:12})})]})]})})}export{Ne as default};
