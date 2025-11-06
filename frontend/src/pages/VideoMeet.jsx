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
// import styles from '../styles/videoComponent.module.css';
// import SockJS from 'sockjs-client';
// import server from "../enviroment";

// const peerConfigConnections = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
// };

// let connections = {};

// export default function VideoMeetComponent() {
//   const localVideoref = useRef();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(null);

//   const [videos, setVideos] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [username, setUsername] = useState("");
//   const [askForUsername, setAskForUsername] = useState(true);

//   const [videoAvailable, setVideoAvailable] = useState(true);
//   const [audioAvailable, setAudioAvailable] = useState(true);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [showModal, setModal] = useState(false);

//   useEffect(() => {
//     getPermissions();
//   }, []);

//   const getPermissions = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//       window.localStream = stream;
//       if (localVideoref.current) localVideoref.current.srcObject = stream;
//       setVideoAvailable(true);
//       setAudioAvailable(true);
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//     } catch (err) {
//       console.error("Media access error:", err);
//     }
//   };

//   const connect = () => {
//     if (!username.trim()) return;
//     setAskForUsername(false);
//     connectToSocketServer();
//   };

//   const connectToSocketServer = () => {
//     const roomId = window.location.pathname.split("/").pop();
//     socketRef.current = new SockJS("https://vchat-rp52.onrender.com/ws");

//     socketRef.current.onopen = () => {
//       console.log("Connected to signaling server");
//       socketRef.current.send(JSON.stringify({ type: "join-call", roomId }));
//     };

//     socketRef.current.onmessage = async (event) => {
//       const msg = JSON.parse(event.data);

//       switch (msg.type) {
//         case "connection-success":
//           socketIdRef.current = msg.id;
//           console.log("Connected:", msg.id);
//           break;

//         case "existing-users":
//           msg.users.forEach((id) => setupPeerConnection(id, true));
//           break;

//         case "user-joined":
//           setupPeerConnection(msg.userId, false);
//           break;

//         case "signal":
//           await handleSignal(msg.fromId, msg.data);
//           break;

//         case "user-left":
//           removeVideo(msg.userId);
//           break;

//         case "chat-message":
//           addMessage(msg.data, msg.sender);
//           break;

//         default:
//           break;
//       }
//     };

//     socketRef.current.onclose = () => console.log("Socket closed");
//   };

//   const setupPeerConnection = async (id, isOfferer) => {
//     if (connections[id]) return;

//     const pc = new RTCPeerConnection(peerConfigConnections);
//     connections[id] = pc;

//     window.localStream.getTracks().forEach((track) => pc.addTrack(track, window.localStream));

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socketRef.current.send(JSON.stringify({
//           type: "signal",
//           toId: id,
//           data: JSON.stringify({ ice: event.candidate }) // ✅ send as string
//         }));
//       }
//     };

//     pc.ontrack = (event) => {
//       setVideos((prev) => {
//         const exists = prev.find((v) => v.socketId === id);
//         if (exists) {
//           return prev.map((v) => v.socketId === id ? { ...v, stream: event.streams[0] } : v);
//         }
//         return [...prev, { socketId: id, stream: event.streams[0] }];
//       });
//     };

//     if (isOfferer) {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       socketRef.current.send(JSON.stringify({
//         type: "signal",
//         toId: id,
//         data: JSON.stringify({ sdp: pc.localDescription }) // ✅ send as string
//       }));
//     }
//   };

//   const handleSignal = async (fromId, data) => {
//     const parsed = typeof data === "string" ? JSON.parse(data) : data;
//     if (!connections[fromId]) setupPeerConnection(fromId, false);

//     const pc = connections[fromId];
//     if (parsed.sdp) {
//       await pc.setRemoteDescription(new RTCSessionDescription(parsed.sdp));
//       if (parsed.sdp.type === "offer") {
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         socketRef.current.send(JSON.stringify({
//           type: "signal",
//           toId: fromId,
//           data: JSON.stringify({ sdp: pc.localDescription }) // ✅ send as string
//         }));
//       }
//     } else if (parsed.ice) {
//       try {
//         await pc.addIceCandidate(new RTCIceCandidate(parsed.ice));
//       } catch (e) {
//         console.error("ICE add error:", e);
//       }
//     }
//   };

//   const removeVideo = (id) => {
//     setVideos((prev) => prev.filter((v) => v.socketId !== id));
//     if (connections[id]) {
//       connections[id].close();
//       delete connections[id];
//     }
//   };

//   const addMessage = (data, sender) => {
//     setMessages((prev) => [...prev, { data, sender }]);
//     setNewMessages((prev) => prev + 1);
//   };

//   const sendMessage = () => {
//     if (!message.trim()) return;
//     socketRef.current.send(JSON.stringify({
//       type: "chat-message",
//       data: message,
//       sender: username
//     }));
//     setMessage("");
//   };

//   const handleVideo = () => setVideo(!video);
//   const handleAudio = () => setAudio(!audio);
//   const handleScreen = () => setScreen(!screen);
//   const handleEndCall = () => {
//     try {
//       localVideoref.current.srcObject?.getTracks().forEach((t) => t.stop());
//     } catch (e) {}
//     window.location.href = "/";
//   };

//   return (
//     <div>
//       {askForUsername ? (
//         <div>
//           <h2>Enter into Lobby</h2>
//           <TextField
//             id="outlined-basic"
//             label="Username"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             variant="outlined"
//           />
//           <Button variant="contained" onClick={connect}>Connect</Button>

//           <div>
//             <video ref={localVideoref} autoPlay muted></video>
//           </div>
//         </div>
//       ) : (
//         <div className={styles.meetVideoContainer}>
//           {showModal && (
//             <div className={styles.chatRoom}>
//               <div className={styles.chatContainer}>
//                 <h1>Chat</h1>
//                 <div className={styles.chattingDisplay}>
//                   {messages.length ? messages.map((item, index) => (
//                     <div style={{ marginBottom: "20px" }} key={index}>
//                       <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                       <p>{item.data}</p>
//                     </div>
//                   )) : <p>No Messages Yet</p>}
//                 </div>
//                 <div className={styles.chattingArea}>
//                   <TextField
//                     value={message}
//                     onChange={(e) => setMessage(e.target.value)}
//                     id="outlined-basic"
//                     label="Enter Your chat"
//                     variant="outlined"
//                   />
//                   <Button variant="contained" onClick={sendMessage}>Send</Button>
//                 </div>
//               </div>
//             </div>
//           )}

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
//             {screenAvailable && (
//               <IconButton onClick={handleScreen} style={{ color: "white" }}>
//                 {screen ? <ScreenShareIcon /> : <StopScreenShareIcon />}
//               </IconButton>
//             )}
//             <Badge badgeContent={newMessages} max={999} color="orange">
//               <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
//                 <ChatIcon />
//               </IconButton>
//             </Badge>
//           </div>

//           <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

//           <div className={styles.conferenceView}>
//             {videos.map((video) => (
//               <div key={video.socketId}>
//                 <video
//                   data-socket={video.socketId}
//                   ref={(ref) => {
//                     if (ref && video.stream) {
//                       ref.srcObject = video.stream;
//                     }
//                   }}
//                   autoPlay
//                 />
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }






















// // ... keep your imports the same
// import React, { useEffect, useRef, useState } from "react";
// import { Badge, IconButton, TextField, Button } from "@mui/material";
// import VideocamIcon from "@mui/icons-material/Videocam";
// import VideocamOffIcon from "@mui/icons-material/VideocamOff";
// import CallEndIcon from "@mui/icons-material/CallEnd";
// import MicIcon from "@mui/icons-material/Mic";
// import MicOffIcon from "@mui/icons-material/MicOff";
// import ScreenShareIcon from "@mui/icons-material/ScreenShare";
// import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
// import ChatIcon from "@mui/icons-material/Chat";
// import styles from "../styles/videoComponent.module.css";
// import SockJS from "sockjs-client";
// import server from "../enviroment";

// const peerConfigConnections = {
//   iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
// };

// let connections = {};

// export default function VideoMeetComponent() {
//   const localVideoref = useRef();
//   const socketRef = useRef(null);
//   const socketIdRef = useRef(null);

//   const [videos, setVideos] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [newMessages, setNewMessages] = useState(0);
//   const [username, setUsername] = useState("");
//   const [askForUsername, setAskForUsername] = useState(true);

//   const [videoAvailable, setVideoAvailable] = useState(true);
//   const [audioAvailable, setAudioAvailable] = useState(true);
//   const [video, setVideo] = useState(true);
//   const [audio, setAudio] = useState(true);
//   const [screen, setScreen] = useState(false);
//   const [screenAvailable, setScreenAvailable] = useState(false);
//   const [showModal, setModal] = useState(false);

//   // -----------------------------------
//   // 🔹 1. Permission request + local video setup
//   // -----------------------------------
//   useEffect(() => {
//     console.log("[useEffect] component mounted -> getPermissions()");
//     getPermissions();
//   }, []);

//   const getPermissions = async () => {
//     console.log("[getPermissions] requesting media...");
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//       console.log("[getPermissions] got stream:", stream);

//       window.localStream = stream;
//       if (localVideoref.current) {
//         console.log("[getPermissions] attaching stream to local video...");
//         localVideoref.current.srcObject = stream;

//         // Force autoplay for mobile (Safari/Chrome)
//         localVideoref.current
//           .play()
//           .then(() => console.log("[getPermissions] local video playing ✅"))
//           .catch((err) =>
//             console.error("[getPermissions] play() failed ❌", err)
//           );
//       } else {
//         console.warn("[getPermissions] localVideoref not ready yet");
//       }

//       setVideoAvailable(true);
//       setAudioAvailable(true);
//       setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);
//       console.log(
//         "[getPermissions] videoAvailable:",
//         true,
//         "audioAvailable:",
//         true,
//         "screenAvailable:",
//         !!navigator.mediaDevices.getDisplayMedia
//       );
//     } catch (err) {
//       console.error("[getPermissions] Media access error ❌:", err);
//     }
//   };

//   // -----------------------------------
//   // 🔹 2. Connect to signaling server
//   // -----------------------------------
//   const connect = () => {
//     console.log("[connect] username:", username);
//     if (!username.trim()) return;
//     setAskForUsername(false);
//     connectToSocketServer();
//   };

//   const connectToSocketServer = () => {
//     const roomId = window.location.pathname.split("/").pop();
//     console.log(
//       "[connectToSocketServer] connecting to https://vchat-rp52.onrender.com/ws roomId:",
//       roomId
//     );
//     socketRef.current = new SockJS("https://vchat-rp52.onrender.com/ws");

//     socketRef.current.onopen = () => {
//       console.log("[SockJS] onopen - connected to signaling server");
//       socketRef.current.send(JSON.stringify({ type: "join-call", roomId }));
//       console.log("[SockJS] sent join-call", { type: "join-call", roomId });
//     };

//     socketRef.current.onmessage = async (event) => {
//       console.log("[SockJS] onmessage RAW:", event.data);
//       const msg = JSON.parse(event.data);
//       console.log("[SockJS] parsed message:", msg);

//       switch (msg.type) {
//         case "connection-success":
//           socketIdRef.current = msg.id;
//           console.log("[SockJS] connection-success -> socketIdRef:", msg.id);
//           break;

//         case "existing-users":
//           console.log("[SockJS] existing-users:", msg.users);
//           msg.users.forEach((id) => setupPeerConnection(id, true));
//           break;

//         case "user-joined":
//           console.log("[SockJS] user-joined:", msg.userId);
//           setupPeerConnection(msg.userId, false);
//           break;

//         case "signal":
//           console.log("[SockJS] signal received from:", msg.fromId);
//           await handleSignal(msg.fromId, msg.data);
//           break;

//         case "user-left":
//           console.log("[SockJS] user-left:", msg.userId);
//           removeVideo(msg.userId);
//           break;

//         case "chat-message":
//           console.log("[SockJS] chat-message:", msg.data, "from:", msg.sender);
//           addMessage(msg.data, msg.sender);
//           break;

//         default:
//           console.warn("[SockJS] unknown message type:", msg.type);
//           break;
//       }
//     };

//     socketRef.current.onclose = () => console.log("[SockJS] connection closed");
//   };

//   // -----------------------------------
//   // 🔹 3. Peer connection handling
//   // -----------------------------------
//   const setupPeerConnection = async (id, isOfferer) => {
//     if (connections[id]) return;
//     console.log("[setupPeerConnection] creating peer for:", id, "offerer:", isOfferer);

//     const pc = new RTCPeerConnection(peerConfigConnections);
//     connections[id] = pc;

//     if (window.localStream) {
//       window.localStream.getTracks().forEach((track) => {
//         pc.addTrack(track, window.localStream);
//       });
//     }

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         console.log("[setupPeerConnection] sending ICE candidate to:", id);
//         socketRef.current.send(
//           JSON.stringify({
//             type: "signal",
//             toId: id,
//             data: JSON.stringify({ ice: event.candidate }),
//           })
//         );
//       }
//     };

//     pc.ontrack = (event) => {
//       console.log("[setupPeerConnection] ontrack from:", id);
//       setVideos((prev) => {
//         const exists = prev.find((v) => v.socketId === id);
//         if (exists) {
//           return prev.map((v) =>
//             v.socketId === id ? { ...v, stream: event.streams[0] } : v
//           );
//         }
//         return [...prev, { socketId: id, stream: event.streams[0] }];
//       });
//     };

//     if (isOfferer) {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       socketRef.current.send(
//         JSON.stringify({
//           type: "signal",
//           toId: id,
//           data: JSON.stringify({ sdp: pc.localDescription }),
//         })
//       );
//     }
//   };

//   const handleSignal = async (fromId, data) => {
//     console.log("[handleSignal] from:", fromId);
//     const parsed = typeof data === "string" ? JSON.parse(data) : data;
//     if (!connections[fromId]) setupPeerConnection(fromId, false);

//     const pc = connections[fromId];
//     if (parsed.sdp) {
//       await pc.setRemoteDescription(new RTCSessionDescription(parsed.sdp));
//       if (parsed.sdp.type === "offer") {
//         const answer = await pc.createAnswer();
//         await pc.setLocalDescription(answer);
//         socketRef.current.send(
//           JSON.stringify({
//             type: "signal",
//             toId: fromId,
//             data: JSON.stringify({ sdp: pc.localDescription }),
//           })
//         );
//       }
//     } else if (parsed.ice) {
//       await pc.addIceCandidate(new RTCIceCandidate(parsed.ice));
//     }
//   };

//   // -----------------------------------
//   // 🔹 4. Cleanup + UI + Chat
//   // -----------------------------------

//   const removeVideo = (id) => {
//     console.log("[removeVideo] removing:", id);
//     setVideos((prev) => prev.filter((v) => v.socketId !== id));
//     if (connections[id]) {
//       connections[id].close();
//       delete connections[id];
//     }
//   };

//   const addMessage = (data, sender) => {
//     console.log("[addMessage] raw:", data, "from:", sender);
//     setMessages((prev) => [...prev, { data, sender }]);
//     setNewMessages((prev) => prev + 1);
//   };

//   const sendMessage = () => {
//     if (!message.trim()) return;
//     socketRef.current.send(
//       JSON.stringify({
//         type: "chat-message",
//         data: message,
//         sender: username,
//       })
//     );
//     setMessage("");
//   };

//   const handleEndCall = () => {
//     console.log("[handleEndCall] stopping stream and redirecting...");
//     localVideoref.current?.srcObject?.getTracks().forEach((t) => t.stop());
//     window.location.href = "/";
//   };
  
//     let handleVideo = () => {
//         setVideo(!video);
//         // getUserMedia();
//     }
//     let handleAudio = () => {
//         setAudio(!audio)
//         // getUserMedia();
//     }
//     let handleScreen = () => {
//         setScreen(!screen);
//     }


//   // -----------------------------------
//   // 🔹 5. UI
//   // -----------------------------------

 
//     return (
//         <div>

//             {askForUsername === true ?

//                 <div>


//                     <h2>Enter into Lobby </h2>
//                     <TextField id="outlined-basic" label="Username" value={username} onChange={e => setUsername(e.target.value)} variant="outlined" />
//                     <Button variant="contained" onClick={connect}>Connect</Button>


//                     <div>
//                         <video ref={localVideoref} autoPlay muted></video>
//                     </div>

//                 </div> :


//                 <div className={styles.meetVideoContainer}>

//                     {showModal ? <div className={styles.chatRoom}>

//                         <div className={styles.chatContainer}>
//                             <h1>Chat</h1>

//                             <div className={styles.chattingDisplay}>

//                                 {messages.length !== 0 ? messages.map((item, index) => {

//                                     console.log(messages)
//                                     return (
//                                         <div style={{ marginBottom: "20px" }} key={index}>
//                                             <p style={{ fontWeight: "bold" }}>{item.sender}</p>
//                                             <p>{item.data}</p>
//                                         </div>
//                                     )
//                                 }) : <p>No Messages Yet</p>}


//                             </div>

//                             <div className={styles.chattingArea}>
//                                 <TextField value={message} onChange={(e) => setMessage(e.target.value)} id="outlined-basic" label="Enter Your chat" variant="outlined" />
//                                 <Button variant='contained' onClick={sendMessage}>Send</Button>
//                             </div>


//                         </div>
//                     </div> : <></>}


//                     <div className={styles.buttonContainers}>
//                         <IconButton onClick={handleVideo} style={{ color: "white" }}>
//                             {(video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
//                         </IconButton>
//                         <IconButton onClick={handleEndCall} style={{ color: "red" }}>
//                             <CallEndIcon  />
//                         </IconButton>
//                         <IconButton onClick={handleAudio} style={{ color: "white" }}>
//                             {audio === true ? <MicIcon /> : <MicOffIcon />}
//                         </IconButton>

//                         {screenAvailable === true ?
//                             <IconButton onClick={handleScreen} style={{ color: "white" }}>
//                                 {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
//                             </IconButton> : <></>}

//                         <Badge badgeContent={newMessages} max={999} color='orange'>
//                             <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
//                                 <ChatIcon />                        </IconButton>
//                         </Badge>

//                     </div>


//                     <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

//                     <div className={styles.conferenceView}>
//                         {videos.map((video) => (
//                             <div key={video.socketId}>
//                                 <video

//                                     data-socket={video.socketId}
//                                     ref={ref => {
//                                         if (ref && video.stream) {
//                                             ref.srcObject = video.stream;
//                                         }
//                                     }}
//                                     autoPlay
//                                 >
//                                 </video>
//                             </div>

//                         ))}

//                     </div>

//                 </div>

//             }

//         </div>
//     )
// }


























import SockJS from "sockjs-client";
import { over } from "stompjs";
import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';


const server_url = "https://vchat-rp52.onrender.com"; // your Spring Boot backend
let stompClient = null;

export default function VideoMeet() {
  const localVideoref = useRef();
  const videoRef = useRef({});
  const [username, setUsername] = useState("");
  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [screenShare, setScreenShare] = useState(false);

  const connections = useRef({}); // store RTCPeerConnections

  useEffect(() => {
    getPermissions();
  }, []);

  // ====== MEDIA PERMISSIONS ======
  const getPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      window.localStream = stream;
      localVideoref.current.srcObject = stream;
      setVideoAvailable(true);
      setAudioAvailable(true);
    } catch (err) {
      console.error("Media permission error:", err);
      setVideoAvailable(false);
      setAudioAvailable(false);
    }
  };

  // ====== CONNECT TO SPRING WEBSOCKET SERVER ======
  const connectToSocketServer = () => {
    const socket = new SockJS(`${server_url}/ws`);
    stompClient = over(socket);

    stompClient.connect({}, () => {
      console.log("Connected to STOMP server");
      setConnected(true);

      // Subscribe to chat topic
      stompClient.subscribe("/topic/chat", (message) => {
        const msg = JSON.parse(message.body);
        setMessages((prev) => [...prev, msg]);
      });

      // Subscribe to signaling (WebRTC)
      stompClient.subscribe(`/topic/signal/${username}`, (signal) => {
        const payload = JSON.parse(signal.body);
        gotMessageFromServer(payload.fromId, JSON.stringify(payload.data));
      });

      // Subscribe to user join notifications
      stompClient.subscribe("/topic/user-joined", (msg) => {
        const data = JSON.parse(msg.body);
        if (!users.includes(data.username)) {
          setUsers((prev) => [...prev, data.username]);
        }
      });

      // Notify backend to join room
      stompClient.send(
        "/app/join-call",
        {},
        JSON.stringify({ username: username, room: "default" })
      );
    });
  };

  // ====== HANDLE SIGNALS ======
  const gotMessageFromServer = (fromId, message) => {
    // your WebRTC signaling logic here
    console.log("Signal received:", fromId, message);
  };

  // ====== CHAT SEND ======
  const sendMessage = () => {
    if (stompClient && connected && newMessage.trim() !== "") {
      const msgObj = { sender: username, content: newMessage };
      stompClient.send("/app/send-chat", {}, JSON.stringify(msgObj));
      setMessages((prev) => [...prev, msgObj]);
      setNewMessage("");
    }
  };

  // ====== TOGGLE VIDEO ======
  const handleVideo = () => {
    const enabled = window.localStream.getVideoTracks()[0].enabled;
    window.localStream.getVideoTracks()[0].enabled = !enabled;
    setVideoAvailable(!enabled);
  };

  // ====== TOGGLE AUDIO ======
  const handleAudio = () => {
    const enabled = window.localStream.getAudioTracks()[0].enabled;
    window.localStream.getAudioTracks()[0].enabled = !enabled;
    setAudioAvailable(!enabled);
  };

  // ====== SCREEN SHARE ======
  const handleScreen = async () => {
    if (!screenShare) {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      window.localStream = displayStream;
      localVideoref.current.srcObject = displayStream;
    } else {
      getPermissions();
    }
    setScreenShare(!screenShare);
  };

  // ====== END CALL ======
  const handleEndCall = () => {
    window.localStream.getTracks().forEach((track) => track.stop());
    stompClient?.disconnect();
    setConnected(false);
  };

  // ====== UI RENDER ======
  return (
    <div className={styles.videoContainer}>
      {!connected ? (
        <div className={styles.loginBox}>
          <TextField
            variant="outlined"
            placeholder="Enter Username"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={connectToSocketServer}
            disabled={!username}
          >
            Join Call
          </Button>
        </div>
      ) : (
        <div className={styles.mainVideoPage}>
          <div className={styles.videosSection}>
            <video
              ref={localVideoref}
              autoPlay
              muted
              playsInline
              className={styles.localVideo}
            />
          </div>

          <div className={styles.controls}>
            <IconButton onClick={handleVideo}>
              {videoAvailable ? (
                <VideocamIcon style={{ color: "white" }} />
              ) : (
                <VideocamOffIcon style={{ color: "red" }} />
              )}
            </IconButton>

            <IconButton onClick={handleAudio}>
              <i
                className="fa fa-microphone"
                style={{ color: audioAvailable ? "white" : "red" }}
              />
            </IconButton>

            <IconButton onClick={handleScreen}>
              <ScreenShareIcon style={{ color: "white" }} />
            </IconButton>

            <IconButton onClick={handleEndCall}>
              <CallEndIcon style={{ color: "red" }} />
            </IconButton>

            <IconButton>
              <Badge badgeContent={messages.length} color="secondary">
                <ChatIcon style={{ color: "white" }} />
              </Badge>
            </IconButton>
          </div>

          <div className={styles.chatBox}>
            <div className={styles.chatMessages}>
              {messages.map((msg, i) => (
                <div key={i} className={styles.chatMessage}>
                  <b>{msg.sender}: </b>
                  {msg.content}
                </div>
              ))}
            </div>
            <div className={styles.chatInput}>
              <TextField
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                variant="outlined"
                size="small"
              />
              <Button variant="contained" onClick={sendMessage}>
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
