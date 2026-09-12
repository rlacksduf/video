import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
export default function Login({setUser}){const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),nav=useNavigate();
 async function submit(e){e.preventDefault();setError('');if(!supabase)return setError('Supabase 설정이 필요합니다.');const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)return setError(error.message);setUser(data.user);nav('/')}
 return <Auth title="로그인" onSubmit={submit}><input placeholder="이메일" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><input placeholder="비밀번호" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary">로그인</button>{error&&<p className="error">{error}</p>}<p>계정이 없나요? <Link to="/signup">회원가입</Link></p></Auth>}
function Auth({title,onSubmit,children}){return <div className="auth"><form onSubmit={onSubmit} className="panel"><h1>{title}</h1>{children}</form></div>}
