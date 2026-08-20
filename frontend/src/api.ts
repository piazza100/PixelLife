export type ApiBoard = {
  id:number; name:string; boardType:'LEVEL'|'CHECK'|'MOOD'; color:string; startDate:string;
  goalDays:number|null; endedAt:string|null; status:'ACTIVE'|'COMPLETED'; finalScore:number|null; xpAwarded:number
}
export type ApiEntry = {entryDate:string;numericValue:number|null;success:boolean|null;emoji:string|null;note:string|null}
export type BoardDetail = {board:ApiBoard;entries:ApiEntry[]}

export type RewardPlant = {id:number;speciesCode:string;speciesName:string;symbol:string;colorCode:string;cssColor:string;mapX:number;mapY:number;earnedAt:string;boardId:number;boardName:string;score:number}
export type RewardBadge = {code:string;name:string;description:string;earned:boolean|number;currentValue:number;targetValue:number;unlockColor:string}
export type RewardSpecies = {code:string;name:string;symbol:string;weightValue:number;chance:number}
export type RewardColor = {code:string;cssColor:string;sortOrder:number}
export type RewardGrade = {code:string;xp:number;species:number}
export type RewardData = {totalXp:number;gradeCode:string;badges:RewardBadge[];plants:RewardPlant[];speciesPool:RewardSpecies[];unlockedColors:RewardColor[];gradeGuide:RewardGrade[]}

export type Member = {id:number;email:string;displayName:string;avatarUrl?:string;effectivePlan:'FREE'|'PLUS';activeBoardLimit:1|30;writableBoardId:number|null}

let csrfToken=''
const API_ORIGIN=(import.meta.env.VITE_API_BASE_URL||'').replace(/\/$/,'')
export class ApiError extends Error { constructor(message:string,public status:number,public code?:string){super(message)} }
async function ensureCsrf(){
  if(csrfToken)return csrfToken
  const response=await fetch(`${API_ORIGIN}/api/csrf`,{credentials:'include'})
  if(!response.ok)throw new Error('Sign in first')
  csrfToken=(await response.json()).token
  return csrfToken
}

async function request<T>(path:string,init?:RequestInit):Promise<T>{
  const method=(init?.method||'GET').toUpperCase()
  const token=['POST','PUT','PATCH','DELETE'].includes(method)?await ensureCsrf():''
  const response=await fetch(`${API_ORIGIN}/api${path}`,{...init,credentials:'include',headers:{'Content-Type':'application/json',...(token?{'X-XSRF-TOKEN':token}:{}),...init?.headers}})
  if(!response.ok){const error=await response.json().catch(()=>({message:'Request failed'}));if(response.status===401)csrfToken='';throw new ApiError(error.message||'Request failed',response.status,error.code)}
  return response.status===204?undefined as T:response.json()
}

export const pixelLifeApi={
  me:(locale='en')=>request<Member>(`/me?locale=${locale}`),
  bootstrap:(locale='en')=>request<{boards:ApiBoard[];rewards:RewardData}>(`/bootstrap?locale=${locale}`),
  createBoard:(body:{name:string;type:'LEVEL'|'CHECK'|'MOOD';startDate:string;goalDays:number|null})=>request<ApiBoard>('/boards',{method:'POST',body:JSON.stringify(body)}),
  importGuestBoard:(body:{name:string;type:'LEVEL'|'CHECK'|'MOOD';startDate:string;goalDays:number|null;entries:Array<{date:string;value?:number;success?:boolean;emoji?:string;note?:string}>})=>request<ApiBoard>('/boards/import',{method:'POST',body:JSON.stringify(body)}),
  getBoard:(id:number)=>request<BoardDetail>(`/boards/${id}`),
  saveEntry:(id:number,date:string,body:{value?:number;success?:boolean;emoji?:string;note?:string})=>request<void>(`/boards/${id}/entries/${date}`,{method:'PUT',body:JSON.stringify(body)}),
  resetToday:(id:number,date:string)=>request<void>(`/boards/${id}/entries/${date}`,{method:'DELETE'}),
  completeBoard:(id:number)=>request<{score:number;xp:number;grade:string;species:unknown;color:unknown}>(`/boards/${id}/complete`,{method:'POST'}),
  rewards:()=>request<RewardData>('/rewards')
  ,createPlusCheckout:()=>request<{url:string}>('/billing/checkout',{method:'POST'})
  ,createCustomerPortal:()=>request<{url:string}>('/billing/portal',{method:'POST'})
  ,deleteAccount:()=>request<void>('/me',{method:'DELETE'})
}

export const authLinks={google:`${API_ORIGIN}/oauth2/authorization/google`,logout:`${API_ORIGIN}/logout`}
