import React from 'react';
import "../App.css";
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const router = useNavigate();
    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <h2>VCHat</h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => router(`server/auth`)}>Register</p>
                    <p onClick={() => router("/auth")}>Login</p>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="landingText">
                    <h1><span className="highlight">Connect</span> with Your Loved Ones</h1>
                    <h4>Cover a distance by VCHat</h4>
                    <div role='button' className="getStartedBtn">
                        <Link to={"/auth"}>Get Started</Link>
                    </div>
                </div>
                <div className="landingImage">
                    <img src="/mobile.png" alt="VCHat Mobile App" />
                </div>
            </div>
        </div>
    );
}
