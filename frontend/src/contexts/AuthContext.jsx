
import React, { createContext, useState } from 'react';
import axios from 'axios';
import httpStatus from 'http-status';
import { useNavigate } from 'react-router-dom';

// Replace with your actual backend server URL
export const server = "https://vchat-rp52.onrender.com";

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState({});
    const router = useNavigate();

    // Axios client
    const client = axios.create({
        baseURL: `${server}/auth`,
    });

    // Registration
    const handlerRegister = async (name, username, password) => {
        try {
            const response = await client.post('/registry', { name, username, password });
            if (response.status === httpStatus.CREATED) return response.data;
        } catch (err) {
            if (err.response?.status === httpStatus.CONFLICT) {
                throw new Error(err.response.data);
            }
            throw err;
        }
    };

    // Login
    const handleLogin = async (username, password) => {
        try {
            const response = await client.post('/login', { username, password });
            if (response.status === 200) {
                window.localStorage.setItem("token", response.data.token);
                router("/home");
                return "Login Successful";
            }
        } catch (err) {
            if (err.response?.data?.error) return Promise.reject(err.response.data.error);
            return Promise.reject("An unexpected error occurred");
        }
    };

    // Get user history
    const getHistoryOfUser = async () => {
        const token = localStorage.getItem("token");
        if (!token) return [];
        try {
            const res = await fetch(`${server}/auth/getUserHistory?token=${token}`);
            const data = await res.json();
            return data;
        } catch (err) {
            console.error("Failed to fetch history:", err);
            return [];
        }
    };

    // Add meeting code to user history
    const addToUserHistory = async (meetingCode) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            await fetch(`${server}/auth/addUserHistory`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, meeting_code: meetingCode })
            });
        } catch (err) {
            console.error("Failed to add to history:", err);
        }
    };

    const contextData = {
        userData,
        setUserData,
        handlerRegister,
        handleLogin,
        getHistoryOfUser,
        addToUserHistory,
    };

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};