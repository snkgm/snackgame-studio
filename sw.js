self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",()=>{});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const hash=(e.notification.data&&e.notification.data.url)||"#/automatizaciones",base=self.registration.scope;
  e.waitUntil((async()=>{
    const all=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const c of all){if(c.url.startsWith(base)){await c.focus();c.postMessage({go:hash});return}}
    await self.clients.openWindow(base+hash);
  })());
});
self.addEventListener("push",e=>{
  let d={};try{d=e.data.json()}catch{try{d={title:e.data.text()}}catch{}}
  e.waitUntil(self.registration.showNotification(d.title||"SnackGame Studio",{body:d.body||"",icon:"icons/icon-192.png",badge:"icons/icon-192.png",data:{url:d.url||"#/automatizaciones"}}));
});
