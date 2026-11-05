import { getStore } from '@netlify/blobs';
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const respond = (statusCode,value)=>({statusCode,headers,body:JSON.stringify(value)});
export async function handler(event){
 try {
  const store=getStore('fish-party-rsvps');
  if(event.httpMethod==='POST'){
   let data; try{data=JSON.parse(event.body||'{}')}catch{return respond(400,{error:'Invalid JSON'})}
   const {id,vote}=data, name=typeof data.name==='string'?data.name.trim().slice(0,40):'';
   if(!/^[a-f0-9-]{36}$/i.test(id||'')||!name||!['yes','no'].includes(vote))return respond(400,{error:'Invalid RSVP'});
   await store.set('guest-'+id,JSON.stringify({name,vote}));
   return respond(200,{ok:true});
  }
  if(event.httpMethod==='GET'){
   const items=[];let cursor;
   do{
    const page=await store.list({prefix:'guest-',...(cursor?{cursor}:{})});
    const batch=await Promise.all(page.blobs.map(async ({key})=>{try{return await store.get(key,{type:'json'})}catch{return null}}));
    items.push(...batch.filter(x=>x&&typeof x.name==='string'&&['yes','no'].includes(x.vote)));
    cursor=page.cursor;
   }while(cursor);
   return respond(200,items);
  }
  return respond(405,{error:'Method not allowed'});
 }catch(err){console.error(err);return respond(500,{error:'RSVP service unavailable'})}
}