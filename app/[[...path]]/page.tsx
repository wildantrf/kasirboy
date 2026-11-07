import Home from '@/components/home';
import MejaFlow from '@/components/mejaflow';

export default async function Page({params}:{params:Promise<{path?:string[]}>}){
 const {path=[]}=await params;
 return path.length===0?<Home/>:<MejaFlow/>;
}
