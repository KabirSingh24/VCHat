import React from 'react'
import "../App.css";
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const router=useNavigate();
  return (
    <div className='landingPageContainer'>
        <nav>
            <div className='navHeader'>
                <h2>VCHat</h2>
            </div>
            <div className='navlist'>
                <p onClick={()=>{
                    router("/qseref")
                }}>Join as Guest</p>
                <p onClick={()=>{router("/auth")}}>Register</p>
                <div role='button'>
                    <p onClick={()=>{router("/auth")}}>Login</p>
                </div>
            </div>
        </nav>



        <div className="landingMainContainer">
            <div>
                <h1><span style={{color:"#FF9839"}}>Connect</span> with Your Loved Ones</h1>
                <h4>Cover a distance by VCHat</h4>
                <div role='button'>
                    <Link to={"/auth"}>Get Started</Link>
                </div>
            </div>
            <div>
                <img src="/mobile.png" alt="" />
            </div>
        </div>
    </div>
  );
}

