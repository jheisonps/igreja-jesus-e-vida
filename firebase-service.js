import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {getDatabase,ref,onValue,update,push} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js';
const app=initializeApp(window.FIREBASE_CONFIG),auth=getAuth(app),db=getDatabase(app);
let connected=false;
onValue(ref(db,'.info/connected'),s=>{connected=s.val()===true;window.dispatchEvent(new CustomEvent('church-connection',{detail:connected}));});
export const watchAuth=cb=>onAuthStateChanged(auth,cb);
let accessPromise;
export function ensureAccess(){return accessPromise??=(async()=>{await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);return auth.currentUser;})().catch(e=>{accessPromise=null;throw e;});}
export function watchRecords(callback,onError){return onValue(ref(db,'church'),s=>{const v=s.val()||{};callback({students:Object.values(v.students||{}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),attendance:Object.values(v.attendance||{}).sort((a,b)=>b.date.localeCompare(a.date)),entries:Object.values(v.entries||{}).sort((a,b)=>b.date.localeCompare(a.date)),groups:Object.values(v.groups||{})});},onError);}
const text=(s,max=150)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export async function saveRecord(b){
 if(!auth.currentUser)throw Error('A conexão automática ainda não foi concluída. Aguarde e tente novamente.');
 if(!connected)throw Error('Sem conexão com o Firebase. Reconecte e tente salvar novamente.');
 const updates={};const uid=()=>push(ref(db,'church/students')).key;
 if(b.action==='group'&&text(b.name)){const name=b.name.trim(),key=Array.from(new TextEncoder().encode(name.toLocaleLowerCase('pt-BR'))).map(x=>x.toString(16).padStart(2,'0')).join('');updates['groups/'+key]={name};}
 else if(b.action==='student'&&text(b.name)&&text(b.group)){const id=uid();updates['students/'+id]={id,name:b.name.trim(),group_name:b.group.trim(),active:1};}
 else if(b.action==='archive'&&text(b.id)){updates['students/'+b.id+'/active']=0;}
 else if(b.action==='attendance'&&date(b.date)&&Array.isArray(b.marks)&&b.marks.length<=500){for(const m of b.marks){if(!text(m.id)||!['present','absent','clear'].includes(m.status))throw Error('Chamada inválida.');const base='attendance/'+m.id+'_'+b.date;updates[base+'/student_id']=m.id;updates[base+'/date']=b.date;updates[base+'/status']=m.status==='clear'?'unmarked':m.status;}}
 else if(b.action==='note'&&text(b.id)&&date(b.date)&&typeof b.note==='string'&&b.note.length<=2000){const base='attendance/'+b.id+'_'+b.date;updates[base+'/student_id']=b.id;updates[base+'/date']=b.date;updates[base+'/note']=b.note;}
 else if(b.action==='entry'&&text(b.description)&&text(b.category)&&date(b.date)&&['income','expense'].includes(b.type)&&Number.isSafeInteger(b.cents)&&b.cents>0&&b.cents<=999999999){const id=uid();updates['entries/'+id]={id,date:b.date,description:b.description.trim(),category:b.category.trim(),type:b.type,cents:b.cents};}
 else if(b.action==='deleteEntry'&&text(b.id)){updates['entries/'+b.id]=null;}
 else throw Error('Confira os campos preenchidos.');
 await update(ref(db,'church'),updates);
}
