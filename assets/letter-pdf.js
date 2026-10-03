// O modelo original é incorporado sem recorte, edição de texto ou recompressão JPEG.
import {PDFDocument,rgb} from './vendor/pdf-lib.esm.min.js';
import fontkit from './vendor/fontkit.es.min.js';
export const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
let templatePromise,fontPromise;
async function fontBytes(){return fontPromise??=(fetch(new URL('./vendor/DejaVuSerif.ttf',import.meta.url)).then(r=>{if(!r.ok)throw Error('Não foi possível carregar a fonte da carta. Tente novamente.');return r.arrayBuffer()}).catch(e=>{fontPromise=null;throw e}));}
async function template(){
 return templatePromise??=(fetch(new URL('./carta-modelo-original.png',import.meta.url)).then(r=>{if(!r.ok)throw Error('Não foi possível carregar o modelo da carta. Verifique a conexão e tente novamente.');return r.arrayBuffer()}).catch(e=>{templatePromise=null;throw e}));
}
function parts(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('Preencha as duas datas.');
 const [y,m,d]=value.split('-').map(Number),date=new Date(value+'T12:00:00Z');
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw Error('Confira as datas informadas.');
 return [String(d).padStart(2,'0'),MONTHS[m-1].toUpperCase(),String(y)];
}
export async function createLetter({name,issueDate,validUntil}){
 name=String(name||'').trim().replace(/\s+/g,' ').normalize('NFC');
 if(!name)throw Error('Informe o nome do membro.');
 if(name.length>150)throw Error('O nome deve ter até 150 caracteres.');
 const issue=parts(issueDate),expiry=parts(validUntil);
 if(validUntil<issueDate)throw Error('A validade não pode ser anterior à emissão.');
 const doc=await PDFDocument.create(),page=doc.addPage([595.275590551,841.88976378]);
 doc.registerFontkit(fontkit);const font=await doc.embedFont(await fontBytes(),{subset:true});
 const supported=new Set(font.getCharacterSet());if([...name].some(c=>!supported.has(c.codePointAt(0))))throw Error('O nome contém um caractere não suportado. Use letras, acentos e pontuação comum.');
 try{font.encodeText(name)}catch{throw Error('O nome contém um caractere não suportado. Use letras, acentos e pontuação comum.');}
 const background=await doc.embedPng(await template());
 page.drawImage(background,{x:0,y:0,width:page.getWidth(),height:page.getHeight()});
 const sx=page.getWidth()/1055,sy=page.getHeight()/1491;
 function write(text,left,right,baseline,preferred=12){
  const width=(right-left)*sx;let size=preferred;
  const measured=font.widthOfTextAtSize(text,size);
  if(measured>width)size*=width/measured;
  if(size<7)throw Error('O nome é muito longo para o espaço da carta. Abrevie parte do nome.');
  const textWidth=font.widthOfTextAtSize(text,size);
  page.drawText(text,{x:left*sx+(width-textWidth)/2,y:page.getHeight()-baseline*sy,size,font,color:rgb(0,0,0)});
 }
 write(name,244,853,518,12);
 [[issue,[[368,445],[501,715],[771,849]],1156],[expiry,[[389,459],[509,714],[771,852]],1194]].forEach(([values,ranges,y])=>values.forEach((value,i)=>write(value,...ranges[i],y,11)));
 doc.setTitle('Carta de recomendação — '+name);doc.setAuthor('IEAD Ministério Jesus é Vida');doc.setSubject('Carta de recomendação');
 const bytes=await doc.save();
 const safe=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'membro';
 return {bytes,filename:'Carta-'+safe+'-'+issueDate+'.pdf'};
}
