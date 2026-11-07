import type { Metadata,Viewport } from 'next';
import './globals.css';
import './pinch.css';
import './kitchen.css';
export const metadata: Metadata={title:'MejaFlow — Café workspace',description:'Local café ordering simulation. No real payments.'};
export const viewport: Viewport={width:'device-width',initialScale:1,maximumScale:1,userScalable:false};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
