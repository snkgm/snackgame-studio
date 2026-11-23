export const FORMATS=[
  {id:"post-4x5",label:"Publicación vertical",short:"Feed vertical",w:1080,h:1350,safe:{t:0,b:0,l:48,r:48}},
  {id:"post-1x1",label:"Publicación cuadrada",short:"Feed cuadrado",w:1080,h:1080,safe:{t:0,b:0,l:48,r:48}},
  {id:"story-9x16",label:"Stories",short:"Stories",w:1080,h:1920,safe:{t:250,b:340,l:64,r:64}},
  {id:"carousel-4x5",label:"Carrusel (vertical)",short:"Carrusel",w:1080,h:1350,slides:true,safe:{t:0,b:0,l:48,r:48}},
  {id:"reel-cover",label:"Portada de Reel",short:"Reel",w:1080,h:1920,safe:{t:240,b:240,l:64,r:64}}
];
export const DEFAULT_FORMAT="post-4x5";
export const fmtById=id=>FORMATS.find(f=>f.id===id)||FORMATS[0];
