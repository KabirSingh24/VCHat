import React from 'react';
import {useNavigate} from "react-router-dom";
import { useEffect } from 'react';

const withAuth=(WrrapedComponent)=> {
    const AuthComponent=(props)=>{
        const router=useNavigate();

        const isAuthenticated=()=>{
            if(localStorage.getItem("token")){
                return true;
            }else{
                return false;
            }
        };

        useEffect(()=>{
            if(!isAuthenticated()){
                router("/auth");
            }
        },[]);

        return <WrrapedComponent {...props} />
    }
  return AuthComponent;
}

export default withAuth;
