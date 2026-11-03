// Carta vetorial: transcrição literal do modelo, inclusive grafias originais.
import {PDFDocument,rgb,pushGraphicsState,popGraphicsState,rectangle,clip,endPath,concatTransformationMatrix} from './vendor/pdf-lib.esm.min.js';
import fontkit from './vendor/fontkit.es.min.js';
export const MONTHS=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const cache=new Map();
function resource(path){if(!cache.has(path))cache.set(path,fetch(new URL(path,import.meta.url)).then(r=>{if(!r.ok)throw Error('Não foi possível carregar os arquivos da carta. Tente novamente com internet.');return r.arrayBuffer()}).catch(e=>{cache.delete(path);throw e}));return cache.get(path)}
function parts(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)throw Error('Confira as datas informadas.');const [y,m,d]=v.split('-');return [d,MONTHS[+m-1].toUpperCase(),y]}
export const LETTER_TEXT={
 firstBefore:'VENHO ATRAVÉS DESTA RESPEITOSAMENTE SOLICITAR AS AUTORIDADES CIVIS, MILITARES E RELIGIOSAS QUE SEJA FACULTADO O DESAMPENHO DO MEMBRO',
 firstAfter:'NA MISSÃO DE PREGAR O EVANGELHO, ISTO EM CONFORMIDADE COM OS ARTIGOS 1 E 19 DO CÓDIGO CIVIL BRASILEIRO, O(A) MESMO(A) ESTÁ, A MESMO SE RESSORSOM ESTE MINISTÁRIO E NÃO TENDO NADA QUE O DESABONE.',
 second:'SENDO QUE QUALQUER DELITO QUE VENHA FERIR A LEI DO CÓDIGO BRASILEIRO E DA BÍBLIA, O MESMO SE RESSONSABILIZARÁ PELO ATO PERANTE A LO. A LEI.',
 thirdBefore:'ESTE MINISTÉRIO NÃO SE RESPONSABILIZARÁ POR ATOS QUE O MESMO(A) VENHA COMETER, FERINDO O CÓDIGO BRASILEIRO QUE ESTILA EM CONFORMIDADE COM A BÍBLIA. POR SEU VERDADE, VAI APRESENTE POR MIM ASSINADO,',
 leaders:'PASTOR PRESIDENTE GERALDO CASSEMIRO DA SILVA E PASTOR VICE PRESIDENTE FILIPE LEÔNCIO DA SILVA,',
 thirdAfter:'IGREJA EVANGELICA ASSEMBLEIA DE DEUS MINISTÉRIO JESUS É VIDA SERRA/ES.'
};
export async function createLetter({name,issueDate,validUntil}){
 name=String(name||'').trim().replace(/\s+/g,' ').normalize('NFC').toLocaleUpperCase('pt-BR');
 if(!name||name.length>150)throw Error('Informe o nome do membro com até 150 caracteres.');
 const issue=parts(issueDate),expiry=parts(validUntil);if(validUntil<issueDate)throw Error('A validade não pode ser anterior à emissão.');
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [regular,bold,dates,art]=await Promise.all([doc.embedFont(await resource('./vendor/ChurchRoman-Regular.ttf')),doc.embedFont(await resource('./vendor/ChurchRoman-Bold.ttf')),doc.embedFont(await resource('./vendor/DejaVuSerif.ttf'),{subset:true}),doc.embedPng(await resource('./carta-modelo-original.png'))]);
 if([...name].some(c=>!regular.getCharacterSet().includes(c.codePointAt(0))))throw Error('O nome contém caracteres não suportados. Use letras, acentos e pontuação comum.');
 const page=doc.addPage([595.275590551,841.88976378]),sx=page.getWidth()/1055,sy=page.getHeight()/1491,H=page.getHeight();
 const width=(s,font,size)=>font.widthOfTextAtSize(s,size*sx)/sx;
 function text(s,x,y,size=20,font=regular,maxWidth=null,align='left'){
  const actual=width(s,font,size),scale=maxWidth&&actual>maxWidth?maxWidth/actual:1;
  if(align==='center')x+=(maxWidth-actual*scale)/2;
  page.pushOperators(pushGraphicsState(),concatTransformationMatrix(scale,0,0,1,x*sx,H-y*sy));
  page.drawText(s,{x:0,y:0,size:size*sx,font,color:rgb(0,0,0)});page.pushOperators(popGraphicsState());
 }
 function line(x1,y1,x2,y2,thick=1){page.drawLine({start:{x:x1*sx,y:H-y1*sy},end:{x:x2*sx,y:H-y2*sy},thickness:thick*sx,color:rgb(0,0,0)})}
 function crop(src,dst,opacity=1){const [left,top,w,h]=src,[x,y,dw,dh]=dst;const scaleX=dw/w,scaleY=dh/h;
  page.pushOperators(pushGraphicsState(),rectangle(x*sx,H-(y+dh)*sy,dw*sx,dh*sy),clip(),endPath());
  page.drawImage(art,{x:(x-left*scaleX)*sx,y:H-(y+(1491-top)*scaleY)*sy,width:1055*scaleX*sx,height:1491*scaleY*sy,opacity});page.pushOperators(popGraphicsState());
 }
 // Somente o emblema e a marca-d'água continuam como arte. Nenhum parágrafo vem da imagem.
 crop([48,48,205,169],[48,48,205,169]);
 crop([48,48,205,169],[293,626,550,453],.075);
 crop([233,978,657,150],[233,978,657,150]);
 text('IGREJA EVANGELICA ASSEMBLEIA DE DEUS',263,121,49,bold,731);
 text('MINISTÉRIO JESUS É VIDA',313,177,47,bold,680,'center');
 text('BAIRRO PALMEIRAS – SERRA/ES',313,221,32,regular,680,'center');
 text('RUA HILDA MOTTA DE OLIVEIRA, Nº42 - BAIRRO PALMEIRAS - SERRA/ES',314,266,26,regular,674,'center');
 text('CULTOS: DOMINGOS, QUARTAS',48,243,19,regular,239,'center');text('e SEXTAS ÀS 19:00hs',48,265,19,regular,239,'center');
 text('RECOMENDAÇÃO',292,344,47,bold,480,'center');line(293,369,486,369);line(568,369,770,369);
 // Ornamento de curvas vetoriais.
 page.drawSvgPath('M 0 11 C -2 -3 25 -5 25 9 C 25 22 2 23 4 11 C 5 5 14 6 14 11 M 29 8 C 38 -1 45 25 57 19 C 71 15 62 -5 48 2 C 38 8 52 17 57 9 M 28 2 L 31 5 L 28 8 L 25 5 Z',{x:495*sx,y:H-357*sy,scale:sx,borderColor:rgb(0,0,0),borderWidth:1.4});
 line(35,407,1020,407,1.5);line(35,407,35,1452,1.5);line(1020,407,1020,1452,1.5);line(35,1452,1020,1452,1.5);line(223,407,223,1452,1.4);
 const sidebar=[
 ['MATRIZ',445,true],['DIVINÓPOLIS-SERRA',481,true],['Rua: Sabará, Nº 133',506,false],
 ['CONGREGAÇÕES',573,true],['ITABATÃ- BAHIA',622,true],['Run.- Rio Itapassúvim',647,false],['nº 227, Tnitrageto oel',671,false],
 ['TIMBUÍ-FUNDÃO',748,true],['Rua: João Acarl',773,false],
 ['BAIRRO- CACAROCA',856,true],['Rua: Alfrée Conrea',881,false],['Punante nº 277-Serra',905,false],
 ['BAIRRO-PALMEIRAS',983,true],['Ruá: FELGINVEN DO',1008,false],['AGBABGO HJY- 3arto',1031,false],
 ['BAIRRO: CIDADE',1125,true],['NOVA DA SERRA',1149,true],['( Caopada Grande)',1174,false],['Serra-ES',1200,false]];
 sidebar.forEach(([s,y,b])=>text(s,48,y,b?20:19,b?bold:regular,166));line(49,451,123,451,.7);line(49,579,208,579,.7);
 function paragraph(runs,top,{indent=0,size=20,leading=29}={}){
  const left=239,right=1004;let x=left+indent,y=top,lineWords=[];
  const tokens=runs.flatMap(([s,font])=>s.split(/\s+/).filter(Boolean).map(word=>({word,font})));
  for(const token of tokens){const w=width(token.word,token.font,size),space=width(' ',token.font,size);
   if(w>right-left){ // Um token excepcionalmente longo quebra sem encolher a fonte.
    for(const c of token.word){const cw=width(c,token.font,size);if(x+cw>right){x=left;y+=leading}text(c,x,y,size,token.font);x+=cw}x+=space;continue;
   }
   if(x+w>right){x=left;y+=leading}
   text(token.word,x,y,size,token.font);x+=w+space;
  }
  return y;
 }
 let y=paragraph([[LETTER_TEXT.firstBefore+' '+name+' '+LETTER_TEXT.firstAfter,regular]],463);
 y=paragraph([[LETTER_TEXT.second,regular]],y+60,{indent:23});
 y=paragraph([[LETTER_TEXT.thirdBefore,regular],[LETTER_TEXT.leaders,bold],[LETTER_TEXT.thirdAfter,regular]],y+60,{indent:23});
 if(y>1080)throw Error('O nome excede o espaço disponível nesta carta. Abrevie parte do nome.');
 // Datas mantidas nas mesmas posições, com a fonte da versão anterior.
 text('SERRA/ES,',242,1160,22,bold);text('DE',457,1160,22,bold);text('DE',729,1160,22,bold);
 text('VÁLIDO ATÉ:',242,1198,22,bold,134);text('DE',471,1198,22,bold);text('DE',729,1198,22,bold);
 [[issue,[[368,445],[501,715],[771,849]],1156,1161],[expiry,[[389,459],[509,714],[771,852]],1194,1199]].forEach(([values,ranges,baseline,underline])=>values.forEach((value,i)=>{text(value,ranges[i][0],baseline,11/sx,dates,ranges[i][1]-ranges[i][0],'center');line(ranges[i][0]-4,underline,ranges[i][1]+4,underline,.8)}));
 line(250,1304,587,1304,1.5);line(655,1304,991,1304,1.5);
 text('GERALDO CASSEMIRO DA SILVA',250,1332,19,regular,337,'center');text('PASTOR PRESIDENTE',250,1356,19,regular,337,'center');
 text('FILIPE LEÔNCIO DA SILVA',655,1332,19,regular,336,'center');text('PASTOR VICE PRESIDENTE',655,1356,19,regular,336,'center');
 text('OH! QUÃO BOM E QUÃO SUAVE É QUE OS IRMÃOS VIVAM EM UNIÃO! (SL 133:1)',239,1419,23,regular,742);
 doc.setTitle('Carta de recomendação — '+name);doc.setAuthor('IEAD Ministério Jesus é Vida');
 return {bytes:await doc.save(),filename:'Carta-'+name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').slice(0,80)+'-'+issueDate+'.pdf'};
}
