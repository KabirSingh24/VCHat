import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import React from "react";
import server from "../enviroment";



export const AuthContext = React.createContext({});

const client = axios.create({
    baseURL: `${server}/auth`,
});

export const AuthProvider = ({ children }) => {
    const authContext = useContext(AuthContext);

    const { userData, setUserData } = useState(authContext);

    const router = useNavigate();

    const handlerRegister = async (name, username, password) => {
        try {
            let request = await client.post('/registry', {
                name: name,
                username: username,
                password: password,
            });
            if (request.status === httpStatus.CREATED) {
                return request.data;
            }
        } catch (err) {
            if (err.response?.status === httpStatus.CONFLICT) {
                throw new Error(err.response.data); // throw it as an Error
            }
            throw err;
        }
    }


    const handleLogin = async (username, password) => {
        try {
            let request = await client.post('/login', {
                username: username,
                password: password,
            });

            if (request.status === 200) {
                window.localStorage.setItem("token", request.data.token);
                router("/home");
                return "Login Successful";
            }
        } catch (error) {
            if (error.response && error.response.data && error.response.data.error) {
                return Promise.reject(error.response.data.error);
            } else {
                return Promise.reject("An unexpected error occurred");
            }
        }
    }
    // const getHistoryOfUser = async () => {
    //     const token = localStorage.getItem("token");
    //     const res = await fetch(`${server}/auth/getUserHistory`);
    //     const data = await res.json();
    //     console.log(data);
    // };
    const getHistoryOfUser = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch(`${server}/auth/getUserHistory?token=${token}`);
        const data = await res.json();
        console.log(data);
    };

    // const addToUserHistory = async (meetingCode) => {
    //     const token = localStorage.getItem("token");
    //     await fetch(`${server}/auth/addUserHistory`, {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ token, meeting_code: meetingCode })
    //     });
    // };

    const addToUserHistory = async (meetingCode) => {
        const token = localStorage.getItem("token");
        await fetch(`${server}/auth/addUserHistory`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, meeting_code: meetingCode })
        });
    };


    const data = {
        userData, setUserData, handlerRegister, handleLogin, addToUserHistory, getHistoryOfUser
    }
    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    )
}