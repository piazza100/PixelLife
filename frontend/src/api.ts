export type ApiBoard = {
  id:number; name:string; boardType:'LEVEL'|'CHECK'|'MOOD'; color:string; startDate:string;
  rewardSpeciesCode:string; rewardSpeciesName:string; rewardSpeciesSymbol:string; rewardColorCode:string;
  goalDays:number|null; endedAt:string|null; status:'ACTIVE'|'COMPLETED'; finalScore:number|null; xpAwarded:number; createdAt:string
}
export type ApiEntry = {entryDate:string;numericValue:number|null;success:boolean|null;emoji:string|null;note:string|null}
export type BoardDetail = {board:ApiBoard;entries:ApiEntry[]}

export type RewardPlant = {id:number;speciesCode:string;speciesName:string;symbol:string;colorCode:string;cssColor:string;mapX:number;mapY:number;earnedAt:string;boardId:number;boardName:string;xpAwarded:number}
export type RewardBadge = {code:string;name:string;description:string;earned:boolean|number;currentValue:number;targetValue:number;unlockColor:string}
export type RewardSpecies = {code:string;name:string;symbol:string;weightValue:number;chance:number}
export type RewardColor = {code:string;cssColor:string;sortOrder:number}
export type RewardGrade = {code:string;xp:number;species:number}
export type RewardData = {totalXp:number;gradeCode:string;badges:RewardBadge[];plants:RewardPlant[];speciesPool:RewardSpecies[];unlockedColors:RewardColor[];gradeGuide:RewardGrade[]}

export type Member = {id:number;email:string;displayName?:string|null;avatarUrl?:string|null;effectivePlan:'FREE'|'PLUS';activeBoardLimit:3|10;paidUntil?:string|null}
export type TestUser = {id:number;email:string;displayName:string;plan:'FREE'|'PLUS';paidUntil:string|null;totalXp:number;gradeCode:string;createdAt:string}
export type TestBoard = {id:number;name:string;type:'LEVEL'|'CHECK'|'MOOD';status:'ACTIVE'|'COMPLETED';startDate:string;endDate:string|null;goalDays:number|null;recordCount:number}

let csrfToken=''
// Web and API always share the browser origin. Vite proxies locally and
// Cloudflare Pages Functions proxies deployed requests to Render.
const API_ORIGIN=''
export class ApiError extends Error { constructor(message:string,public status:number,public code?:string){super(message)} }
const timeoutSignal=()=>AbortSignal.timeout(15_000)
const bootstrapTimeoutSignal=()=>AbortSignal.timeout(30_000)
async function ensureCsrf(){
  if(csrfToken)return csrfToken
  let response:Response
  try{response=await fetch(`${API_ORIGIN}/api/csrf`,{credentials:'include',signal:timeoutSignal()})}
  catch(error){throw new ApiError(error instanceof DOMException&&error.name==='TimeoutError'?'Request timed out':'Could not reach the API',0,error instanceof DOMException&&error.name==='TimeoutError'?'TIMEOUT':'NETWORK')}
  if(!response.ok)throw new Error('Sign in first')
  csrfToken=(await response.json()).token
  return csrfToken
}

async function request<T>(path:string,init?:RequestInit):Promise<T>{
  const method=(init?.method||'GET').toUpperCase()
  const token=['POST','PUT','PATCH','DELETE'].includes(method)?await ensureCsrf():''
  let response:Response
  try{response=await fetch(`${API_ORIGIN}/api${path}`,{...init,signal:init?.signal||timeoutSignal(),credentials:'include',headers:{'Content-Type':'application/json',...(token?{'X-XSRF-TOKEN':token}:{}),...init?.headers}})}
  catch(error){throw new ApiError(error instanceof DOMException&&error.name==='TimeoutError'?'Request timed out':'Could not reach the API',0,error instanceof DOMException&&error.name==='TimeoutError'?'TIMEOUT':'NETWORK')}
  if(!response.ok){const error=await response.json().catch(()=>({message:'Request failed'}));if(response.status===401)csrfToken='';throw new ApiError(error.message||'Request failed',response.status,error.code)}
  if(response.status!==204&&!response.headers.get('content-type')?.includes('application/json'))throw new ApiError('The API returned a non-JSON response',502,'INVALID_RESPONSE')
  return response.status===204?undefined as T:response.json()
}

export const pixelLifeApi={
  me:(locale='en')=>request<Member>(`/me?locale=${locale}`),
  bootstrap:(locale='en')=>request<{member:Member;boards:ApiBoard[];entries?:Array<ApiEntry&{boardId:number}>;rewards?:RewardData}>(`/bootstrap?locale=${locale}`,{signal:bootstrapTimeoutSignal()}),
  entries:()=>request<Array<ApiEntry&{boardId:number}>>('/entries'),
  createBoard:(body:{name:string;type:'LEVEL'|'CHECK'|'MOOD';startDate:string;goalDays:number|null})=>request<ApiBoard>('/boards',{method:'POST',body:JSON.stringify(body)}),
  importGuestBoard:(body:{name:string;type:'LEVEL'|'CHECK'|'MOOD';startDate:string;goalDays:number|null;entries:Array<{date:string;value?:number;success?:boolean;emoji?:string;note?:string}>})=>request<ApiBoard>('/boards/import',{method:'POST',body:JSON.stringify(body)}),
  getBoard:(id:number)=>request<BoardDetail>(`/boards/${id}`),
  saveEntry:(id:number,date:string,body:{value?:number;success?:boolean;emoji?:string;note?:string})=>request<void>(`/boards/${id}/entries/${date}`,{method:'PUT',body:JSON.stringify(body)}),
  resetToday:(id:number,date:string)=>request<void>(`/boards/${id}/entries/${date}`,{method:'DELETE'}),
  deleteBoard:(id:number)=>request<void>(`/boards/${id}`,{method:'DELETE'}),
  completeBoard:(id:number,date:string)=>request<{score:number;xp:number;grade:string;species:unknown;color:unknown}>(`/boards/${id}/complete?date=${date}`,{method:'POST'}),
  rewards:()=>request<RewardData>('/rewards')
  ,createPlusCheckout:()=>request<{url:string}>('/billing/checkout',{method:'POST'})
  ,createCustomerPortal:()=>request<{url:string}>('/billing/portal',{method:'POST'})
  ,deleteAccount:()=>request<void>('/me',{method:'DELETE'})
  ,testUsers:()=>request<TestUser[]>('/test/users')
  ,testUserBoards:(userId:number)=>request<TestBoard[]>(`/test/users/${userId}/boards`)
  ,testCreateBoard:(userId:number,body:{name:string;type:'LEVEL'|'CHECK'|'MOOD';startDate:string;goalDays:number|null})=>request<TestBoard>(`/test/users/${userId}/boards`,{method:'POST',body:JSON.stringify(body)})
  ,testFillBoard:(userId:number,boardId:number,query:string)=>request<{saved:number;from:string;to:string}>(`/test/users/${userId}/boards/${boardId}/fill?${query}`,{method:'POST'})
}

export const authLinks={google:`${API_ORIGIN}/oauth2/authorization/google`,logout:`${API_ORIGIN}/logout`}
