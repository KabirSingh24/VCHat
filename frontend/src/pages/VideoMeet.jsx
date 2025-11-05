// import React, { useEffect, useRef, useState } from 'react';
// import { Badge, IconButton, TextField, Button } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff';
// import CallEndIcon from '@mui/icons-material/CallEnd';
// import MicIcon from '@mui/icons-material/Mic';
// import MicOffIcon from '@mui/icons-material/MicOff';
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
// import ChatIcon from '@mui/icons-material/Chat';
// import SockJS from 'sockjs-client';
// import styles from "../styles/videoComponent.module.css";
// import server from "../enviroment";
// import { useNavigate } from 'react-router-dom';

// const server_url = server;
// var connections = {};
// const peerConfigConnections = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

// export default function VideoMeetComponent() {
//   const router=useNavigate();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(String(Date.now()) + Math.floor(Math.random() * 10000));
//   // separate refs: lobby preview and in-call local video
//   const localVideoLobbyRef = useRef(null);
//   const localVideoRef = useRef(null);

//   const [videoAvailable, setVideoAvailable] = useState(false);
//   const [audioAvailable, setAudioAvailable] = useState(false);
//   const [video, setVideo] = useState(true); // user wants camera on/off
//   const [audio, setAudio] = useState(true); // user wants mic on/off
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [showModal, setModal] = useState(true);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [askForUsername, setAskForUsername] = useState(true);
//   const [username, setUsername] = useState("");
//   const [videos, setVideos] = useState([]);

//   useEffect(() => {
//     checkDeviceCapabilities();
//     // cleanup on unmount
//     return () => {
//       try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }
//       Object.values(connections).forEach(pc => {
//         try { pc.close(); } catch (e) { }
//       });
//       connections = {};
//     };
//   }, []);

//   useEffect(() => {
//     // when screen state becomes true, start share; when false, restore camera/mic
//     if (screen) {
//       startScreenShare();
//     } else {
//       // restore camera/mic if previously available
//       updateLocalStream({ useCamera: video, useMic: audio }).catch(() => { });
//     }
//   }, [screen]);

//   // ensure UI video elements get the current local stream if it changes
//   useEffect(() => {
//     if (window.localStream) {
//       if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = window.localStream;
//       if (localVideoRef.current) localVideoRef.current.srcObject = window.localStream;
//     }
//   }, [localVideoLobbyRef.current, localVideoRef.current]); // run when refs become available

//   // ---------- Device capability check ----------
//   useEffect(() => {
//     const setupLobbyPreview = async () => {
//       try {
//         const devices = await navigator.mediaDevices.enumerateDevices();
//         setVideoAvailable(devices.some(d => d.kind === "videoinput"));
//         setAudioAvailable(devices.some(d => d.kind === "audioinput"));
//         setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

//         // 🔥 start local camera preview for lobby
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//           audio: false, // don’t ask for mic yet
//         });

//         window.localStream = stream;

//         if (localVideoLobbyRef.current) {
//           localVideoLobbyRef.current.srcObject = stream;
//         }
//       } catch (err) {
//         console.error("Error starting lobby preview:", err);
//       }
//     };

//     setupLobbyPreview();

//     // cleanup when component unmounts
//     return () => {
//       try {
//         window.localStream?.getTracks().forEach((t) => t.stop());
//       } catch (e) { }
//       Object.values(connections).forEach((pc) => {
//         try {
//           pc.close();
//         } catch (e) { }
//       });
//       connections = {};
//     };
//   }, []);


//   const checkDeviceCapabilities = async () => {
//     try {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       setVideoAvailable(devices.some(d => d.kind === 'videoinput'));
//       setAudioAvailable(devices.some(d => d.kind === 'audioinput'));
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//     } catch (e) {
//       console.log("Error enumerating devices:", e);
//     }
//   };

//   // ---------- update local stream (camera/mic) ----------
//   // accepts options so it doesn't rely on stale state
//   const updateLocalStream = async ({ useCamera = true, useMic = true } = {}) => {
//     // get new stream (camera or black+silence)
//     let newStream;
//     try {
//       if (useCamera || useMic) {
//         newStream = await navigator.mediaDevices.getUserMedia({
//           video: useCamera && videoAvailable ? true : false,
//           audio: useMic && audioAvailable ? true : false
//         });
//       } else {
//         // create silent/black stream
//         newStream = new MediaStream([black(), silence()]);
//       }
//     } catch (err) {
//       console.log("getUserMedia failed, falling back to black/silence:", err);
//       newStream = new MediaStream([black(), silence()]);
//     }

//     // stop old tracks
//     try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }

//     window.localStream = newStream;
//     // attach to both lobby preview and in-call local video (if present)
//     if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = newStream;
//     if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

//     // replace tracks on every peer connection (if RTCRtpSender supports replaceTrack)
//     Object.values(connections).forEach(pc => {
//       try {
//         const senders = pc.getSenders ? pc.getSenders() : [];
//         // replace video
//         if (useCamera && newStream.getVideoTracks()[0]) {
//           const videoSender = senders.find(s => s.track && s.track.kind === 'video');
//           if (videoSender && videoSender.replaceTrack) {
//             videoSender.replaceTrack(newStream.getVideoTracks()[0]);
//           } else if (pc.addTrack) {
//             pc.addTrack(newStream.getVideoTracks()[0], newStream);
//           }
//         } else {
//           // disable video sender if exists
//           const videoSender = senders.find(s => s.track && s.track.kind === 'video');
//           if (videoSender && videoSender.replaceTrack) {
//             try { videoSender.replaceTrack(null); } catch (e) { /* some browsers */ }
//           }
//         }

//         // replace audio
//         if (useMic && newStream.getAudioTracks()[0]) {
//           const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
//           if (audioSender && audioSender.replaceTrack) {
//             audioSender.replaceTrack(newStream.getAudioTracks()[0]);
//           } else if (pc.addTrack) {
//             pc.addTrack(newStream.getAudioTracks()[0], newStream);
//           }
//         } else {
//           const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
//           if (audioSender && audioSender.replaceTrack) {
//             try { audioSender.replaceTrack(null); } catch (e) { /* ignore */ }
//           }
//         }
//       } catch (e) {
//         console.log("Error replacing tracks on peer:", e);
//       }
//     });
//   };

//   // ---------- screen share flow ----------
//   const startScreenShare = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
//       // stop old and set new
//       try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }
//       window.localStream = stream;
//       if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = stream;
//       if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//       // add to peers
//       Object.values(connections).forEach(pc => {
//         try {
//           // add tracks
//           stream.getTracks().forEach(track => pc.addTrack(track, stream));
//           // renegotiate
//           pc.createOffer().then(desc => pc.setLocalDescription(desc)).then(() => {
//             sendSignal(pc.remoteId, { sdp: pc.localDescription });
//           }).catch(e => console.log("Offer/renegotiate error:", e));
//         } catch (e) { console.log(e); }
//       });

//       // when user stops screen share, restore camera/mic
//       stream.getTracks().forEach(track => track.onended = () => {
//         setScreen(false);
//         updateLocalStream({ useCamera: video, useMic: audio }).catch(() => { });
//       });
//     } catch (err) {
//       console.log("Screen share canceled or denied:", err);
//       setScreen(false); // make sure UI stays consistent
//     }
//   };

//   // ---------- helpers for silence / black ----------
//   let silence = () => {
//     let ctx = new (window.AudioContext || window.webkitAudioContext)();
//     let oscillator = ctx.createOscillator();
//     let dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     ctx.resume();
//     const track = dst.stream.getAudioTracks()[0];
//     // make sure it's disabled by default
//     try { track.enabled = false; } catch (e) { }
//     return track;
//   };
//   let black = ({ width = 640, height = 480 } = {}) => {
//     let canvas = Object.assign(document.createElement("canvas"), { width, height });
//     canvas.getContext('2d').fillRect(0, 0, width, height);
//     let stream = canvas.captureStream();
//     const track = stream.getVideoTracks()[0];
//     try { track.enabled = false; } catch (e) { }
//     return track;
//   };

//   // ---------- signaling helpers ----------
//   const sendSignal = (toId, data) => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "signal", toId, fromId: socketIdRef.current, data }));
//   };

//   const gotMessageFromServer = (fromId, message) => {
//     const signal = JSON.parse(message);
//     if (!connections[fromId]) {
//       const pc = new RTCPeerConnection(peerConfigConnections);
//       pc.remoteId = fromId;
//       pc.onicecandidate = event => {
//         if (event.candidate) sendSignal(fromId, { ice: event.candidate });
//       };
//       pc.ontrack = (evt) => {
//         // when remote track arrives set remote stream
//         addRemoteVideo(fromId, evt.streams && evt.streams[0] ? evt.streams[0] : new MediaStream(evt.track ? [evt.track] : []));
//       };
//       // add existing local tracks
//       try {
//         if (window.localStream) {
//           window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
//         }
//       } catch (e) { }
//       connections[fromId] = pc;
//     }
//     const pc = connections[fromId];

//     if (signal.sdp) {
//       pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
//         if (signal.sdp.type === "offer") {
//           return pc.createAnswer();
//         }
//       }).then(answerDesc => {
//         if (!answerDesc) return;
//         return pc.setLocalDescription(answerDesc).then(() => {
//           sendSignal(fromId, { sdp: pc.localDescription });
//         });
//       }).catch(e => console.log(e));
//     }

//     if (signal.ice) {
//       pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
//     }
//   };

//   const addRemoteVideo = (socketId, stream) => {
//     setVideos(prev => {
//       if (prev.find(v => v.socketId === socketId)) {
//         return prev.map(v => v.socketId === socketId ? { ...v, stream } : v);
//       } else {
//         return [...prev, { socketId, stream }];
//       }
//     });
//   };

//   // ---------- socket connect ----------
//   const connectToSocketServer = () => {
//     socketRef.current = new SockJS(`${server_url}/ws`);
//     socketRef.current.onopen = () => {
//       console.log(" Connected to WebSocket server");
//       socketRef.current.send(JSON.stringify({
//         type: "join-call",
//         roomId: window.location.href,
//         username,
//         clientId: socketIdRef.current
//       }));
//     };

//     socketRef.current.onmessage = (event) => {
//       const msg = JSON.parse(event.data);
//       switch (msg.type) {
//         case "signal":
//           gotMessageFromServer(msg.fromId, JSON.stringify(msg.data));
//           break;
//         case "user-joined":
//           handleUserJoined(msg.userId, msg.clients);
//           break;
//         case "user-left":
//           setVideos(v => v.filter(x => x.socketId !== msg.userId));
//           delete connections[msg.userId];
//           break;
//         case "chat-message":
//           addMessage(msg.data, msg.sender, msg.fromId);
//           break;
//         default:
//           console.log("Unknown message type:", msg.type);
//       }
//     };
//   };

//   const handleUserJoined = (userId, clients) => {
//     if (!clients || !Array.isArray(clients)) {
//       console.warn(" handleUserJoined called without valid clients list:", clients);
//       return;
//     }
//     clients.forEach(socketListId => {
//       if (socketListId === socketIdRef.current) return;
//       if (!connections[socketListId]) {
//         const pc = new RTCPeerConnection(peerConfigConnections);
//         pc.remoteId = socketListId;
//         pc.onicecandidate = event => {
//           if (event.candidate) {
//             socketRef.current.send(JSON.stringify({
//               type: "signal", toId: socketListId, fromId: socketIdRef.current, data: { ice: event.candidate }
//             }));
//           }
//         };
//         pc.ontrack = (evt) => addRemoteVideo(socketListId, evt.streams[0]);
//         try {
//           if (window.localStream) {
//             window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
//           } else {
//             // add fallback silent/black tracks so the connection has senders
//             const fakeStream = new MediaStream();
//             fakeStream.addTrack(black());
//             fakeStream.addTrack(silence());
//             pc.addTrack(fakeStream.getVideoTracks()[0], fakeStream);
//             pc.addTrack(fakeStream.getAudioTracks()[0], fakeStream);
//           }
//         } catch (e) { console.log(e); }
//         connections[socketListId] = pc;
//         // create offer
//         pc.createOffer().then(desc => pc.setLocalDescription(desc)).then(() => {
//           socketRef.current.send(JSON.stringify({
//             type: "signal",
//             toId: socketListId,
//             fromId: socketIdRef.current,
//             data: { sdp: pc.localDescription }
//           }));
//         }).catch(e => console.log(e));
//       }
//     });
//   };

//   // ---------- chat ----------
//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages(prev => [...prev, { sender, data }]);
//     if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
//   };
//   const sendMessage = () => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "chat-message", data: message, sender: username }));
//     setMessage("");
//   };

//   // ---------- UI handlers ----------
//   const handleVideo = () => {
//     const videoTrack = window.localStream?.getVideoTracks()[0];
//     if (videoTrack) {
//       const newState = !videoTrack.enabled;
//       videoTrack.enabled = newState;
//       setVideo(newState);
//     }
//   };

//   const handleAudio = () => {
//     const audioTrack = window.localStream?.getAudioTracks()[0];
//     if (audioTrack) {
//       const newState = !audioTrack.enabled;
//       audioTrack.enabled = newState;
//       setAudio(newState);
//     }
//   };
//   const handleScreenToggle = () => {
//     // toggle; effect will start or stop screen share
//     setScreen(prev => !prev);
//   };

//   const start = async () => {
//     setAskForUsername(false);
//     // ensure local stream is initialized before connecting to peers
//     try {
//       await updateLocalStream({ useCamera: video, useMic: audio });
//     } catch (e) { console.log(e); }
//     connectToSocketServer();
//   };

//   const handleEndCall = () => {
//     try { window.localStream.getTracks().forEach(track => track.stop()); } catch (e) { }
//     Object.values(connections).forEach(pc => { try { pc.close(); } catch (e) { } });
//     connections = {};
//     router ( "/home");
//   };

//   return (
//     <div>
//       {askForUsername ? (
//         <div>
//           <h2>Enter into Lobby </h2>
//           <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//           <Button variant="contained" onClick={start}>Connect</Button>
//           <div>
//             {/* lobby preview - uses separate ref */}
//             <video
//               ref={localVideoLobbyRef}
//               autoPlay
//               playsInline
//               muted
//               style={{ width: 320, height: 240, background: "black" }}
//             />
//           </div>
//         </div>
//       ) : (
//         <div className={styles.meetVideoContainer}>
//           {showModal ? <div className={styles.chatRoom}>
//             <div className={styles.chatContainer}>
//               <h1>Chat</h1>
//               <div className={styles.chattingDisplay}>
//                 {messages.length !== 0 ? messages.map((item, index) => (
//                   <div style={{ marginBottom: "20px" }} key={index}>
//                     <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                     <p>{item.data}</p>
//                   </div>
//                 )) : <p>No Messages Yet</p>}
//               </div>
//               <div className={styles.chattingArea}>
//                 <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
//                 <Button variant='contained' onClick={sendMessage}>Send</Button>
//               </div>
//             </div>
//           </div> : <></>}

//           <div className={styles.buttonContainers}>
//             <IconButton onClick={handleVideo} style={{ color: "white" }}>
//               {video ? <VideocamIcon /> : <VideocamOffIcon />}
//             </IconButton>

//             <IconButton onClick={handleEndCall} style={{ color: "red" }}>
//               <CallEndIcon />
//             </IconButton>

//             <IconButton onClick={handleAudio} style={{ color: "white" }}>
//               {audio ? <MicIcon /> : <MicOffIcon />}
//             </IconButton>

//             {screenAvailable ? (
//               <IconButton onClick={handleScreenToggle} style={{ color: "white" }}>
//                 {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
//               </IconButton>
//             ) : null}

//             <Badge badgeContent={newMessages} max={999} color='primary'>
//               <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
//                 <ChatIcon />
//               </IconButton>
//             </Badge>
//           </div>

//           {/* in-call local video uses its own ref */}
//           <video
//             className={styles.meetUserVideo}
//             ref={localVideoRef}
//             autoPlay
//             playsInline
//             muted
//             style={{ width: 320, height: 240 }}
//           />

//           <div className={styles.conferenceView}>
//             {videos.map((v) => (
//               <div key={v.socketId}>
//                 <video
//                   data-socket={v.socketId}
//                   ref={ref => {
//                     if (ref && v.stream) {
//                       ref.srcObject = v.stream;
//                     }
//                   }}
//                   autoPlay
//                   playsInline
//                 />
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }






















import React, { useEffect, useRef, useState } from 'react';
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import server from '../enviroment';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/videoComponent.module.css';

const peerConfigConnections = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
var connections = {};

export default function VideoMeetComponent() {
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const socketIdRef = useRef(String(Date.now()) + Math.floor(Math.random() * 10000));
    const localVideoLobbyRef = useRef(null);
    const localVideoRef = useRef(null);

    const [videoAvailable, setVideoAvailable] = useState(false);
    const [audioAvailable, setAudioAvailable] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);

    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState('');
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [newMessages, setNewMessages] = useState(0);
    const [videos, setVideos] = useState([]);

    const server_url = server.replace(/^https/, 'wss') + '/ws';

    useEffect(() => {
        checkDeviceCapabilities();
        return () => {
            try { window.localStream?.getTracks().forEach(t => t.stop()); } catch { }
            Object.values(connections).forEach(pc => pc.close());
            connections = {};
        };
    }, []);

    const checkDeviceCapabilities = async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoAvailable(devices.some(d => d.kind === 'videoinput'));
        setAudioAvailable(devices.some(d => d.kind === 'audioinput'));
        setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
    };

    const updateLocalStream = async ({ useCamera = true, useMic = true } = {}) => {
        let newStream;
        try {
            if (useCamera || useMic) {
                newStream = await navigator.mediaDevices.getUserMedia({
                    video: useCamera && videoAvailable ? true : false,
                    audio: useMic && audioAvailable ? true : false
                });
            } else {
                newStream = new MediaStream([black(), silence()]);
            }
        } catch {
            newStream = new MediaStream([black(), silence()]);
        }

        try { window.localStream?.getTracks().forEach(t => t.stop()); } catch { }
        window.localStream = newStream;

        if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = newStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

        Object.values(connections).forEach(pc => {
            const senders = pc.getSenders ? pc.getSenders() : [];
            const videoTrack = newStream.getVideoTracks()[0];
            const audioTrack = newStream.getAudioTracks()[0];
            const videoSender = senders.find(s => s.track?.kind === 'video');
            const audioSender = senders.find(s => s.track?.kind === 'audio');
            if (videoTrack && videoSender?.replaceTrack) videoSender.replaceTrack(videoTrack);
            if (audioTrack && audioSender?.replaceTrack) audioSender.replaceTrack(audioTrack);
        });
    };

    const silence = () => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start(); ctx.resume();
        const track = dst.stream.getAudioTracks()[0]; track.enabled = false; return track;
    };
    const black = () => {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        canvas.getContext('2d').fillRect(0, 0, 640, 480);
        const track = canvas.captureStream().getVideoTracks()[0]; track.enabled = false; return track;
    };

    const sendSignal = (toId, data) => {
        socketRef.current.send(JSON.stringify({ type: 'signal', toId, fromId: socketIdRef.current, data }));
    };

    const gotMessageFromServer = (fromId, message) => {
        const signal = JSON.parse(message);
        if (!connections[fromId]) {
            const pc = new RTCPeerConnection(peerConfigConnections);
            pc.remoteId = fromId;
            pc.onicecandidate = e => e.candidate && sendSignal(fromId, { ice: e.candidate });
            pc.ontrack = evt => addRemoteVideo(fromId, evt.streams[0] || new MediaStream([evt.track]));
            window.localStream?.getTracks().forEach(track => pc.addTrack(track, window.localStream));
            connections[fromId] = pc;
        }
        const pc = connections[fromId];
        if (signal.sdp) {
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                if (signal.sdp.type === 'offer') return pc.createAnswer();
            }).then(answer => answer && pc.setLocalDescription(answer).then(() => sendSignal(fromId, { sdp: pc.localDescription })))
                .catch(console.log);
        }
        if (signal.ice) pc.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(console.log);
    };

    const addRemoteVideo = (socketId, stream) => {
        setVideos(prev => {
            if (prev.find(v => v.socketId === socketId)) return prev.map(v => v.socketId === socketId ? { ...v, stream } : v);
            return [...prev, { socketId, stream }];
        });
    };

    const connectToSocketServer = () => {
        socketRef.current = new WebSocket(server_url);

        socketRef.current.onopen = () => {
            console.log('Connected to WS');
            socketRef.current.send(JSON.stringify({
                type: 'join-call',
                roomId: window.location.href,
                username,
                clientId: socketIdRef.current
            }));
        };

        socketRef.current.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            switch (msg.type) {
                case 'signal': gotMessageFromServer(msg.fromId, JSON.stringify(msg.data)); break;
                case 'existing-users': handleUserJoined(null, msg.clients); break;
                case 'user-joined': handleUserJoined(msg.userId, [msg.userId]); break;
                case 'user-left': setVideos(v => v.filter(x => x.socketId !== msg.userId)); delete connections[msg.userId]; break;
                case 'chat-message': addMessage(msg.data, msg.sender, msg.fromId); break;
            }
        };
    };

    const handleUserJoined = (userId, clients) => {
        if (!clients) return;
        clients.forEach(socketListId => {
            if (socketListId === socketIdRef.current) return;
            if (!connections[socketListId]) {
                const pc = new RTCPeerConnection(peerConfigConnections);
                pc.remoteId = socketListId;
                pc.onicecandidate = e => e.candidate && sendSignal(socketListId, { ice: e.candidate });
                pc.ontrack = evt => addRemoteVideo(socketListId, evt.streams[0]);
                window.localStream?.getTracks().forEach(track => pc.addTrack(track, window.localStream));
                connections[socketListId] = pc;
                pc.createOffer().then(desc => pc.setLocalDescription(desc)).then(() => {
                    sendSignal(socketListId, { sdp: pc.localDescription });
                }).catch(console.log);
            }
        });
    };

    const addMessage = (data, sender) => {
        setMessages(prev => [...prev, { data, sender }]);
        setNewMessages(prev => prev + 1);
    };

    const sendMessage = () => {
        if (!socketRef.current) return;
        socketRef.current.send(JSON.stringify({ type: 'chat-message', data: message, sender: username }));
        setMessage('');
    };

    const handleEndCall = () => {
        try { window.localStream?.getTracks().forEach(t => t.stop()); } catch { }
        Object.values(connections).forEach(pc => pc.close()); connections = {};
        navigate('/home');
    };

    const start = async () => {
        setAskForUsername(false);
        await updateLocalStream({ useCamera: video, useMic: audio });
        connectToSocketServer();
    };

    return (
        <div>
            {askForUsername ? (
                <div>
                    <h2>Enter Lobby</h2>
                    <TextField value={username} onChange={e => setUsername(e.target.value)} label="Username" variant="outlined" />
                    <Button onClick={start} variant="contained">Connect</Button>
                    <video ref={localVideoLobbyRef} autoPlay playsInline muted width={320} height={240} style={{ background: 'black' }} />
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    <div>
                        <video ref={localVideoRef} autoPlay playsInline muted width={320} height={240} />
                        {videos.map(v => (
                            <video key={v.socketId} ref={r => r && (r.srcObject = v.stream)} autoPlay playsInline />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}


































// import React, { useEffect, useRef, useState } from 'react';
// import { Badge, IconButton, TextField, Button } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff';
// import CallEndIcon from '@mui/icons-material/CallEnd';
// import MicIcon from '@mui/icons-material/Mic';
// import MicOffIcon from '@mui/icons-material/MicOff';
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
// import ChatIcon from '@mui/icons-material/Chat';
// import SockJS from 'sockjs-client';
// import styles from "../styles/videoComponent.module.css";
// import server from "../enviroment";
// import { useNavigate } from "react-router-dom";

// const server_url = server;
// const peerConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
// let connections = {};

// export default function VideoMeetComponent() {
//   const navigate = useNavigate();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(Date.now() + "" + Math.floor(Math.random() * 10000));
//   const localVideoLobbyRef = useRef(null);
//   const localVideoRef = useRef(null);

//   const [videoAvailable, setVideoAvailable] = useState(false);
//   const [audioAvailable, setAudioAvailable] = useState(false);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [askForUsername, setAskForUsername] = useState(true);
//   const [username, setUsername] = useState("");
//   const [showModal, setModal] = useState(true);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [videos, setVideos] = useState([]);

//   // ---------- Helpers ----------
//   const black = ({ width = 640, height = 480 } = {}) => {
//     const canvas = Object.assign(document.createElement('canvas'), { width, height });
//     canvas.getContext('2d').fillRect(0, 0, width, height);
//     const track = canvas.captureStream().getVideoTracks()[0];
//     track.enabled = false;
//     return track;
//   };

//   const silence = () => {
//     const ctx = new (window.AudioContext || window.webkitAudioContext)();
//     const oscillator = ctx.createOscillator();
//     const dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     ctx.resume();
//     const track = dst.stream.getAudioTracks()[0];
//     track.enabled = false;
//     return track;
//   };

//   // ---------- Local Stream ----------
//   const updateLocalStream = async ({ useCamera = true, useMic = true } = {}) => {
//     let newStream;
//     try {
//       if (useCamera || useMic) {
//         newStream = await navigator.mediaDevices.getUserMedia({
//           video: useCamera && videoAvailable ? true : false,
//           audio: useMic && audioAvailable ? true : false
//         });
//       } else {
//         newStream = new MediaStream([black(), silence()]);
//       }
//     } catch {
//       newStream = new MediaStream([black(), silence()]);
//     }

//     try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }
//     window.localStream = newStream;
//     if (localVideoLobbyRef.current) localVideoLobbyRef.current.srcObject = newStream;
//     if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

//     // replace tracks in existing connections
//     Object.values(connections).forEach(pc => {
//       pc.getSenders().forEach(sender => {
//         if (sender.track.kind === 'video' && newStream.getVideoTracks()[0]) sender.replaceTrack(newStream.getVideoTracks()[0]);
//         if (sender.track.kind === 'audio' && newStream.getAudioTracks()[0]) sender.replaceTrack(newStream.getAudioTracks()[0]);
//       });
//     });
//   };

//   // ---------- Remote Videos ----------
//   const addRemoteVideo = (socketId, stream) => {
//     setVideos(prev => {
//       if (prev.find(v => v.socketId === socketId)) {
//         return prev.map(v => v.socketId === socketId ? { ...v, stream } : v);
//       } else {
//         return [...prev, { socketId, stream }];
//       }
//     });
//   };

//   // ---------- Peer Connection ----------
//   const createPeerConnection = (id, isInitiator) => {
//     const pc = new RTCPeerConnection(peerConfig);
//     pc.remoteId = id;

//     pc.onicecandidate = e => { if (e.candidate) sendSignal(id, { ice: e.candidate }); };
//     pc.ontrack = e => addRemoteVideo(id, e.streams[0] || new MediaStream([e.track]));

//     pc.onnegotiationneeded = async () => {
//       if (!isInitiator) return;
//       try {
//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);
//         sendSignal(id, { sdp: pc.localDescription });
//       } catch (e) { console.log(e); }
//     };

//     if (window.localStream) {
//       window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
//     } else {
//       const fakeStream = new MediaStream([black(), silence()]);
//       pc.addTrack(fakeStream.getVideoTracks()[0], fakeStream);
//       pc.addTrack(fakeStream.getAudioTracks()[0], fakeStream);
//     }

//     connections[id] = pc;
//     return pc;
//   };

//   const gotSignal = async (fromId, message) => {
//     const signal = JSON.parse(message);
//     if (!connections[fromId]) createPeerConnection(fromId, false);
//     const pc = connections[fromId];

//     if (signal.sdp) {
//       await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
//       if (signal.sdp.type === "offer") {
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         sendSignal(fromId, { sdp: pc.localDescription });
//       }
//     }

//     if (signal.ice) {
//       try { await pc.addIceCandidate(new RTCIceCandidate(signal.ice)); } catch { }
//     }
//   };

//   const handleUserJoined = (userId, clients) => {
//     if (!clients) return;
//     clients.forEach(id => {
//       if (id === socketIdRef.current) return;
//       if (!connections[id]) createPeerConnection(id, true);
//     });
//   };

//   // ---------- Socket ----------
//   const sendSignal = (toId, data) => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "signal", fromId: socketIdRef.current, toId, data }));
//   };

//   const connectToSocketServer = (finalUsername) => {
//     socketRef.current = new SockJS(`${server_url}/ws`);
//     socketRef.current.onopen = () => {
//       socketRef.current.send(JSON.stringify({
//         type: "join-call",
//         roomId: window.location.href,
//         username: finalUsername,
//         clientId: socketIdRef.current
//       }));
//     };

//     socketRef.current.onmessage = e => {
//       const msg = JSON.parse(e.data);
//       switch (msg.type) {
//         case "signal": gotSignal(msg.fromId, JSON.stringify(msg.data)); break;
//         case "user-joined": handleUserJoined(msg.userId, msg.clients); break;
//         case "user-left": setVideos(v => v.filter(x => x.socketId !== msg.userId)); delete connections[msg.userId]; break;
//         case "chat-message": addMessage(msg.data, msg.sender, msg.fromId); break;
//         default: console.log("Unknown message type:", msg.type);
//       }
//     };
//   };

//   // ---------- Chat ----------
//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages(prev => [...prev, { sender, data }]);
//     if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
//   };
//   const sendMessage = () => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "chat-message", data: message, sender: username }));
//     setMessage("");
//   };

//   // ---------- UI Handlers ----------
//   // const startCall = async () => {
//   //   setAskForUsername(false);
//   //   await updateLocalStream({ useCamera: video, useMic: audio });
//   //   connectToSocketServer();
//   // };

//   const startCall = async () => {
//     if (!username) return alert("Please enter a username"); // no guest fallback
//     setAskForUsername(false);
//     try {
//       await updateLocalStream({ useCamera: video, useMic: audio });
//     } catch (e) { console.log(e); }
//     connectToSocketServer(username);
//   };


//   // const handleEndCall = () => {
//   //   try { window.localStream.getTracks().forEach(t => t.stop()); } catch { }
//   //   Object.values(connections).forEach(pc => pc.close());
//   //   connections = {};
//   //   window.location.href = "/home";
//   // };
//   const handleEndCall = () => {
//     try { window.localStream.getTracks().forEach(track => track.stop()); } catch (e) { }
//     Object.values(connections).forEach(pc => { try { pc.close(); } catch (e) { } });
//     connections = {};
//     navigate("/home");  // <-- use react-router navigation
//   };


//   const handleVideoToggle = () => {
//     const track = window.localStream?.getVideoTracks()[0];
//     if (track) { track.enabled = !track.enabled; setVideo(track.enabled); }
//   };

//   const handleAudioToggle = () => {
//     const track = window.localStream?.getAudioTracks()[0];
//     if (track) { track.enabled = !track.enabled; setAudio(track.enabled); }
//   };

//   const handleScreenToggle = async () => {
//     if (!screen) {
//       try {
//         const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
//         window.localStream.getTracks().forEach(t => t.stop());
//         window.localStream = stream;
//         Object.values(connections).forEach(pc => stream.getTracks().forEach(track => pc.addTrack(track, stream)));
//         if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//         setScreen(true);
//         stream.getTracks().forEach(track => track.onended = () => { updateLocalStream({ useCamera: video, useMic: audio }); setScreen(false); });
//       } catch { }
//     } else {
//       await updateLocalStream({ useCamera: video, useMic: audio });
//       setScreen(false);
//     }
//   };

//   useEffect(() => {
//     const checkDevices = async () => {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       setVideoAvailable(devices.some(d => d.kind === "videoinput"));
//       setAudioAvailable(devices.some(d => d.kind === "audioinput"));
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//     };
//     checkDevices();
//   }, []);

//   return (
//     <div>
//       {askForUsername ? (
//         <div>
//           <h2>Enter into Lobby</h2>
//           <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//           <Button variant="contained" onClick={startCall}>Connect</Button>
//           <video ref={localVideoLobbyRef} autoPlay playsInline muted style={{ width: 320, height: 240, background: "black" }} />
//         </div>
//       ) : (
//         <div className={styles.meetVideoContainer}>
//           {showModal && (
//             <div className={styles.chatRoom}>
//               <div className={styles.chatContainer}>
//                 <h1>Chat</h1>
//                 <div className={styles.chattingDisplay}>
//                   {messages.length ? messages.map((item, i) => (
//                     <div key={i} style={{ marginBottom: "20px" }}>
//                       <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                       <p>{item.data}</p>
//                     </div>
//                   )) : <p>No Messages Yet</p>}
//                 </div>
//                 <div className={styles.chattingArea}>
//                   <TextField value={message} onChange={e => setMessage(e.target.value)} label="Enter Your chat" variant="outlined" />
//                   <Button variant='contained' onClick={sendMessage}>Send</Button>
//                 </div>
//               </div>
//             </div>
//           )}

//           <div className={styles.buttonContainers}>
//             <IconButton onClick={handleVideoToggle} style={{ color: "white" }}>{video ? <VideocamIcon /> : <VideocamOffIcon />}</IconButton>
//             <IconButton onClick={handleEndCall} style={{ color: "red" }}><CallEndIcon /></IconButton>
//             <IconButton onClick={handleAudioToggle} style={{ color: "white" }}>{audio ? <MicIcon /> : <MicOffIcon />}</IconButton>
//             {screenAvailable && <IconButton onClick={handleScreenToggle} style={{ color: "white" }}>{screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}</IconButton>}
//             <Badge badgeContent={newMessages} max={999} color='primary'>
//               <IconButton onClick={() => setModal(prev => !prev)} style={{ color: "white" }}><ChatIcon /></IconButton>
//             </Badge>
//           </div>

//           <video ref={localVideoRef} autoPlay playsInline muted className={styles.meetUserVideo} style={{ width: 320, height: 240 }} />
//           <div className={styles.conferenceView}>
//             {videos.map(v => <div key={v.socketId}><video ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }} autoPlay playsInline /></div>)}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


































// import React, { useEffect, useRef, useState } from 'react';
// import { Badge, IconButton, TextField, Button } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff';
// import CallEndIcon from '@mui/icons-material/CallEnd';
// import MicIcon from '@mui/icons-material/Mic';
// import MicOffIcon from '@mui/icons-material/MicOff';
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
// import ChatIcon from '@mui/icons-material/Chat';
// import SockJS from 'sockjs-client';
// import styles from "../styles/videoComponent.module.css";
// import server from "../enviroment";
// import { useNavigate } from "react-router-dom";

// const server_url = server;
// const peerConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
// let connections = {};

// export default function VideoMeetComponent() {
//   const navigate = useNavigate();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(Date.now() + "" + Math.floor(Math.random() * 10000));
//   const localVideoRef = useRef(null);

//   const [videoAvailable, setVideoAvailable] = useState(false);
//   const [audioAvailable, setAudioAvailable] = useState(false);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [askForUsername, setAskForUsername] = useState(true);
//   const [username, setUsername] = useState("");
//   const [showModal, setModal] = useState(true);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [videos, setVideos] = useState([]);

//   // Helpers
//   const black = ({ width = 640, height = 480 } = {}) => {
//     const canvas = Object.assign(document.createElement('canvas'), { width, height });
//     canvas.getContext('2d').fillRect(0, 0, width, height);
//     const track = canvas.captureStream().getVideoTracks()[0];
//     track.enabled = false;
//     return track;
//   };

//   const silence = () => {
//     const ctx = new (window.AudioContext || window.webkitAudioContext)();
//     const oscillator = ctx.createOscillator();
//     const dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     ctx.resume();
//     const track = dst.stream.getAudioTracks()[0];
//     track.enabled = false;
//     return track;
//   };

//   // Update local stream
//   const updateLocalStream = async ({ useCamera = true, useMic = true } = {}) => {
//     let newStream;
//     try {
//       if (useCamera || useMic) {
//         newStream = await navigator.mediaDevices.getUserMedia({
//           video: useCamera && videoAvailable ? true : false,
//           audio: useMic && audioAvailable ? true : false
//         });
//       } else {
//         newStream = new MediaStream([black(), silence()]);
//       }
//     } catch {
//       newStream = new MediaStream([black(), silence()]);
//     }

//     try { window.localStream?.getTracks().forEach(t => t.stop()); } catch (e) { }
//     window.localStream = newStream;
//     if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

//     // replace tracks in existing connections
//     Object.values(connections).forEach(pc => {
//       pc.getSenders().forEach(sender => {
//         if (sender.track.kind === 'video' && newStream.getVideoTracks()[0]) sender.replaceTrack(newStream.getVideoTracks()[0]);
//         if (sender.track.kind === 'audio' && newStream.getAudioTracks()[0]) sender.replaceTrack(newStream.getAudioTracks()[0]);
//       });
//     });
//   };

//   // Remote videos
//   const addRemoteVideo = (socketId, stream) => {
//     setVideos(prev => {
//       if (prev.find(v => v.socketId === socketId)) {
//         return prev.map(v => v.socketId === socketId ? { ...v, stream } : v);
//       } else {
//         return [...prev, { socketId, stream }];
//       }
//     });
//   };

//   // Peer Connection
//   const createPeerConnection = (id, isInitiator) => {
//     const pc = new RTCPeerConnection(peerConfig);
//     pc.remoteId = id;

//     pc.onicecandidate = e => { if (e.candidate) sendSignal(id, { ice: e.candidate }); };
//     pc.ontrack = e => addRemoteVideo(id, e.streams[0]);

//     pc.onnegotiationneeded = async () => {
//       if (!isInitiator) return;
//       try {
//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);
//         sendSignal(id, { sdp: pc.localDescription });
//       } catch (e) { console.log(e); }
//     };

//     if (window.localStream) {
//       window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));
//     }

//     connections[id] = pc;
//     return pc;
//   };

//   const gotSignal = async (fromId, message) => {
//     const signal = JSON.parse(message);
//     if (!connections[fromId]) createPeerConnection(fromId, false);
//     const pc = connections[fromId];

//     if (signal.sdp) {
//       await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
//       if (signal.sdp.type === "offer") {
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         sendSignal(fromId, { sdp: pc.localDescription });
//       }
//     }

//     if (signal.ice) {
//       try { await pc.addIceCandidate(new RTCIceCandidate(signal.ice)); } catch { }
//     }
//   };

//   // const handleUserJoined = (userId, clients) => {
//   //   if (!clients) return;
//   //   clients.forEach(id => {
//   //     if (id === socketIdRef.current) return;
//   //     if (!connections[id]) {
//   //       const pc = createPeerConnection(id, true);
//   //       if (window.localStream) pc.onnegotiationneeded && pc.onnegotiationneeded();
//   //     }
//   //   });
//   // };
//   const handleUserJoined = (userId, clients) => {
//     if (!clients) return;
//     clients.forEach(id => {
//       if (id === socketIdRef.current) return;
//       if (!connections[id]) createPeerConnection(id, true);
//     });
//   };


//   // Socket
//   const sendSignal = (toId, data) => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "signal", fromId: socketIdRef.current, toId, data }));
//   };

//   const connectToSocketServer = () => {
//     socketRef.current.onmessage = e => {
//       const msg = JSON.parse(e.data);
//       switch (msg.type) {
//         case "signal":
//           gotSignal(msg.fromId, JSON.stringify(msg.data));
//           break;

//         case "user-joined":
//           handleUserJoined(msg.userId, [msg.userId]);
//           break;

//         case "existing-users":
//           handleUserJoined(null, msg.clients); // create peers for all existing users
//           break;

//         case "user-left":
//           setVideos(v => v.filter(x => x.socketId !== msg.userId));
//           delete connections[msg.userId];
//           break;

//         case "chat-message":
//           addMessage(msg.data, msg.sender, msg.fromId);
//           break;

//         default:
//           console.log("Unknown message type:", msg.type);
//       }
//     };

//   };

//   // Chat
//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages(prev => [...prev, { sender, data }]);
//     if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
//   };
//   const sendMessage = () => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "chat-message", data: message, sender: username }));
//     setMessage("");
//   };

//   // UI Handlers
//   const startCall = async () => {
//     if (!username) return alert("Please enter a username");
//     setAskForUsername(false);
//     try { await updateLocalStream({ useCamera: video, useMic: audio }); } catch (e) { console.log(e); }
//     connectToSocketServer();
//   };

//   const handleEndCall = () => {
//     try { window.localStream.getTracks().forEach(track => track.stop()); } catch (e) { }
//     Object.values(connections).forEach(pc => { try { pc.close(); } catch (e) { } });
//     connections = {};
//     navigate("/home");
//   };

//   const handleVideoToggle = () => {
//     const track = window.localStream?.getVideoTracks()[0];
//     if (track) { track.enabled = !track.enabled; setVideo(track.enabled); }
//   };
//   const handleAudioToggle = () => {
//     const track = window.localStream?.getAudioTracks()[0];
//     if (track) { track.enabled = !track.enabled; setAudio(track.enabled); }
//   };
//   const handleScreenToggle = async () => {
//     if (!screen) {
//       try {
//         const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
//         window.localStream.getTracks().forEach(t => t.stop());
//         window.localStream = stream;
//         Object.values(connections).forEach(pc => stream.getTracks().forEach(track => pc.addTrack(track, stream)));
//         if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//         setScreen(true);
//         stream.getTracks().forEach(track => track.onended = () => { updateLocalStream({ useCamera: video, useMic: audio }); setScreen(false); });
//       } catch { }
//     } else {
//       await updateLocalStream({ useCamera: video, useMic: audio });
//       setScreen(false);
//     }
//   };

//   useEffect(() => {
//     const checkDevices = async () => {
//       const devices = await navigator.mediaDevices.enumerateDevices();
//       setVideoAvailable(devices.some(d => d.kind === "videoinput"));
//       setAudioAvailable(devices.some(d => d.kind === "audioinput"));
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//     };
//     checkDevices();
//   }, []);

//   return (
//     <div>
//       {askForUsername ? (
//         <div>
//           <h2>Enter Username</h2>
//           <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//           <Button variant="contained" onClick={startCall}>Connect</Button>
//         </div>
//       ) : (
//         <div className={styles.meetVideoContainer}>
//           {showModal && (
//             <div className={styles.chatRoom}>
//               <div className={styles.chatContainer}>
//                 <h1>Chat</h1>
//                 <div className={styles.chattingDisplay}>
//                   {messages.length ? messages.map((item, i) => (
//                     <div key={i} style={{ marginBottom: "20px" }}>
//                       <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                       <p>{item.data}</p>
//                     </div>
//                   )) : <p>No Messages Yet</p>}
//                 </div>
//                 <div className={styles.chattingArea}>
//                   <TextField value={message} onChange={e => setMessage(e.target.value)} label="Enter Your chat" variant="outlined" />
//                   <Button variant='contained' onClick={sendMessage}>Send</Button>
//                 </div>
//               </div>
//             </div>
//           )}

//           <div className={styles.buttonContainers}>
//             <IconButton onClick={handleVideoToggle} style={{ color: "white" }}>{video ? <VideocamIcon /> : <VideocamOffIcon />}</IconButton>
//             <IconButton onClick={handleEndCall} style={{ color: "red" }}><CallEndIcon /></IconButton>
//             <IconButton onClick={handleAudioToggle} style={{ color: "white" }}>{audio ? <MicIcon /> : <MicOffIcon />}</IconButton>
//             {screenAvailable && <IconButton onClick={handleScreenToggle} style={{ color: "white" }}>{screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}</IconButton>}
//             <Badge badgeContent={newMessages} max={999} color='primary'>
//               <IconButton onClick={() => setModal(prev => !prev)} style={{ color: "white" }}><ChatIcon /></IconButton>
//             </Badge>
//           </div>

//           <video ref={localVideoRef} autoPlay playsInline muted className={styles.meetUserVideo} style={{ width: 320, height: 240 }} />
//           <div className={styles.conferenceView}>
//             {videos.map(v => <div key={v.socketId}><video ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }} autoPlay playsInline /></div>)}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }






















// import React, { useEffect, useRef, useState } from 'react';
// import { IconButton, TextField, Button, Badge } from '@mui/material';
// import VideocamIcon from '@mui/icons-material/Videocam';
// import VideocamOffIcon from '@mui/icons-material/VideocamOff';
// import CallEndIcon from '@mui/icons-material/CallEnd';
// import MicIcon from '@mui/icons-material/Mic';
// import MicOffIcon from '@mui/icons-material/MicOff';
// import ScreenShareIcon from '@mui/icons-material/ScreenShare';
// import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
// import ChatIcon from '@mui/icons-material/Chat';
// import { useNavigate } from 'react-router-dom';
// import styles from "../styles/videoComponent.module.css";
// import server from "../enviroment";

// // const server_url = `${server}`; // Change to your server
// const server_url = server.replace(/^https/, 'wss') + '/ws'; // Change to your server
// const peerConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
// let connections = {};

// export default function VideoMeetComponent() {
//   const navigate = useNavigate();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(Date.now() + "" + Math.floor(Math.random() * 10000));
//   const localVideoRef = useRef(null);

//   const [videoAvailable, setVideoAvailable] = useState(false);
//   const [audioAvailable, setAudioAvailable] = useState(false);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [askForUsername, setAskForUsername] = useState(true);
//   const [username, setUsername] = useState("");
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [videos, setVideos] = useState([]);

//   // Initialize lobby video
//   useEffect(() => {
//     const initLocalVideo = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//         window.localStream = stream;
//         if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//         const devices = await navigator.mediaDevices.enumerateDevices();
//         setVideoAvailable(devices.some(d => d.kind === "videoinput"));
//         setAudioAvailable(devices.some(d => d.kind === "audioinput"));
//         setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//       } catch (err) {
//         console.error("Camera/Mic not available", err);
//       }
//     };
//     initLocalVideo();
//   }, []);

//   // Helpers for black video / silent audio
//   const black = ({ width = 640, height = 480 } = {}) => {
//     const canvas = Object.assign(document.createElement('canvas'), { width, height });
//     canvas.getContext('2d').fillRect(0, 0, width, height);
//     const track = canvas.captureStream().getVideoTracks()[0];
//     track.enabled = false;
//     return track;
//   };
//   const silence = () => {
//     const ctx = new (window.AudioContext || window.webkitAudioContext)();
//     const oscillator = ctx.createOscillator();
//     const dst = oscillator.connect(ctx.createMediaStreamDestination());
//     oscillator.start();
//     ctx.resume();
//     const track = dst.stream.getAudioTracks()[0];
//     track.enabled = false;
//     return track;
//   };

//   const updateLocalStream = async ({ useCamera = true, useMic = true } = {}) => {
//     let newStream;
//     try {
//       if (useCamera || useMic) {
//         newStream = await navigator.mediaDevices.getUserMedia({
//           video: useCamera && videoAvailable ? true : false,
//           audio: useMic && audioAvailable ? true : false
//         });
//       } else newStream = new MediaStream([black(), silence()]);
//     } catch {
//       newStream = new MediaStream([black(), silence()]);
//     }

//     try { window.localStream?.getTracks().forEach(t => t.stop()); } catch {}
//     window.localStream = newStream;
//     if (localVideoRef.current) localVideoRef.current.srcObject = newStream;

//     Object.values(connections).forEach(pc => {
//       pc.getSenders().forEach(sender => {
//         if (sender.track.kind === 'video' && newStream.getVideoTracks()[0])
//           sender.replaceTrack(newStream.getVideoTracks()[0]);
//         if (sender.track.kind === 'audio' && newStream.getAudioTracks()[0])
//           sender.replaceTrack(newStream.getAudioTracks()[0]);
//       });
//     });
//   };

//   const addRemoteVideo = (socketId, stream) => {
//     setVideos(prev => {
//       if (prev.find(v => v.socketId === socketId)) {
//         return prev.map(v => v.socketId === socketId ? { ...v, stream } : v);
//       } else return [...prev, { socketId, stream }];
//     });
//   };

//   const createPeerConnection = (id, isInitiator) => {
//     const pc = new RTCPeerConnection(peerConfig);
//     pc.remoteId = id;

//     pc.onicecandidate = e => { if (e.candidate) sendSignal(id, { ice: e.candidate }); };
//     pc.ontrack = e => addRemoteVideo(id, e.streams[0]);
//     pc.onnegotiationneeded = async () => {
//       if (!isInitiator) return;
//       try {
//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);
//         sendSignal(id, { sdp: pc.localDescription });
//       } catch (e) { console.log(e); }
//     };

//     if (window.localStream) window.localStream.getTracks().forEach(track => pc.addTrack(track, window.localStream));

//     connections[id] = pc;
//     return pc;
//   };

//   const gotSignal = async (fromId, message) => {
//     const signal = JSON.parse(message);
//     if (!connections[fromId]) createPeerConnection(fromId, false);
//     const pc = connections[fromId];

//     if (signal.sdp) {
//       await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
//       if (signal.sdp.type === "offer") {
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         sendSignal(fromId, { sdp: pc.localDescription });
//       }
//     }
//     if (signal.ice) try { await pc.addIceCandidate(new RTCIceCandidate(signal.ice)); } catch {}
//   };

//   const handleUserJoined = (userId, clients) => {
//     if (!clients) return;
//     clients.forEach(id => {
//       if (id === socketIdRef.current) return;
//       if (!connections[id]) {
//         const pc = createPeerConnection(id, true);
//         pc.onnegotiationneeded && pc.onnegotiationneeded(); // ⚡️ trigger offer
//       }
//     });
//   };

//   const sendSignal = (toId, data) => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "signal", fromId: socketIdRef.current, toId, data }));
//   };

//   const connectToSocketServer = () => {
//     socketRef.current = new WebSocket(server_url);
//     socketRef.current.onopen = () => {
//       socketRef.current.send(JSON.stringify({ type: "join-call", roomId: "default" }));
//     };
//     socketRef.current.onmessage = e => {
//       const msg = JSON.parse(e.data);
//       switch (msg.type) {
//         case "signal": gotSignal(msg.fromId, JSON.stringify(msg.data)); break;
//         case "user-joined": handleUserJoined(msg.userId, [msg.userId]); break;
//         case "existing-users": handleUserJoined(null, msg.clients); break;
//         case "user-left": setVideos(v => v.filter(x => x.socketId !== msg.userId)); delete connections[msg.userId]; break;
//         case "chat-message": addMessage(msg.data, msg.sender, msg.fromId); break;
//         default: console.log("Unknown type:", msg.type);
//       }
//     };
//   };

//   const startCall = async () => {
//     if (!username) return alert("Enter username");
//     setAskForUsername(false);
//     try { await updateLocalStream({ useCamera: video, useMic: audio }); } catch {}
//     connectToSocketServer();
//   };

//   const handleEndCall = () => {
//     try { window.localStream.getTracks().forEach(t => t.stop()); } catch {}
//     Object.values(connections).forEach(pc => { try { pc.close(); } catch {} });
//     connections = {};
//     navigate("/home");
//   };

//   const handleVideoToggle = () => {
//     const track = window.localStream?.getVideoTracks()[0];
//     if (track) { track.enabled = !track.enabled; setVideo(track.enabled); }
//   };
//   const handleAudioToggle = () => {
//     const track = window.localStream?.getAudioTracks()[0];
//     if (track) { track.enabled = !track.enabled; setAudio(track.enabled); }
//   };

//   const addMessage = (data, sender, socketIdSender) => {
//     setMessages(prev => [...prev, { sender, data }]);
//     if (socketIdSender !== socketIdRef.current) setNewMessages(prev => prev + 1);
//   };
//   const sendMessage = () => {
//     if (!socketRef.current) return;
//     socketRef.current.send(JSON.stringify({ type: "chat-message", data: message, sender: username }));
//     setMessage("");
//   };

//   return (
//     <div>
//       {askForUsername ? (
//         <div>
//           <h2>Enter Username</h2>
//           <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//           <Button variant="contained" onClick={startCall}>Connect</Button>
//         </div>
//       ) : (
//         <div className={styles.meetVideoContainer}>
//           <div className={styles.buttonContainers}>
//             <IconButton onClick={handleVideoToggle}>{video ? <VideocamIcon /> : <VideocamOffIcon />}</IconButton>
//             <IconButton onClick={handleEndCall}><CallEndIcon /></IconButton>
//             <IconButton onClick={handleAudioToggle}>{audio ? <MicIcon /> : <MicOffIcon />}</IconButton>
//           </div>

//           <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 320, height: 240 }} />
//           <div className={styles.conferenceView}>
//             {videos.map(v => (
//               <video key={v.socketId} autoPlay playsInline ref={ref => { if (ref && v.stream) ref.srcObject = v.stream; }} style={{ width: 320, height: 240 }} />
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
