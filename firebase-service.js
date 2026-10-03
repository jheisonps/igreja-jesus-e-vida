import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getDatabase,ref,onValue,update,push,get} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
const app=initializeApp(window.FIREBASE_CONFIG),auth=getAuth(app),db=getDatabase(app);
let connected=false;
onValue(ref(db,'.info/connected'),s=>{connected=s.val()===true;window.dispatchEvent(new CustomEvent('church-connection',{detail:connected}));});
export const watchAuth=cb=>onAuthStateChanged(auth,cb);
let accessPromise;
export function ensureAccess(){return accessPromise??=(async()=>{await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);return auth.currentUser;})().catch(e=>{accessPromise=null;throw e;});}
export function watchRecords(callback,onError){return onValue(ref(db,'church'),s=>{const v=s.val()||{};callback({students:Object.values(v.students||{}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),attendance:Object.values(v.attendance||{}).sort((a,b)=>b.date.localeCompare(a.date)),entries:Object.values(v.entries||{}).sort((a,b)=>b.date.localeCompare(a.date)),groups:Object.values(v.groups||{}),members:Object.entries(v.members||{}).map(([id,m])=>({...m,id})).filter(m=>!m.merged_into)});},onError);}
const text=(s,max=150)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export async function saveRecord(b){
 if(!auth.currentUser)throw Error('A conexão automática ainda não foi concluída. Aguarde e tente novamente.');
 if(!connected)throw Error('Sem conexão com o Firebase. Reconecte e tente salvar novamente.');
 const updates={};const uid=()=>push(ref(db,'church/students')).key;
 if(b.action==='group'&&text(b.name)){const name=b.name.trim(),key=Array.from(new TextEncoder().encode(name.toLocaleLowerCase('pt-BR'))).map(x=>x.toString(16).padStart(2,'0')).join('');updates['groups/'+key]={name};}
 else if(b.action==='student'&&text(b.group)){
  const current=(await get(ref(db,'church'))).val()||{},group=b.group.trim();
  if(Object.values(current.groups||{}).some(g=>g.name===group&&g.deleted))throw Error('Este grupo foi excluído. Selecione outro grupo.');
  const id=uid();let memberId,name;
  if(b.memberId){
   const member=resolveMember(current,b.memberId);memberId=member.id;name=member.name||'Membro sem nome';
   if(Object.values(current.students||{}).some(s=>(s.member_id||'legacy_'+s.id)===memberId&&s.group_name===group&&s.active))throw Error('Este membro já participa deste grupo.');
   if(!current.members?.[memberId])updates['members/'+memberId]={id:memberId,name:member.name||''};
   for(const student of Object.values(current.students||{}))if(!student.member_id&&'legacy_'+student.id===memberId)updates['students/'+student.id+'/member_id']=memberId;
  }else{
   if(b.name!=null&&(typeof b.name!=='string'||b.name.length>150))throw Error('Nome inválido.');
   memberId=uid();name=(b.name||'').trim();updates['members/'+memberId]={id:memberId,name};
  }
  updates['students/'+id]={id,name:name||'Membro sem nome',group_name:group,active:1,member_id:memberId};
 }
 else if(b.action==='member'){
  const current=(await get(ref(db,'church'))).val()||{};
  const id=b.id?resolveMember(current,b.id).id:uid();
  const fields=['name','birthDate','sex','maritalStatus','profession','neighborhood','street','number','city','phone','email','photo','baptismChurch','baptismDate','baptismPastor','admissionType','admissionDate','congregation','churchRole','ministry','churchNotes'];
  if(!b.profile||typeof b.profile!=='object')throw Error('Cadastro inválido.');
  for(const field of fields){if(!Object.prototype.hasOwnProperty.call(b.profile,field))continue;const value=b.profile[field]??'';const max=field==='photo'?650000:field==='churchNotes'?2000:field==='email'?254:150;
   if(typeof value!=='string'||value.length>max)throw Error(field==='photo'?'A foto ficou muito grande. Escolha outra imagem.':'Confira os dados preenchidos.');
   if(['birthDate','baptismDate','admissionDate'].includes(field)&&value&&(!date(value)||value>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})))throw Error('Confira as datas: informe uma data válida, até o dia de hoje.');
   if(field==='photo'&&value&&!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value))throw Error('Foto inválida.');
   if(field==='sex'&&value&&!['M','F'].includes(value))throw Error('Sexo inválido.');
   updates['members/'+id+'/'+field]=value.trim();
  }
  updates['members/'+id+'/id']=id;
  for(const student of Object.values(current.students||{}))if((student.member_id||'legacy_'+student.id)===id){
   updates['students/'+student.id+'/member_id']=id;
   updates['students/'+student.id+'/name']=(b.profile.name||'').trim()||'Membro sem nome';
  }
 }
 else if(b.action==='linkMember'){
  const current=(await get(ref(db,'church'))).val()||{},source=resolveMember(current,b.source),target=resolveMember(current,b.target);
  if(source.id===target.id)throw Error('Selecione outro cadastro.');
  if(!current.members?.[target.id])updates['members/'+target.id]={id:target.id,name:target.name||''};
  for(const student of Object.values(current.students||{}))if([source.id,target.id].includes(student.member_id||'legacy_'+student.id)){
   updates['students/'+student.id+'/member_id']=target.id;
   updates['students/'+student.id+'/name']=target.name||'Membro sem nome';
  }
  // Conserva os dados anteriores para recuperação, sem duplicar a lista de membros.
  updates['members/'+source.id+'/merged_into']=target.id;
 }
 else if(b.action==='deleteGroup'&&text(b.name)){
  const current=(await get(ref(db,'church'))).val()||{},name=b.name.trim();
  if(Object.values(current.students||{}).some(s=>s.group_name===name&&s.active))throw Error('Remova os membros ativos do grupo antes de excluí-lo. Os históricos serão preservados.');
  const key=Array.from(new TextEncoder().encode(name.toLocaleLowerCase('pt-BR'))).map(x=>x.toString(16).padStart(2,'0')).join('');
  updates['groups/'+key]={name,deleted:true};
 }
 else if(b.action==='archive'&&text(b.id)){updates['students/'+b.id+'/active']=0;}
 else if(b.action==='attendance'&&date(b.date)&&Array.isArray(b.marks)&&b.marks.length<=500){for(const m of b.marks){if(!text(m.id)||!['present','absent','clear'].includes(m.status))throw Error('Chamada inválida.');const base='attendance/'+m.id+'_'+b.date;updates[base+'/student_id']=m.id;updates[base+'/date']=b.date;updates[base+'/status']=m.status==='clear'?'unmarked':m.status;}}
 else if(b.action==='note'&&text(b.id)&&date(b.date)&&typeof b.note==='string'&&b.note.length<=2000){const base='attendance/'+b.id+'_'+b.date;updates[base+'/student_id']=b.id;updates[base+'/date']=b.date;updates[base+'/note']=b.note;}
 else if(b.action==='entry'&&text(b.description)&&text(b.category)&&date(b.date)&&['income','expense'].includes(b.type)&&Number.isSafeInteger(b.cents)&&b.cents>0&&b.cents<=999999999){const id=uid();updates['entries/'+id]={id,date:b.date,description:b.description.trim(),category:b.category.trim(),type:b.type,cents:b.cents};}
 else if(b.action==='deleteEntry'&&text(b.id)){updates['entries/'+b.id]=null;}
 else throw Error('Confira os campos preenchidos.');
 await update(ref(db,'church'),updates);
}

function resolveMember(current,id){
 if(typeof id!=='string'||!id||/[.#$\[\]\/]/.test(id))throw Error('Cadastro inválido.');
 const member=current.members?.[id];
 if(member&&!member.merged_into)return {...member,id};
 const student=Object.values(current.students||{}).find(s=>(s.member_id||'legacy_'+s.id)===id);
 if(student&&!member?.merged_into)return {id,name:student.name};
 throw Error('Cadastro não encontrado ou já vinculado. Reabra a lista.');
}
